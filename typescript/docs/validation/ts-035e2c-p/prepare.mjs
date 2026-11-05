// Builds review artifacts ONLY; never writes production or historical paths.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const own='docs/validation/ts-035e2c-p';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(p,'utf8');
const save=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
const json=(p,v)=>save(p,JSON.stringify(v,null,2)+'\n');
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const proposals=[];
function proposal(path,source){
 const original=readFileSync(path),prefix=own+'/proposals/'+path;
 save(prefix+'.original',original);save(prefix+'.proposed',source);
 proposals.push({path,originalSha256:hash(original),proposedSha256:hash(source),original:prefix+'.original',proposed:prefix+'.proposed'});
}
let plan=read('tools/test262/script-plan.mjs').replaceAll('rift-script-blocked-v3','rift-script-blocked-v4');
plan+=`
// Read-only context assertion. This cannot create, load or mutate a selection.
export async function assertScriptSelectionCurrent(token) {
  if (arguments.length !== 1) fail('arguments');
  if (!selections.has(token)) fail('token');
  const selection = selections.get(token);
  const authority = await stage('authority', readScriptCapabilities);
  const projected = {registryVersion:authority.registryVersion,
    registrySha256:sha256(JSON.stringify(authority)+'\\n'),entries:authority.entries};
  if (!isDeepStrictEqual(selection.authority, projected)) fail('drift');
  const policy = await stage('closure', closure);
  if (!isDeepStrictEqual(selection.policy, policy)) fail('drift');
}
`;
proposal('tools/test262/script-plan.mjs',plan);
let ledger=read('tools/test262/script-ledger.mjs').replaceAll('rift-script-blocked-v3','rift-script-blocked-v4');
ledger=replace(ledger,"import { createHash }", "import { createHash, randomUUID }");
ledger=replace(ledger,'import { inspectScriptSelection }','import { inspectScriptSelection, assertScriptSelectionCurrent }');
ledger="import {mkdir,lstat,realpath,open,link,unlink,readFile} from 'node:fs/promises';\nimport {resolve,parse,relative,sep,dirname,isAbsolute} from 'node:path';\n"+ledger;
ledger=replace(ledger,"  if (!ledgers.has(token)) fail('token');","  if (!ledgers.has(token)) fail('token');\n  owner(token);");
ledger=replace(ledger,'  ledgers.set(token, value);','  ledgers.set(token, value);\n  ownership.set(token, {selectionToken, revoked:false, store:null});');
ledger=replace(ledger,'  const {value} = get(token), {selection, attempts} = value;','  return reportValue(get(token).value);\n}\nfunction reportValue(value) {\n  const {selection, attempts} = value;');
ledger+='\n'+read(own+'/checkpoint-extension.txt');
proposal('tools/test262/script-ledger.mjs',ledger);
let test=read('tools/test262/script-plan.test.mjs');
test=replace(test,'c61ae04ef432aba0e5ab548cadb4fff3ed9848b771870da74f77f94791da52b8',hash(plan));
test=test.replaceAll('rift-script-blocked-v3','rift-script-blocked-v4');
test=replace(test,"['inspectScriptSelection','prepareScriptSelection']","['assertScriptSelectionCurrent','inspectScriptSelection','prepareScriptSelection']");
proposal('tools/test262/script-plan.test.mjs',test);
// E2a copier already includes the co-located ledger; no change is required.
const migration=`
// Guarded expectation migration, independent of observed selection/report.
function migrate(value) {
  if (value && typeof value==='object') {
    if (value.selectionVersion===2 && value.kind==='script-blocked-selection') {
      const p=value.policy;
      assert.equal(p.id,'rift-script-blocked-v3'); assert.equal(p.files.length,242);
      assert.equal(p.closureSha256,'ec402a67cacb11ab30a8c004b8b85787ca013648c57025dd36ab2a46061aded2');
      assert.equal(p.closureSha256,createHash('sha256').update(JSON.stringify(p.files)).digest('hex'));
      assert.equal(p.files.find(f=>f.path==='tools/test262/script-plan.mjs').sha256,'c61ae04ef432aba0e5ab548cadb4fff3ed9848b771870da74f77f94791da52b8');
      assert.equal(p.files.find(f=>f.path==='tools/test262/script-ledger.mjs').sha256,'0921bc26ea39f6cb6c4583387553480a996ac4fd2f78a2f303c0a7a7c89e65dd');
      const edits={'tools/test262/script-plan.mjs':${JSON.stringify(hash(plan))},'tools/test262/script-ledger.mjs':${JSON.stringify(hash(ledger))}};
      for(const [path,sha256] of Object.entries(edits)) {
        assert.equal(p.files.filter(f=>f.path===path).length,1);
        p.files.find(f=>f.path===path).sha256=sha256;
      }
      p.id='rift-script-blocked-v4';
      p.closureSha256=createHash('sha256').update(JSON.stringify(p.files)).digest('hex');
      return value;
    }
    for(const child of Object.values(value)) migrate(child);
  }
  return value;
}
`;
let support=read('docs/validation/ts-035e2b/support.mjs');
support="import {createHash} from 'node:crypto';\n"+support;
support=replace(support,"JSON.parse(readFileSync(resolve('docs/validation/ts-035e2b-p',name)))","migrate(JSON.parse(readFileSync(resolve('docs/validation/ts-035e2b-p',name))))");
support=replace(support,"import {control as c} from './control.mjs';","export {assertScriptSelectionCurrent} from \${JSON.stringify(pathToFileURL(resolve('tools/test262/script-plan.mjs')).href)};\nimport {control as c} from './control.mjs';");
support+=migration;
proposal('docs/validation/ts-035e2b/support.mjs',support);
let ledgerTest=read('tools/test262/script-ledger.test.mjs');
ledgerTest=replace(ledgerTest,"['appendScriptPolicy','inspectScriptLedger','newScriptLedger','reportScriptLedger']","['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']");
proposal('tools/test262/script-ledger.test.mjs',ledgerTest);
proposal('docs/validation/ts-035e2b/extended.mjs',read('docs/validation/ts-035e2b/extended.mjs').replaceAll('rift-script-blocked-v3','rift-script-blocked-v4'));
json(own+'/proposal-manifest.json',proposals);
const paths=execFileSync('git',['-C','..','ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(p=>'../'+p);
json(own+'/baseline.json',paths.filter(p=>!['../typescript/TASKS.md','../typescript/COORDINATION.md'].includes(p)&&!p.startsWith('../typescript/'+own+'/')&&p!=='../typescript/docs/script-ledger-checkpoint.md').map(path=>({path,sha256:hash(readFileSync(path))})));
console.log(JSON.stringify({proposals:proposals.length,baseline:paths.length}));
