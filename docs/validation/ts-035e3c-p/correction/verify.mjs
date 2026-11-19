import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {execFileSync} from 'node:child_process';
const here=fileURLToPath(new URL('./',import.meta.url)),prior=resolve(here,'..'),base=resolve(here,'../../../..'),root=resolve(base,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=n=>JSON.parse(readFileSync(resolve(here,n))),zip=n=>JSON.parse(gunzipSync(readFileSync(resolve(here,n))));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--implemented'));
const implemented=process.argv.includes('--implemented'),manifest=read('proposal-manifest.json'),originalManifest=read('../proposal-manifest.json');
assert.equal(manifest.replacements.length,0);assert.equal(manifest.additions.length,2);
assert.equal(hash(readFileSync(resolve(here,'../../../script-execution-selection.md'))),manifest.designSha256);
assert.equal(manifest.originalDesignSha256,originalManifest.designSha256);
assert.equal(hash(readFileSync(resolve(here,'original/script-execution-selection.md'))),manifest.originalDesignSha256);
assert.equal(hash(readFileSync(resolve(prior,'artifact-manifest.json'))),manifest.originalArtifactManifestSha256);
const preserved=read('../preservation.json'),oldArtifacts=read('../artifact-manifest.json');
for(const row of preserved.files)assert.equal(hash(readFileSync(resolve(root,row.path))),row.sha256,row.path);
for(const row of oldArtifacts.files)assert.equal(hash(readFileSync(resolve(prior,row.path))),row.sha256,row.path);
const artifacts=read('artifact-manifest.json');
for(const row of artifacts.files){const bytes=readFileSync(resolve(here,row.path));assert.equal(bytes.length,row.bytes,row.path);assert.equal(hash(bytes),row.sha256,row.path);}
for(const row of manifest.additions){
 assert.equal(hash(readFileSync(resolve(here,row.proposal))),row.sha256);
 if(implemented)assert.equal(hash(readFileSync(resolve(base,row.path))),row.sha256);
 else assert(!existsSync(resolve(base,row.path)),row.path+' unexpectedly installed');
}
assert.equal(manifest.additions[0].sha256,'4fc40ed011acacc56f217d06949c9b9790f9cd1ffb2412294a0d6258e67d0547');
for(const row of manifest.literals)assert.equal(hash(readFileSync(resolve(here,row.path))),row.sha256);
// Verify the complete old test body is retained in order, excluding exactly the
// augmented zlib import and expanded final summary line. All old assertions stay.
const oldLines=readFileSync(resolve(prior,'proposals/script-execution-inputs.test.mjs'),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('import {gzipSync}')&&!l.startsWith('console.log(JSON.stringify('));
const newLines=readFileSync(resolve(here,'script-execution-inputs.test.mjs'),'utf8').split(/\r?\n/);let cursor=0;
for(const line of oldLines){const index=newLines.indexOf(line,cursor);assert(index>=cursor,'Original test line lost: '+line);cursor=index+1;}
const literals=zip('expected-captures.json.gz'),tables=read('capture-occurrence-tables.json').tables,vault=read('pinned-byte-identities.json').files;
assert.equal(Object.keys(vault).length,36);assert.equal(Object.keys(literals.expected).length,8);assert.equal(literals.synthetic.length,5);
for(const [path,row] of Object.entries(vault)){
 const b=Buffer.from(row.base64,'base64');assert.equal(b.length,row.byteLength);assert.equal(hash(b),row.sha256);
 assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),row.blob,path);
}
for(const lane of ['node','native']){
 const expected=literals.expected[lane+'/success'];assert.equal(expected.length,33);
 assert.equal(expected.reduce((n,f)=>n+f.slots.length,0),60);
 for(const [i,f] of expected.entries()){
  const t=tables[lane][i];assert.equal(f.ordinal,t.ordinal);assert.equal(f.path,t.path);assert.equal(f.slots.length,t.slots.length);assert.equal(f.state,'captured');
  for(const [j,s] of f.slots.entries()){
   const st=t.slots[j];assert.equal(s.slotId,st.slotId);assert.equal(s.goal,st.goal);assert.equal(s.variant,st.variant);assert.equal(s.units.length,st.occurrences.length);
   for(const [k,u] of s.units.entries()){
    const occurrence=st.occurrences[k],raw=Buffer.from(vault[occurrence.path].base64,'base64'),transformed=Buffer.concat([Buffer.from(occurrence.prefixHex,'hex'),raw]);
    assert.deepEqual(u,{id:occurrence.id,ordinal:occurrence.ordinal,role:occurrence.role,path:occurrence.path,blob:occurrence.blob,
     sourceSha256:hash(raw),transformedSha256:hash(transformed),byteLength:raw.length,transformedByteLength:transformed.length,
     sourceUnits:transformed.toString('utf8').length,originalBase64:raw.toString('base64'),transformedBase64:transformed.toString('base64'),transformedText:transformed.toString('utf8')});
   }
  }
 }
}
const run='run-8ompSu',actual=zip(run+'/results/actual.json.gz'),faults=zip(run+'/results/input-faults.json.gz');
assert.equal(read(run+'/process.json').status,0);assert.equal(zip(run+'/results/errors.json.gz').length,94);
assert.equal(zip(run+'/results/capture-checks.json.gz').checks.length,17);assert.equal(actual.length,6);assert.equal(faults.length,4);
for(const row of manifest.additions)assert.equal(hash(readFileSync(resolve(here,run,'original-'+row.path.split('/').at(-1)))),row.sha256);
for(const lane of ['node','native']){
 const row=actual.find(r=>r.lane===lane&&!r.id);
 assert.deepEqual(row.snapshot.stable.files,literals.expected[lane+'/success']);assert.deepEqual(row.zero.stable.files,literals.expected[lane+'/success']);
 assert.deepEqual(actual.find(r=>r.lane===lane&&r.id==='wrong-revision').snapshot.stable.files,literals.expected[lane+'/wrong-revision']);
 assert.equal(row.snapshot.executionBinding,null);assert.equal(row.snapshot.policyAnchor.authority.entries.length,0);
 assert.equal(row.final.plannedVariants,60);assert.equal(row.final.counts['unsupported-feature'],19);assert.equal(row.final.counts['unsupported-profile'],41);
 assert.equal(row.final.executedVariants,0);assert.equal(row.final.testBodyEvaluatedVariants,0);
 for(const id of ['first-file-unavailable','include-failure'])assert.deepEqual(faults.find(f=>f.lane===lane&&f.id===id).snapshot.stable.files,literals.expected[lane+'/'+id]);
 const unknown=faults.find(f=>f.lane===lane&&f.id==='first-file-unavailable');assert.equal(unknown.report.plannedVariants,58);assert.equal(unknown.report.unplannedInputErrors,1);
}
const rootMutant=read('root-mutant-frAC7u/process.json');assert.equal(rootMutant.status,1);assert.equal(rootMutant.error,null);assert.match(rootMutant.stderr,/capture-literal\/node\/success/);
const mutationDir='mutations-j5pMXq',mutations=read(mutationDir+'/results.json'),contracts=read(mutationDir+'/mutation-contracts.json');
assert.equal(mutations.baseline.length,13);assert.equal(mutations.mutants,55);assert.equal(mutations.rejections,110);assert.equal(mutations.results.length,110);
const source=readFileSync(resolve(prior,'proposals/script-execution-inputs.mjs'),'utf8');
const recordedImports=new Map(read(run+'/import-remapping.json').filter(r=>r.name==='script-execution-inputs.mjs').map(r=>[r.from,r.to]));
for(const contract of contracts){
 const from=contract.from??'  return files;',to=contract.to??('  '+contract.code+'\n  return files;');assert.equal(source.split(from).length,2);
 const changed=source.replace(from,to),mapped=changed.replace(/from '(\.\/[^']+)'/g,(_full,p)=>{assert(recordedImports.has(p));return `from '${recordedImports.get(p)}'`;});
 assert.equal(readFileSync(resolve(here,mutationDir,contract.id+'.mjs'),'utf8'),mapped+'\nexport {capture as testOnlyCapture};\n');
 for(const lane of ['node','native']){
  const result=mutations.results.find(r=>r.id===contract.id&&r.lane===lane);assert(result);assert.equal(result.sourceSha256,hash(changed));assert.equal(result.error,'ERR_ASSERTION');
  const record=zip(mutationDir+'/'+result.output),expected=literals.expected[record.expectedLiteral];assert.equal(record.expectedSha256,hash(JSON.stringify(expected)));
  assert.equal(isDeepStrictEqual(record.actual,expected),false,contract.id+' did not change capture');
 }
}
const original=new Set(preserved.files.map(r=>r.path)),allowed=new Set(manifest.additions.map(r=>'typescript/'+r.path));
const current=execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:10000000}).split('\0').filter(Boolean);
for(const path of current)if(/^typescript\/(src|tools|test)\//.test(path)&&!original.has(path))assert(implemented&&allowed.has(path),'Unapproved new source/test/tool '+path);
console.log(JSON.stringify({preserved:preserved.files.length,originalArtifacts:oldArtifacts.files.length,correctionArtifacts:artifacts.files.length,unchangedImplementation:true,oldTestLinesRetained:oldLines.length,captureComparisons:17,controls:94,mutants:55,rejections:110,guestLaunches:0,builds:0}));
