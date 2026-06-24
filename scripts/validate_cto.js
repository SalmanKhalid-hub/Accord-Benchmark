// validate_cto.js — validate one Concerto .cto file with the official ModelManager.
// Usage: node validate_cto.js <path-to-cto>
// Prints "VALID" or "INVALID: <message>"; exit 0 if valid, 1 if not.
const fs = require('fs');
const { ModelManager } = require('@accordproject/concerto-core');

const cto = fs.readFileSync(process.argv[2], 'utf8');
try {
    const mm = new ModelManager();
    mm.addCTOModel(cto, undefined, true);
    mm.validateModelFiles();
    console.log('VALID');
    process.exit(0);
} catch (e) {
    console.log('INVALID: ' + e.message.split('\n')[0]);
    process.exit(1);
}
