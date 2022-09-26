let jetpack = require('fs-jetpack');

let filterMetaFiles = async (gitDifData) => {
    const files = gitDifData.files;
    const metas = files.filter(function (it) {
        return it.file.includes('force-app');
    });

    metas.forEach(meta => {
        if (meta.file.includes('/lwc/') || meta.file.includes('/aura/')) {
            //Lightning
            const oldDir = meta.file.substr(0, meta.file.lastIndexOf('/'));

            jetpack.copy(oldDir.replace('force-app', 'temp/force-holder'), oldDir.replace('force-app', 'temp/force-app'), { overwrite: true });
        } else {
            jetpack.copy(meta.file.replace('force-app', 'temp/force-holder'), meta.file.replace('force-app', 'temp/force-app'), { overwrite: true });
            if ((meta.file.endsWith('.cls') || meta.file.endsWith('.trigger')) && meta.file.endsWith('-meta.xml') == false) {
                jetpack.copy(meta.file.replace('force-app', 'temp/force-holder') + '-meta.xml', meta.file.replace('force-app', 'temp/force-app') + '-meta.xml', { overwrite: true });
            }
        }
    });
    return metas;
};

module.exports = {
    filterMetaFiles
};