let jetpack = require('fs-jetpack');

const deployData = [
    {
        'section': 'ApexClass',
        'directory': 'classes'
    },
    {
        'section': 'AuraDefinitionBundle',
        'directory': 'aura'
    },
    {
        'section': 'LightningComponentBundle',
        'directory': 'lwc'
    },
    {
        'section': 'ApexComponent',
        'directory': 'components'
    },
    {
        'section': 'ApexTrigger',
        'directory': 'triggers'
    },
    {
        'section': 'ApexPage',
        'directory': 'pages'
    },
    {
        'section': 'StaticResource',
        'directory': 'staticresources'
    },
    {
        'section': 'Flow',
        'directory': 'flows'
    },
    {
        'section': 'FlexiPage',
        'directory': 'flexipages'
    },
    {
        'section': 'Layout',
        'directory': 'layouts'
    },
    {
        'section': 'CustomObject',
        'directory': 'objects'
    },
    {
        'section': 'CustomMetadata',
        'directory': 'customMetadata'
    },
    {
        'section': 'Workflow',
        'directory': 'workflows'
    },
    {
        'section': 'EmailTemplate',
        'directory': 'email'
    },
    {
        'section': 'QuickAction',
        'directory': 'quickActions'
    },
];

let sortFiles = function (gitDifData) {
    const files = gitDifData.files;
    return new Promise(function (fulfill, reject) {
        try {
            let sortedFiles = { count: 0 };
            deployData.forEach(element => {
                sortedFiles[element.section] = findMatchingFiles(files, element.section, element.directory);
                sortedFiles.count += sortedFiles[element.section].files.length;
                console.log(element.section, sortedFiles[element.section].files);
            });

            sortedFiles['Flow'] = {
                sectionName: 'Flow',
                files: files.filter(function (it) {
                    return it.file.endsWith('flow-meta.xml');
                })
            };
            sortedFiles.count += sortedFiles['Flow'].files.length;
            console.log('Flow', sortedFiles['Flow'].files);

            if (sortedFiles.AuraDefinitionBundle) {
                sortedFiles.AuraDefinitionBundle.files = sortLightning(sortedFiles.AuraDefinitionBundle.files);
                console.log('AuraDefinitionBundle', sortedFiles.AuraDefinitionBundle.files);
            }
            if (sortedFiles.LightningComponentBundle) {
                sortedFiles.LightningComponentBundle.files = sortLightning(sortedFiles.LightningComponentBundle.files);
                console.log('LightningComponentBundle', sortedFiles.LightningComponentBundle.files);
            }

            fulfill(sortedFiles);
        } catch (error) {
            reject(error);
        }
    });
};

const findMatchingFiles = function (files, sectionName, filePath) {
    let sectionData = { sectionName: sectionName };

    sectionData.files = files.filter(function (it) {
        return it.file.includes(filePath) && !it.file.endsWith('-meta.xml') && !it.file.includes('WorkOrder.object');
    });

    return sectionData;
};

const sortLightning = function (auraFiles) {
    let found = [];
    let removedDups = auraFiles.filter(function (it) {
        let file = it.file;
        let fileName = file.substring(file.indexOf('/') + 1, file.lastIndexOf('/'));
        if (!found.includes(fileName)) {
            found.push(fileName);
            it.file = '/' + fileName + '.cmp';
            return true;
        } else {
            return false;
        }
    });

    return removedDups;
};

const buildXML = function (changeData) {
    return new Promise(function (fulfill, reject) {
        try {
            let header = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

            let output = header;
            for (const key in changeData) {
                if (key != 'count' && changeData[key]) {
                    output += getSectionData(changeData[key]);
                }
            }

            output = output + '    <version>52.0</version>\n</Package>';
            console.log(output);
            fulfill(output);
        } catch (error) {
            reject(error);
        }
    });
};

const buildFullXML = function () {
    return new Promise(function (fulfill, reject) {
        try {
            let header = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

            let output = header;


            for (let index = 0; index < deployData.length; index++) {
                const element = deployData[index];

                let section = '    <types>\n';
                section += '        <members>*</members>\n';
                section += '        <name>' + element.section + '</name>\n';
                section += '    </types>\n';
                output += section;
            }

            output = output + '    <version>52.0</version>\n</Package>';
            fulfill(output);
        } catch (error) {
            reject(error);
        }
    });
};


const getSectionData = function (sectionData) {
    if (sectionData.files.length == 0) return '';
    let section = '    <types>\n';
    sectionData.files.forEach(element => {
        let fileName = element.file.substring(element.file.lastIndexOf('/') + 1, element.file.indexOf('.'));
        section += '        <members>' + fileName + '</members>\n';
    });
    section += '        <name>' + sectionData.sectionName + '</name>\n';
    section += '    </types>\n';
    return section;
};

const writePackageXML = function (packageData) {
    return new Promise(function (fulfill, reject) {
        jetpack.writeAsync('temp/package.xml', packageData).then(fulfill).catch(reject);
    });
};

const createPackage = async (gitDifData) => {
    const sortedFiles = await sortFiles(gitDifData);
    if (sortedFiles.count == 0) return 0;

    const xml = await buildXML(sortedFiles);
    await writePackageXML(xml);
    return sortedFiles.count;
};

const createFullPackage = async () => {
    const xml = await buildFullXML();
    await writePackageXML(xml);
    return 'ALL FILES';
};

module.exports = {
    createPackage,
    createFullPackage
};