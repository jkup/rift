// D2-only exact migration exception. Historical D2-P proposals/verifier stay immutable.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),frozen=new URL('../ts-035d2-p/',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(new URL(p,root));
const manifest=JSON.parse(readFileSync(new URL('proposal-manifest.json',frozen))),proposals=JSON.parse(readFileSync(new URL('old-test-proposals.json',frozen)));
const amendment=JSON.parse(readFileSync(new URL('old-test-amendment.json',here)));
const exception='typescript/tools/test262/script-observe-codec.test.mjs',approved='e8e8a78a388a2a4069b2991de2974f5718218b92b97006ea334a074933eee49a';
assert.equal(manifest.base,'62a8787');assert.equal(proposals.base,manifest.base);assert.equal(manifest.entries.length,815);assert.equal(proposals.entries.length,815);
assert.equal(amendment.path,exception);assert.equal(amendment.resultSha256,approved);
const proposed=Buffer.from(amendment.proposedBytes,'base64');assert.equal(hash(proposed),approved);assert.deepEqual(readFileSync(new URL('proposed-script-observe-codec.test.mjs',here)),proposed);
const proposalMap=new Map(proposals.entries.map(p=>[p.path,p]));assert.equal(proposalMap.size,815);
const tree=execFileSync('git',['ls-tree','-r',manifest.base],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
const blobs=new Map(tree.trim().split('\n').map(line=>{const [meta,path]=line.split('\t');return[path,meta.split(' ')[2]];}));
let unchanged=0,migrated=0;
for(const entry of manifest.entries){
 const proposal=proposalMap.get(entry.path);assert.ok(proposal);assert.equal(proposal.encoding,'base64');const original=Buffer.from(proposal.bytes,'base64');
 assert.equal(original.toString('base64'),proposal.bytes);assert.equal(entry.gitBlob,blobs.get(entry.path));assert.equal(hash(original),entry.originalSha256);assert.equal(entry.resultSha256,entry.originalSha256);assert.equal(original.length,entry.byteLength);
 const normalized=Buffer.from(original.toString('utf8').replaceAll('\r\n','\n'));assert.equal(hash(normalized),entry.baseGitSha256);assert.equal(createHash('sha1').update(Buffer.from('blob '+normalized.length+'\0')).update(normalized).digest('hex'),entry.gitBlob);
 if(entry.path===exception){assert.equal(amendment.originalSha256,entry.originalSha256);assert.deepEqual(Buffer.from(amendment.originalBytes,'base64'),original);assert.deepEqual(read(entry.path),proposed,entry.path+' exact reviewed migration');migrated++;}
 else {assert.deepEqual(read(entry.path),original,entry.path+' immutable whole file');unchanged++;}
}
assert.equal(unchanged,814);assert.equal(migrated,1);
writeFileSync(new URL('old-files-preservation.json',here),JSON.stringify({base:manifest.base,total:815,unchanged,migrated,exception,approvedSha256:approved},null,2)+'\n');
console.log('PASS 815 whole files: 814 immutable, one exact reviewed migration '+approved);
