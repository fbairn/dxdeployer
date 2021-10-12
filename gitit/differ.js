(function () {
    var differ;

    function Differ(baseDir) {
        this._baseDir = '';
        this.jetpack = require('fs-jetpack');
        if (baseDir && !this.jetpack.exists(baseDir)) {
            throw new Error('The path ' + baseDir + ' does not exist.');
        }

        if (!baseDir.endsWith('/')) baseDir += '/';
        this._baseDir = baseDir;

        this.simpleGit = require('simple-git')(baseDir);
        this.packageBuilder = require('./packageBuilder');

        differ = this;
    }


    Differ.prototype.createPackageFromLocal = async (fromBranch, toBranch) => {
        const gdiff = await getDiff(fromBranch, toBranch);
        const pack = await differ.packageBuilder.createPackage(gdiff);
        return pack;
    }

    Differ.prototype.createFullPackageFromLocal = async (h) => {
        const pack = await differ.packageBuilder.createFullPackage();
        return pack;
    }

    Differ.prototype.createPackageFromRemote = function (fromBranch, toBranch) {
        return new Promise(function (fulfill, reject) {
            pullFromBranch(fromBranch, toBranch)
                .then(getDiff)
                .then(differ.packageBuilder.createPackage)
                .then(fulfill)
                .catch(reject)
        });
    }

    Differ.prototype.getTags = function (options) {
        var opts = {};
        if (options && options.head === true) {
            opts = { '--points-at': 'HEAD' };
        }
        //options.push('qa-*');
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
                fulfill(tags)
            });
        });
    };

    Differ.prototype.setTags = function (tag) {
        return new Promise(function (fulfill, reject) {
            differ.simpleGit.addAnnotatedTag(tag, '', (err, d) => {
                if (err) return reject(err);
                return fulfill(d);
            })
        })
    };

    var getDiff = function (fromBranch, toBranch) {
        return new Promise(function (fulfill, reject) {
            //git diff qa-1702271010 head --name-only --diff-filter=AM
            differ.simpleGit.diffSummary([fromBranch, toBranch, '--diff-filter=AM'], function (err, roger) {
                if (err) {
                    reject(err);
                } else {
                    fulfill(roger);
                }
            });
        });
    };


    var pullFromBranch = function (fromBranch, toBranch) {
        return new Promise(function (fulfill, reject) {
            differ.simpleGit.fetch()
                .checkout(toBranch)
                .checkout(fromBranch)
                .pull(function (err, data) {
                    if (err) {
                        reject(err)
                    } else {
                        fulfill(fromBranch, toBranch, data);
                    }
                });
        });
    }

    module.exports = Differ;
}());