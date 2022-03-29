console.log('Deploy Version 20220214-emerald-c');
const fs = require('fs');
const { readPackage } = require('./src/packger');

const dx = require('./src/dx'),
    argv = require('minimist')(process.argv.slice(2)),
    jetpack = require('fs-jetpack');

if (argv.h || argv.help) {
    console.log('DX CI Help');
    console.log('-t, --target\t\tTarget branch for deployment');
    console.log('-d, --deploydir\t\tDirectory of the DX project');
    console.log('-u, --username\t\tUsername or alias for the target org.');
    console.log('-c, --check\t\tCheck validation without deploying');
    console.log('-p, --package\t\tDeployment metadata based off included Package.xml');
    console.log('-l, --testlevel\t\tDeployment testing level');
    console.log('-v, --validated\t\tDeploy previously validated metadata');
    console.log('\t\t\t(NoTestRun,RunSpecifiedTests,RunLocalTests,RunAllTestsInOrg,Manifest)');
    console.log('\t\t\tManifest will run any Apex classes that have Test in the name');

    console.log('-r, --runtests\t\tTests to run, comma seperated');
    console.log('');
    process.exit();
}

var errorMesg = '';
const PATH = argv.d || argv.deploydir || './';
const TARGET = argv.t || argv.target;
const ORG_USERNAME = argv.u || argv.username;
let tests = argv.r || argv.runtests;
let testLevel = argv.l || argv.testlevel;
const CHECK = argv.c || argv.check || false;
const VALIDATED = argv.v || argv.validated || false;
const BYPASS = argv.bypass || false;
const PACKAGE_DEPLOY = argv.p || argv.package || false;

if (!ORG_USERNAME) {
    errorMesg += '-u, --user\tUser is required when doing a deployment.';
}

if (!PACKAGE_DEPLOY && !TARGET) {
    errorMesg += '-t, --Target\tTarget branch is required when doing a deployment.';
}

if (errorMesg != '') {
    console.error(errorMesg);
    console.error('For help use --help');
    process.exit(1);
}

const gitter = require('./src/gitit')(PATH);

var buildDeploy = async () => {

    jetpack.remove('temp/');

    jetpack.copy(PATH + '/.forceignore', 'temp/.forceignore', {
        overwrite: true
    });
    jetpack.copy(PATH + '/sfdx-project.json', 'temp/sfdx-project.json', {
        overwrite: true
    });
    jetpack.copy(PATH + '/sfdx-project.json', 'temp/sfdx-project.json', {
        overwrite: true
    });

    if (PACKAGE_DEPLOY) {
        jetpack.copy(PATH + '/force-app', 'temp/force-app', {
            overwrite: true
        });

        jetpack.copy(PATH + '/manifest/package.xml', 'temp/package.xml', {
            overwrite: true
        });
        return 'PACKAGE';
    } else {
        jetpack.copy(PATH + '/force-app', 'temp/force-holder', {
            overwrite: true
        });

        let target = TARGET;
        if (target.includes('origin/') == false) {
            const tagList = await gitter.getTags({ match: TARGET });
            if (tagList.all.length == 0) {
                throw 'The tag ' + TARGET + ' was not found.';
            }
            target = tagList.latest;
        }

        const fileCount = await gitter.createPackageFromLocal(target, 'HEAD');
        console.log('File Count:', fileCount);
        return fileCount;
    }
};

// var tagDeployment = async function () {
//     var tagTimeStamp = formatDate(new Date());
//     gitter.setTags(TARGET + '-' + tagTimeStamp);
// };

// function formatDate(date) {
//     let hours = date.getHours();
//     let minutes = date.getMinutes();
//     let month = date.getMonth() + 1;
//     let day = date.getDate();
//     const year = date.getFullYear() - 2000;

//     // hours = hours % 12;
//     hours = hours < 10 ? '0' + hours : hours;
//     minutes = minutes < 10 ? '0' + minutes : minutes;
//     day = day < 10 ? '0' + day : day;
//     month = month < 10 ? '0' + month : month;
//     const strTime = hours + '' + minutes;
//     console.log(`${year}${month}${day}-${strTime}`);
//     return `${year}${month}${day}-${strTime}`;
// }

const rundeploy = async () => {
    try {
        const fileCount = await buildDeploy();
        if (fileCount == 0) {
            console.error('No files changed.');
            process.exit(0);
        }
        if (VALIDATED) {
            await dx.deployValidated({ orgUsername: ORG_USERNAME });
        } else if (BYPASS) {
            fs.writeFileSync('temp/deploydata.json', '{ "bypass": true }');
        } else {
            if (testLevel == 'Manifest') {
                console.log('Tests in Manifest');
                testLevel = 'RunSpecifiedTests';
                const packdata = await readPackage();
                const classes = packdata.Package.types.find(t => t.name.includes('ApexClass'));
                if (!classes || !classes.members || classes.members.length == 0) {
                    console.log('No Apex Classes Found');
                    if (process.env.DEFAULT_TEST) {
                        console.log('A: Using Default Test', process.env.DEFAULT_TEST);
                        tests = process.env.DEFAULT_TEST;
                    } else {
                        console.log('A: Falling back to no test run');
                        testLevel = 'NoTestRun';
                        tests = '';
                    }
                } else {
                    const testClasses = classes.members.filter(t => t.toLowerCase().includes('test'));
                    if (testClasses.length > 0) {
                        tests = testClasses.join(',');
                        console.log('Tests found', tests);
                    } else if (process.env.DEFAULT_TEST) {
                        console.log('A: Using Default Test', process.env.DEFAULT_TEST);
                        tests = process.env.DEFAULT_TEST;
                    } else {
                        console.log('B: Falling back to no test run');
                        testLevel = 'NoTestRun';
                        tests = '';
                    }
                }
            } else {
                console.log('No Test Level Specified');
            }
            await dx.deployMetadata({ orgUsername: ORG_USERNAME, testLevel, tests, check: CHECK });
        }
        // if (fileCount && TARGET) await tagDeployment();
    } catch (error) {
        console.error('Error deploying', error);
        process.exit(1);
    }
    console.log('Exiting ');
    process.exit(0);
};
rundeploy();

function wait() {
    setTimeout(wait, 1000);
}

wait();