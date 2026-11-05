const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
let s=fs.readFileSync('docs/validation/ts-035e2b/extended.mjs','utf8');const hash=b=>crypto.createHash('sha256').update(b).digest('hex');a.equal(hash(s),'5e96fd3d212c9cb67aa53887be79120aa432b462fbe473d2468c2299145a8682');
function replace(x,y){a.equal(s.split(x).length,2);s=s.replace(x,y);}
replace("assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','inspectScriptLedger','newScriptLedger','reportScriptLedger']);","assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']);");
replace("assert(!source.includes('node:fs'));assert(!source.includes('await '));",`const start='const ledgers = new WeakMap();',end='const stores = new WeakMap(), checkpoints = new WeakMap(), ownership = new WeakMap();';
assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
assert(source.indexOf(start)<source.indexOf(end));
const synchronous=source.slice(source.indexOf(start),source.indexOf(end));
assert(!synchronous.includes('node:fs'));assert(!synchronous.includes('await '));
assert(!/\\b(?:mkdir|lstat|realpath|open|link|unlink|readFile)\\s*\\(/.test(synchronous));
assert.equal(controls.length,338);`);
fs.writeFileSync('docs/validation/ts-035e2c/extended-migration.mjs.proposed',s);fs.writeFileSync('docs/validation/ts-035e2c/extended-migration.json',JSON.stringify({status:'proposal-only-awaiting-review',originalSha256:'5e96fd3d212c9cb67aa53887be79120aa432b462fbe473d2468c2299145a8682',proposedSha256:hash(s),scope:'Only new isolated replay copy; real six-file replacements remain exact',changes:['eight exact export names','same synchronous ledger code: no await or filesystem calls','explicit 338 controls count']},null,2)+'\n');
