const dx = require('./dx'),
    argv = require('minimist')(process.argv.slice(2)),
    jetpack = require('fs-jetpack');

var differ, difFunction;

if (argv.h || argv.help) {
    console.log('DX CI Help');
    console.log('-t, --tag\t\tTag for partial deployment & complete. IE: qa');
    console.log('-d, --deploydir\t\tDirectory of the DX project');
    console.log('-u, --username\t\tUsername or alias for the target org.');
    console.log('-c, --check\t\tCheck validation without deploying');
    console.log('-f, --full\t\tFull deployment of metadata');
    console.log('-l, --testlevel\t\tDeployment testing level');
    console.log('\t\t\t(NoTestRun,RunSpecifiedTests,RunLocalTests,RunAllTestsInOrg)');

    console.log('-r, --runtests\t\tTests to run, comma seperated');
    console.log('');
    // console.log('Example: node ci.js -d ./repo -u qasandbox -r test1,test2');
    // console.log('Example complete deployment and tag: node ci.js -c -t qa');
    process.exit();
}

var errorMesg = '';
const path = argv.d || argv.deploydir || './';
const tag = argv.t || argv.tag;
const orgUsername = argv.u || argv.username;
const tests = argv.r || argv.runtests;
const testLevel = argv.l || argv.testlevel;
const check = argv.c || argv.check || false;
const fullDeploy = argv.f || argv.full || false;


try {
    differ = require('./gitit')(path);
} catch (error) {
    errorMesg = error.message;
}

if (!fullDeploy && !tag) {
    errorMesg += '-t, --tag\t\tTag is required when doing a partial deployment.';
}

if (!orgUsername) {
    errorMesg += '-u, --user\t\User is required when doing a deployment.';
}

if (errorMesg != '') {
    console.error(errorMesg);
    console.error('For help use --help');
    process.exit(1);
}

if (fullDeploy) {
    difFunction = differ.createFullPackageFromLocal
} else if (argv.remote) {
    difFunction = differ.createPackageFromRemote
} else {
    difFunction = differ.createPackageFromLocal
}

var buildDeploy = async () => {

    jetpack.remove('temp/');
    jetpack.copy(path + '/force-app', 'temp/force-app', {
        overwrite: true
    })
    jetpack.copy(path + '/.forceignore', 'temp/.forceignore', {
        overwrite: true
    })
    jetpack.copy(path + '/sfdx-project.json', 'temp/sfdx-project.json', {
        overwrite: true
    })

    const tagList = await differ.getTags({ match: tag });
    if (tagList.all.length == 0 && !fullDeploy) {
        throw 'The tag ' + tag + ' was not found.';
    }
    const fileCount = await difFunction(tagList.latest, 'HEAD');
    console.log('File Count:', fileCount);
    return fileCount;
}

var completeDeployment = async function () {
    var tagTimeStamp = formatDate(new Date());
    differ.setTags(tag + '-' + tagTimeStamp);
}

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var year = date.getFullYear() - 2000;

    hours = hours % 12;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    day = day < 10 ? '0' + day : day;
    month = month < 10 ? '0' + month : month;
    var strTime = hours + '' + minutes;
    return year + month + day + strTime;
}

console.log('Deploy');
const rundeploy = async () => {
    try {
        const fileCount = await buildDeploy();
        if (fileCount == 0) {
            console.info('No files to deploy');
            jetpack.remove('temp/');
            process.exit(0);
        }

        await dx.deployMetadata({ orgUsername, testLevel, tests, check });
    } catch (error) {
        console.error('Error deploying', error);
        process.exit(1);
    }
    // await completeDeployment();
    jetpack.remove('temp/');
    console.log('Exiting ');
    process.exit(0);
}
rundeploy();

function wait() {
    setTimeout(wait, 1000);
}

wait();