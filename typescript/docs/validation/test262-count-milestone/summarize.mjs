import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const paths=read('cpp-selection.json');
assert.equal(new Set(paths).size,paths.length,'duplicate selected file');
const selected=new Set(paths);
const corpusAudit=read('corpus-audit.json');
assert.deepEqual(corpusAudit.differences,[],'corpus differs from pinned archive');
assert(corpusAudit.checked>paths.length,'incomplete corpus audit');
assert.equal(sha('corpus.tar.gz'),corpusAudit.archiveSha256,'corpus archive changed');
const hosts={cpp:'cpp-direct',node:'node',native:'native'};
const reports={};
const counts=rows=>{
  const answer={};
  for(const row of rows) answer[row.status]=(answer[row.status]??0)+1;
  return answer;
};
for(const [host,prefix] of Object.entries(hosts)) {
  const progress=read(prefix+'-progress.json');
  assert.equal(progress.complete,true,host+' run incomplete');
  assert.equal(progress.selected,paths.length,host+' selection count');
  const text=readFileSync(prefix+'-results.jsonl','utf8');
  assert(text.endsWith('\n'),host+' truncated result');
  const rows=text.trimEnd().split('\n').map(JSON.parse);
  const map=new Map(rows.map(row=>[row.path,row]));
  assert.equal(rows.length,paths.length,host+' result count');
  assert.equal(map.size,paths.length,host+' duplicate result');
  for(const row of rows) assert(selected.has(row.path),host+' unexpected path');
  assert.deepEqual(counts(rows),progress.counts,host+' summary mismatch');
  reports[host]={map,primaryCounts:counts(rows),sha256:sha(prefix+'-results.jsonl')};
}
for(const host of ['node','native']) {
  for(const path of paths) {
    const row=reports[host].map.get(path),reference=reports.cpp.map.get(path);
    assert(reference.sha256,'missing C++ source hash');
    if(row.sha256) assert.equal(row.sha256,reference.sha256,host+' source mismatch: '+path);
    else assert.equal(row.status,'runner-error',host+' missing source hash');
  }
}
const followups=read('metadata-followup.json');
assert.equal(followups.scanned,paths.length,'metadata followup scope');
const applied=[];
for(const row of followups.results) {
  assert(selected.has(row.path),'unexpected followup file');
  assert.equal(row.sha256,reports.cpp.map.get(row.path).sha256,'followup source changed');
  assert(row.agrees,'metadata followup disagreement');
  for(const host of ['node','native']) {
    const previous=reports[host].map.get(row.path);
    if(previous.status!=='runner-error') {
      assert.equal(previous.status,row[host].status,'followup changed non-error result');
      continue;
    }
    reports[host].map.set(row.path,{path:row.path,sha256:row.sha256,...row[host]});
    applied.push({host,path:row.path,previous:previous.status,status:row[host].status});
  }
}
const sourceManifest=read('../weak-canonical-acceptance/inputs.json');
for(const [path,hash] of Object.entries(sourceManifest.files)) assert.equal(sha(resolve('../..',path)),hash,'canonical source changed: '+path);
const nodeInputs=read('node-engine-inputs.json');
for(const [path,hash] of Object.entries(nodeInputs.compiled)) assert.equal(sha(resolve('../../..',path)),hash,'Node engine changed: '+path);
const compiler=read('native-observer-compile.json');
assert.equal(compiler.verdict,'PASS','native compilation gate');
assert.equal(sha('native-observer'),compiler.executableSha256,'native executable changed');
const outcomes=paths.map(path=>({path,sha256:reports.cpp.map.get(path).sha256,...Object.fromEntries(Object.keys(hosts).map(host=>[host,reports[host].map.get(path).status]))}));
const bothHostPasses=outcomes.filter(row=>row.node==='passed'&&row.native==='passed').length;
const cppPasses=reports.cpp.primaryCounts.passed??0;
const summary={
  revision:'91c70759363c46557b694792bf34a2551a7af5ba',selected:paths.length,
  corpusArchiveSha256:corpusAudit.archiveSha256,corpusAuditSha256:sha('corpus-audit.json'),
  baseline:'Preserved C++ engine with original runner harness/classifications; direct process launch fixes timeout cleanup only',
  primary:Object.fromEntries(Object.entries(reports).map(([host,r])=>[host,{counts:r.primaryCounts,resultsSha256:r.sha256}])),
  followups:applied,
  effective:Object.fromEntries(Object.entries(reports).map(([host,r])=>[host,counts(r.map.values())])),
  cppPasses,bothHostPasses,meetsPassCountTarget:bothHostPasses>=cppPasses,
  cppPassesWithCleanupCrash:[...reports.cpp.map.values()].filter(row=>row.status==='passed'&&row.reason?.includes('runtime crashed during cleanup')).length,
  hostClassificationDifferences:outcomes.filter(row=>row.node!==row.native),
  nativeExecutableSha256:compiler.executableSha256,
};
writeFileSync('comparison-outcomes.json',JSON.stringify(outcomes),{flag:'wx'});
writeFileSync('comparison-summary.json',JSON.stringify(summary,null,2),{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
