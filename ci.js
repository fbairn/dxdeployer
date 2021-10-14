const { readPackage } = require('./src/packger');

const dx = require('./src/dx'),
    argv = require('minimist')(process.argv.slice(2)),
    jetpack = require('fs-jetpack');

if (argv.h || argv.help) {
    console.log('DX CI Help');
    console.log('-t, --tag\t\tTag for partial deployment & complete. IE: qa');
    console.log('-d, --deploydir\t\tDirectory of the DX project');
    console.log('-u, --username\t\tUsername or alias for the target org.');
    console.log('-c, --check\t\tCheck validation without deploying');
    console.log('-f, --full\t\tFull deployment of metadata');
    console.log('-l, --testlevel\t\tDeployment testing level');
    console.log('-v, --validated\t\tDeploy previously validated metadata');
    console.log('\t\t\t(NoTestRun,RunSpecifiedTests,RunLocalTests,RunAllTestsInOrg,Manifest)');
    console.log('\t\t\tManifest will run any Apex classes that have Test in the name');

    console.log('-r, --runtests\t\tTests to run, comma seperated');
    console.log('');
    process.exit();
}

var errorMesg = '';
const path = argv.d || argv.deploydir || './';
const tag = argv.t || argv.tag;
const orgUsername = argv.u || argv.username;
let tests = argv.r || argv.runtests;
let testLevel = argv.l || argv.testlevel;
const check = argv.c || argv.check || false;
const validated = argv.v || argv.validated || false;

const gitter = require('./src/gitit')(path);

if (!orgUsername) {
    errorMesg += '-u, --user\tUser is required when doing a deployment.';
}

if (errorMesg != '') {
    console.error(errorMesg);
    console.error('For help use --help');
    process.exit(1);
}

var buildDeploy = () => {

    jetpack.remove('temp/');
    jetpack.copy(path + '/force-app', 'temp/force-app', {
        overwrite: true
    });
    jetpack.copy(path + '/.forceignore', 'temp/.forceignore', {
        overwrite: true
    });
    jetpack.copy(path + '/sfdx-project.json', 'temp/sfdx-project.json', {
        overwrite: true
    });
    jetpack.copy(path + '/sfdx-project.json', 'temp/sfdx-project.json', {
        overwrite: true
    });
    jetpack.copy(path + '/manifest/package.xml', 'temp/package.xml', {
        overwrite: true
    });
};

var completeDeployment = async function () {
    var tagTimeStamp = formatDate(new Date());
    gitter.setTags(tag + '-' + tagTimeStamp);
};

function formatDate(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    const year = date.getFullYear() - 2000;

    // hours = hours % 12;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    day = day < 10 ? '0' + day : day;
    month = month < 10 ? '0' + month : month;
    const strTime = hours + '' + minutes;
    console.log(`${year}${month}${day}-${strTime}`);
    return `${year}${month}${day}-${strTime}`;
}

console.log('Deploy');
const rundeploy = async () => {
    try {
        buildDeploy();
        if (validated) {
            await dx.deployValidated({ orgUsername });
        } else {

            if (testLevel == 'Manifest') {
                testLevel = 'RunSpecifiedTests';
                const packdata = await readPackage();
                const classes = packdata.Package.types.find(t => t.name.includes('ApexClass'));
                const testClasses = classes.members.filter(t => t.toLowerCase().includes('test'));
                if (testClasses.length > 0) {
                    tests = testClasses.join(',');
                } else {
                    testLevel = 'NoTestRun';
                    tests = '';
                }
            }
            await dx.deployMetadata({ orgUsername, testLevel, tests, check });
        }
        console.log(tag);
        if (tag) await completeDeployment();
    } catch (error) {
        jetpack.remove('temp/');
        console.error('Error deploying', error);
        process.exit(1);
    }
    jetpack.remove('temp/');
    console.log('Exiting ');
    process.exit(0);
};
rundeploy();

function wait() {
    setTimeout(wait, 1000);
}

wait();