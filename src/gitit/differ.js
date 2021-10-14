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

        differ = this;
    }

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

    Differ.prototype.setTags = function (tag) {
        return new Promise(function (fulfill, reject) {
            differ.simpleGit.addAnnotatedTag(tag, '', (err, d) => {
                if (err) return reject(err);
                return fulfill(d);
            });
        });
    };

    module.exports = Differ;
}());