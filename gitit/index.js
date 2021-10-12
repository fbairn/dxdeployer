
var differ = require('./differ');

module.exports = function (baseDir) {
    return new differ(baseDir);

};

