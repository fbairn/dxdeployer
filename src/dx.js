const fs = require('fs');
const exec = require('child_process');

const deployMetadata = function ({
    orgUsername,
    testLevel,
    tests,
    check
}) {
    return new Promise(function (resolve, reject) {
        let testString = '';
        if (tests) {
            testString = ' -r ';
            if (tests.isArray) {
                testString += tests.join();
            } else {
                testString += tests;
            }
        }
        const level = testLevel ? ' -l ' + testLevel : '';
        const checkString = check ? ' -c ' : '';

        const deployCommand = 'cd ./temp && sfdx force:source:deploy -x ./package.xml -u ' + orgUsername + ' -w 0 --json ' + level + testString + checkString;
        console.log(deployCommand);

        //sfdx force:mdapi:deploy:report

        exec.exec(deployCommand, function (err, data) {
            console.log('Deploy request', data);
            const execData = JSON.parse(data);
            if (err) {
                console.error(err);
                return reject(execData.name);
            }
            if (execData.status == 0) {
                fs.writeFileSync('./depolydata.json', JSON.stringify(execData, null, 2));
                //success
                setTimeout(() => checkData(orgUsername, execData.result.id, resolve, reject), 30000);
            } else {
                //Error
                console.error('Failure ', err);
                return reject(err);
            }
            // console.info('Deployment Complete');
            // return resolve();

        });
    });
};

const deployValidated = function ({
    orgUsername
}) {
    return new Promise(function (resolve, reject) {
        const jsonD = fs.readFileSync('./depolydata.json', 'utf8');
        console.log(jsonD);
        const prevDeployment = JSON.parse(jsonD);
        console.log(prevDeployment);
        const deployCommand = `cd ./temp && sfdx force:source:deploy -q ${prevDeployment.result.id} --json -u ${orgUsername}`;
        console.log(deployCommand);

        exec.exec(deployCommand, function (err, data) {
            console.log('Deploy validated', data);
            const execData = JSON.parse(data);
            const { status, result } = JSON.parse(data);
            if (err) {
                console.error(err);
                return reject(execData.name & ' ' + execData.message);
            }
            if (status == 0) {
                //success
                if (result.done) {
                    console.info('Deployment Result: ' + result.status);
                    if (result.status != 'Succeeded') {
                        return reject(result.status);
                    }
                    return resolve();
                } else {
                    setTimeout(() => checkData(orgUsername, execData.result.id, resolve, reject), 30000);
                }
            } else {
                //Error
                console.error('Failure ', err);
                return reject(err);
            }
            // console.info('Deployment Complete');
            // return resolve();

        });
    });
};

const checkData = (orgUsername, id, resolve, reject) => {
    const checkCommand = 'sfdx force:mdapi:deploy:report -u ' + orgUsername + ' -i ' + id + ' --json ';
    exec.exec(checkCommand, function (err, data) {
        if (err && !data) {
            console.error('Major Failure', JSON.stringify(err));
            return reject(err);
        }
        const { status, result, message } = JSON.parse(data);
        if (status == 0) {
            if (result.done) {
                console.info('Deployment Result: ' + result.status);
                if (result.status != 'Succeeded') {
                    return reject(result.status);
                }
                return resolve();
            } else {
                console.info(`Deployment ${result.status}\tTests Completed: ${result.numberTestsCompleted}\tTest Errors: ${result.numberTestErrors}\tTotal Tests: ${result.numberTestsTotal}`);
                setTimeout(() => checkData(orgUsername, result.id, resolve, reject), 10000);
            }
        } else {
            //Error
            console.log(result);
            if (result && result.details) {
                if (result.details.componentFailures) {
                    result.details.componentFailures.forEach(element => {
                        console.error(element);
                    });
                }
                if (result.details.runTestResult && result.details.runTestResult.failures) {
                    result.details.runTestResult.failures.forEach(element => {
                        console.error(element);
                    });
                }
            }
            console.error(`Failure\t${message}`);
            return reject(`Failure\t${message}`);
        }
    });
};

module.exports = {
    deployMetadata,
    deployValidated,
    checkData
};