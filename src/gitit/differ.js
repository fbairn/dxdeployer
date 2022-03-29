const { filterMetaFiles } = require('./copier');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

(function () {
    let differ;

    function Differ(baseDir) {
        this._baseDir = '';
        this.jetpack = require('fs-jetpack');
        if (baseDir && !this.jetpack.exists(baseDir)) {
            throw new Error('The path ' + baseDir + ' does not exist.');
        }

        if (!baseDir.endsWith('/')) baseDir += '/';
        this._baseDir = baseDir;

        this.simpleGit = require('simple-git')(baseDir);

        differ = this;
    }

    Differ.prototype.createPackageFromLocal = async (fromBranch, toBranch) => {
        const gdiff = await getDiff(fromBranch, toBranch);
        console.log('gdiff', gdiff);
        if (gdiff.files.length === 0) return 0;

        const metas = await filterMetaFiles(gdiff);
        if (metas.length === 0) return 0;

        console.log('A', await exec('ls'));
        console.log('B', await exec('cd ./temp && ls'));
        await exec('cd ./temp && sfdx force:source:manifest:create --sourcepath ./force-app --manifestname ./package');
        return gdiff.files.length;
    };


    Differ.prototype.getTags = function (options) {
        var opts = {};
        if (options && options.head === true) {
            opts = { '--points-at': 'HEAD' };
        }
        return new Promise(function (fulfill, reject) {
            differ.simpleGit.tags(opts, (err, tags) => {
                if (err) return reject(err);
                if (options && options.match) {
                    var filteredArray = tags.all.filter(function (tag) {
                        return tag.startsWith(options.match);
                    });
                    tags = { all: filteredArray };
                }
                tags.all.sort();
                if (tags.all.length > 0) tags.latest = tags.all[tags.all.length - 1];
                fulfill(tags);
            });
        });
    };

    // Differ.prototype.setTags = function (tag) {
    //     return new Promise(function (fulfill, reject) {
    //         differ.simpleGit.addAnnotatedTag(tag, '', (err, d) => {
    //             if (err) return reject(err);
    //             return fulfill(d);
    //         });
    //     });
    // };

    var getDiff = function (fromBranch, toBranch) {
        return new Promise(function (fulfill, reject) {
            differ.simpleGit.diffSummary([fromBranch, toBranch, '--diff-filter=AM'], function (err, roger) {
                if (err) {
                    reject(err);
                } else {
                    fulfill(roger);
                }
            });
        });
    };

    module.exports = Differ;
}());