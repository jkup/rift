import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const read=p=>readFileSync(join(root,p));
const dir='docs/validation/ts-033e4/';
const json=p=>JSON.parse(read(dir+p));
const source=json('compiler-source.json'),provenance=json('compiler-provenance.json');
const license=read(dir+'compiler-source-LICENSE.txt');
assert.equal(createHash('sha1').update('blob '+license.length+'\0').update(license).digest('hex'),'d645695673349e3947e8e5ae42332d0ac3164cd7');
const revision='6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff';
assert.equal(source.revision,revision);assert.equal(source.tag[0].object.sha,revision);assert.equal(source.release.target,revision);
for(const p of provenance.packages){
    assert.equal(p.version,'0.4.7');assert.equal(p.integrity,p.lockIntegrity);
    const decoded=p.decoded.find(d=>d.predicateType==='https://slsa.dev/provenance/v1');
    assert.ok(decoded);
    assert.equal(decoded.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit,revision);
    assert.equal('sha512-'+Buffer.from(decoded.subject[0].digest.sha512,'hex').toString('base64'),p.integrity);
}
for(const f of provenance.files){const bytes=read(f.path);assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
for(const f of source.files){
    assert.ok(f.url.includes('/'+revision+'/'+f.path));
    for(const e of f.excerpts){assert.equal(typeof e.text,'string');assert.equal(e.text.split('\n').length,e.end-e.start+1);assert.ok(e.text.length>0);}
}
const runtimePath='node_modules/@scriptc/cli-win32-x64-msvc/dist/lib/runtime-sources/src/scr_json.c';
const runtime=read(runtimePath);
const blob=createHash('sha1').update('blob '+runtime.length+'\0').update(runtime).digest('hex');
assert.equal(blob,source.runtimeSourceTree.sha);
const runtimeExcerpt={path:source.runtimeSourceTree.path,blobSha:blob,revision,start:7275,end:7326,text:runtime.toString().split('\n').slice(7274,7326).join('\n')};
writeFileSync(new URL('compiler-runtime-excerpt.json',import.meta.url),JSON.stringify(runtimeExcerpt,null,2)+'\n');
const ir=json('compiler-ir-results.json');
assert.equal(ir[0].calls.length,1);assert.equal(ir[0].calls[0].receiver,null);assert.equal(ir[0].receiverReads.length,1);
assert.equal(ir[1].globals.find(g=>g.name==='context').type.kind,'dyn');assert.equal(ir[1].calls.filter(c=>c.receiver!==null).length,2);
assert.equal(ir[2].calls[0].kind,'dynInvoke');assert.ok(ir[2].calls[0].receiver);
assert.equal(ir[2].node.stdout,'true\n');assert.equal(ir[2].native.stdout,'true\n');assert.equal(ir[2].native.status,0);assert.match(ir[2].coverage.stdout,/in dynamic tier\s+4\b/);
const baseline='7db0b45';
const changed=execFileSync('git',['diff','--name-only','--diff-filter=MDR',baseline],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert.ok(changed.every(p=>p==='typescript/COORDINATION.md'),changed.join('\n'));
const result={kind:'offline source/IR/provenance consistency; not cryptographic signature verification or E4 acceptance',revision,sourceFiles:source.files.length,runtimeBlobMatches:true,packageDigestsMatch:true,protectedBaseline:baseline,changedTrackedPaths:changed,originalEvidenceUnchanged:true};
writeFileSync(new URL('compiler-diagnosis-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log('PASS pinned-source/package-digest/runtime-blob/IR checks; original evidence unchanged');
