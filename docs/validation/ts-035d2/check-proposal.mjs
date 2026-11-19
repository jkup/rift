import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here='docs/validation/ts-035d2',p=JSON.parse(readFileSync(here+'/old-test-amendment.json')),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(readFileSync('../'+p.path)),p.originalSha256,'real old test unchanged');
assert.equal(hash(readFileSync(here+'/proposed-script-observe-codec.test.mjs')),p.resultSha256,'complete proposal retained');
assert.equal(Buffer.from(p.originalBytes,'base64').toString('base64'),p.originalBytes);assert.equal(hash(Buffer.from(p.proposedBytes,'base64')),p.resultSha256);
const from="need(b.action==='execute' && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));",to="need((b.action==='execute' || op.stage==='harness') && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
const ruleFrom="ruleCode:one(['return-outside-function'])",ruleTo="ruleCode:one(['return-outside-function','duplicate-block-lexical-function'])";
for(const name of ['script-driver-result.mjs','script-result.mjs']){const old=execFileSync('git',['show','e66876d:typescript/tools/test262/'+name],{encoding:'utf8'});assert.equal(old.split(from).length,2);assert.equal(old.split(ruleFrom).length,2);assert.equal(readFileSync('tools/test262/'+name,'utf8').replaceAll('\r\n','\n'),old.replace(from,to).replace(ruleFrom,ruleTo).replaceAll('\r\n','\n'));}
writeFileSync(here+'/proposal-audit.json',JSON.stringify({status:'offline proposal validation only, NOT applied or accepted',oldTestUnchanged:true,wholeProposedFileVerified:true,exactCurrentDecoderDiffs:2,originalSha256:p.originalSha256,resultSha256:p.resultSha256},null,2)+'\n');console.log('PASS offline proposal shape/whole-file hashes; real old test unchanged; no full-suite acceptance');
