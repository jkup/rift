import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as api from '../../../tools/test262/script-ledger.mjs';
const source=readFileSync('tools/test262/script-ledger.mjs','utf8'),extended=readFileSync('docs/validation/ts-035e2b/extended.mjs','utf8');
const result={ledgerSha256:createHash('sha256').update(source).digest('hex'),extendedSha256:createHash('sha256').update(extended).digest('hex'),failures:[]};
for(const [id,fn] of [['exports',()=>assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','inspectScriptLedger','newScriptLedger','reportScriptLedger'])],['whole-file-sync',()=>{assert(!source.includes('node:fs'));assert(!source.includes('await '));}]]){try{fn();}catch(e){result.failures.push({id,message:e.message});}}
assert.equal(result.failures.length,2);writeFileSync('docs/validation/ts-035e2c/migration-ambiguity.json',JSON.stringify(result,null,2)+'\n');console.log(result);
