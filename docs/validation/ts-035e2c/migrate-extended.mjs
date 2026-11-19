import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Coordinator and independent second review approved these exact bytes.
export function migrateExtended(replay) {
 const own=resolve('docs/validation/ts-035e2c');
 assert(resolve(replay).startsWith(own+sep+'validation-'));
 const path=join(replay,'docs/validation/ts-035e2b/extended.mjs');
 const original=readFileSync(path,'utf8');
 const proposed=readFileSync(join(own,'extended-migration.mjs.proposed'),'utf8');
 assert.equal(hash(original),'5e96fd3d212c9cb67aa53887be79120aa432b462fbe473d2468c2299145a8682');
 assert.equal(hash(proposed),'94434105b4a293214c8a145571c16ffc13fbf912990bbb4a56716bbb5cd4ee6e');
 const oldExports="assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','inspectScriptLedger','newScriptLedger','reportScriptLedger']);";
 const newExports="assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']);";
 const oldSync="assert(!source.includes('node:fs'));assert(!source.includes('await '));";
 const start="const start='const ledgers = new WeakMap();'",end='assert.equal(controls.length,338);';
 for(const needle of [oldExports,oldSync])assert.equal(original.split(needle).length,2);
 for(const needle of [newExports,start,end])assert.equal(proposed.split(needle).length,2);
 const sync=proposed.slice(proposed.indexOf(start),proposed.indexOf(end)+end.length);
 assert.equal(original.replace(oldExports,newExports).replace(oldSync,sync),proposed);
 writeFileSync(path,proposed);
 return {path,originalSha256:hash(original),proposedSha256:hash(proposed),exactApprovedMigration:true};
}
