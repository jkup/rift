import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,j=n=>JSON.parse(fs.readFileSync(join(here,n))),hash=b=>createHash('sha256').update(b).digest('hex');
const literals=j('staged-literals.json'),contract=j('diagnostic-contract.json');
for(const r of [...j('read-identities.json'),literals.source,contract.executable,...contract.inputs]){const b=fs.readFileSync(r.path);assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
assert.equal(literals.source.sha256,'f470e19ec3813a4bc283d6941de1f7de717bd0cd9dfcb8efeb41f714c28041f8');
assert.deepEqual(literals.asciiEscapeOffsets.map(r=>r.literal),['\\ud800','\\udc00','\\ud800','\\udc00']);
assert.deepEqual(literals.argv.slice(5).map(r=>r.units),['d800','dc00','d83dde00']);
assert.equal(literals.environmentValue.units,'0068006900670068002dd800002d006c006f0077002ddc00002d0070006100690072002dd83dde00');
assert(fs.readFileSync(join(here,'measured-differences.json')).equals(fs.readFileSync(resolve(here,'../ts-035e3h-runtime-exec/field-differences.json'))));
assert.equal(contract.status,'DESIGN ONLY; execution unauthorized');assert.equal(contract.inheritEnvironment,false);assert.equal(contract.limits.launches,1);assert.equal(contract.limits.retries,0);
const input=fs.readFileSync(join(here,'diagnostic-input.json.txt'));assert(input.every(b=>b<128));assert(input.length<1024);
assert.deepEqual(JSON.parse(input).argv.map(s=>Array.from({length:s.length},(_,i)=>s.charCodeAt(i))),[[0xd800],[0xdc00],[0xd83d,0xde00]]);
for(const [name,expected] of [['replacement',['fffd','fffd','fffd002dfffd']],['preserved',['d800','dc00','d800002ddc00']]]){
 const b=fs.readFileSync(join(here,'expected-'+name+'.stdout.txt'));assert(b.every(c=>c<128));assert(b.length<contract.limits.stdoutBytes);
 const lines=b.toString().split('\r\n');assert.equal(lines.length,11);assert.equal(lines.at(-1),'');
 assert.equal(lines[0].slice(5),input.toString().split('').map(c=>c.charCodeAt(0).toString(16).padStart(4,'0')).join(''));
 assert.equal(lines[1],'parsed0='+expected[0]);assert.equal(lines[2],'parsed1='+expected[1]);assert.equal(lines[4],'cast0='+expected[0]);assert.equal(lines[5],'cast1='+expected[1]);assert.equal(lines[7],'pair=0052004900460054005f0055004e004900540053003d'+expected[2]);
 assert.equal(lines[3],'parsed2=d83dde00');assert.equal(lines[6],'cast2=d83dde00');assert.equal(lines[8],'controlHigh=d800');assert.equal(lines[9],'controlLow=dc00');
}
assert(!fs.readdirSync(here).some(n=>n.endsWith('.ps1')));
console.log(JSON.stringify({offlineEvidenceAndLiteralChecks:'passed',diagnosticInvocations:0,powerShellIntermediateMeasurements:0,failedRuntimeRetained:true}));
