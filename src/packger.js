const xml2js = require('xml2js');
const fs = require('fs');

async function readPackage() {
    // XML string to be parsed to JSON
    const xml = fs.readFileSync('./temp/package.xml');

    return xml2js.parseStringPromise(xml, { mergeAttrs: true });
}

module.exports = {
    readPackage,
};