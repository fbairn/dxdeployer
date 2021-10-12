const differ = require('./dx');
const difFunction = differ.createFullPackageFromLocal
const tag = 'tag';
const rundeploy = async () => {
    // sfdx force:mdapi:deploy:report -u STAGE -i 0Af8H00000054rnSAA --json 
    differ.checkData('Staging', '0Af8H00000054rnSAA', () => console.log('All Good'), console.error)
}

try {

    rundeploy();
} catch (error) {
    process.exit(1);
}