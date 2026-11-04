import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const cases=[['getter-structural',2],['getter-nominal',1],['getter-structural-unfrozen',1],['getter-nominal-unfrozen',0],['receiver-contract',43],['proxy-receiver',10]];
const groups=['authentic','clone-spread','detached-foreign','rebinding','proxy','ordering','nested-throw-cleanup','immutable-idle'];
const results=[];
for(const [name,dynamic] of cases){
  const row=JSON.parse(readFileSync(new URL(name+'-results.json',import.meta.url),'utf8'));
  for(const k of ['node','build','coverage'])assert.equal(row[k].status,0,`${name} ${k}`);
  for(const k of ['node','build','coverage','native']){assert.equal(row[k].signal,null);assert.equal(row[k].error,null);}
  const match=row.coverage.stdout.match(/in dynamic tier\s+(\d+)/);
  // Zero-dynamic reports omit the dynamic-tier line.
  assert.equal(match?Number(match[1]):0,dynamic,name);
  assert.match(row.coverage.stdout,/fully static/);
  if(name.startsWith('getter')){
    assert.equal(row.node.stdout,'PASS getter live7/11 steps4\n');
    assert.equal(row.native.stdout,row.node.stdout);assert.equal(row.native.status,0);assert.equal(row.native.stderr,'');
  }else if(name==='receiver-contract'){
    assert.equal(row.node.stdout,groups.map(g=>'PASS '+g+'\n').join(''));
    assert.equal(row.native.stdout,groups.map(g=>(g==='proxy'?'FAIL ':'PASS ')+g+'\n').join(''));
    assert.equal(row.native.status,1);assert.equal(row.native.stderr,'');
  }else{
    assert.equal(row.node.stdout,'identity false\nauthentic true true\nproxy-call false\nproxy-tick false\n');
    assert.equal(row.native.status,1);assert.equal(row.native.stdout,'');
    assert.equal(row.native.stderr,'Uncaught Error: non-plain targets or handlers on a native Proxy is not supported yet\n');
  }
  const source='docs/validation/ts-033e4/compiler-investigation/'+name+'.ts';
  const check=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--strict','--target','ES2024','--module','nodenext','--types','node',source],{cwd:root,encoding:'utf8'});
  assert.equal(check.status,0,check.stdout+check.stderr);
  results.push({name,dynamic,node:row.node.status,native:row.native.status,typecheck:check.status});
}
writeFileSync(new URL('verification.json',import.meta.url),JSON.stringify({meaning:'Retained diagnostics verified, not E4 acceptance',results},null,2)+'\n');
console.log('PASS six diagnostic transcripts and six strict typechecks; expected native failures retained');
