import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {rows} from '../ts-031c-a/cases.mjs';
import {cases as controls} from '../ts-031c-p/cases.mjs';
const root=resolve(import.meta.dirname,'../../..'), here=import.meta.dirname;
process.chdir(root);
const scratch=join(root,'build/return-certification'); mkdirSync(scratch,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
for(const name of ['parser','lexer','syntax','outcomes']) writeFileSync(join(scratch,name+'.ts'),git('show','802f595:typescript/src/'+name+'.ts'));
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--types','node','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--outDir',join(scratch,'js'),join(scratch,'parser.ts')]);
const baseline=await import(pathToFileURL(join(scratch,'js/parser.js')));
const current=await import(pathToFileURL(join(root,'build/node/src/parser.js')));
const manifest=JSON.parse(readFileSync('fixtures/assistance/test262-starter-corpus/manifest.json'));
const entries=Object.values(manifest).find(x=>Array.isArray(x)&&x.some(y=>y.id==='S18'));
const corpus=process.argv[2]; assert.ok(corpus);
const all=rows.slice();
for(const [id,source,capability] of controls){
 const old=baseline.parse(source);
 // C01-C07 existing literal capabilities are independent of audit mode.
 assert.equal(old.rejection?.capabilityCode??null,capability,id);
 let expected=capability,loc=old.error?[old.error.loc.line,old.error.loc.column]:null;
 if(capability===null) expected=[];
 else if(capability==='parse.return-context') {
  const f=rows.find(x=>x[1]===source);
  if(f){expected=f[2];loc=f[3];}
  else if(id==='T11') expected=[[0,6,1,1]];
  else throw Error('missing explicit control expectation '+id);
 }
 all.push(['C-'+id,source,expected,loc]);
}
for(const entry of entries.filter(x=>['S18','S19','S20','S21','S22'].includes(x.id))){
 const bytes=readFileSync(join(corpus,entry.path));
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),entry.blob);
 for(const variant of entry.variants){
  const source=(variant==='strict'?'"use strict";\n':'')+bytes.toString('utf8');
  const old=baseline.parse(source); let expected=old.rejection.capabilityCode,loc=[old.error.loc.line,old.error.loc.column];
  assert.equal(expected,{S18:'parse.assignment-target',S19:'parse.declaration-statement',S20:'parse.return-context',S21:'parse.duplicate-parameter',S22:'parse.duplicate-binding'}[entry.id]);
  if(entry.id==='S20'){
   // Exact keyword is the final statement in this pinned blob, independent of parser tokens.
   const start=source.lastIndexOf('return'); const prefix=source.slice(0,start).split('\n');
   expected=[[start,start+6,prefix.length,prefix.at(-1).length+1]];
  }
  all.push([(entry.id==='S20'?'F23-':'F24-')+entry.id+'/'+variant,source,expected,loc]);
 }
}
const results=[];
for(const [id,source,expected,loc] of all){
 const old=baseline.parse(source), before=current.parse(source);
 const eligible=old.rejection?.kind==='unsupported-syntax' && old.rejection.capabilityCode==='parse.return-context' && Array.isArray(expected) && expected.length>0;
 const wantedPublic=structuredClone(old);
 if(eligible) wantedPublic.rejection={kind:'syntax-error',ruleCode:'return-outside-function'};
 assert.deepEqual(before,wantedPublic,id+' only eligible tag delta');
 const audit=current.auditScriptReturns(source);
 assert.deepEqual(current.parse(source),wantedPublic,id+' public after audit');
 assert.equal(Object.hasOwn(audit,'body'),false,id+' no executable AST');
 assert.equal(Object.hasOwn(audit,'candidates'),Array.isArray(expected),id+' blocked candidates hidden');
 const wanted=Array.isArray(expected)?`complete ${source.length} ${source.length} ${expected.length}\n`+expected.map(x=>x.join(' ')+'\n').join(''):`blocked ${expected}\n${loc.join(' ')}\n`;
 const file=join(scratch,'source.js');writeFileSync(file,source);
 const lanes={};
 for(const lane of ['node','native']){
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/return-audit.exe'),lane==='node'?['build/node/test/return-audit.js',file]:[file],{encoding:'utf8',timeout:10000});
  const record={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr}; lanes[lane]=record;
  writeFileSync(join(here,'latest-attempt.json'),JSON.stringify({id,expected:wanted,lanes},null,2));
  assert.deepEqual(record,{status:0,signal:null,error:null,stdout:wanted,stderr:''},id+' '+lane);
 }
 const observations={};
 const cli={};
 if(old.error) for(const lane of ['node','native']) {
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/rift.exe'),lane==='node'?['build/node/src/cli.js',file]:[file],{encoding:'utf8',timeout:10000});
  const d=old.error;
  assert.equal(r.status,2,id+' CLI exit'); assert.equal(r.signal,null); assert.equal(r.error,undefined); assert.equal(r.stdout,'');
  assert.equal(r.stderr,`${file}:${d.loc.line}:${d.loc.column}: ${d.phase} ${d.name}: ${d.message}\n`,id+' original CLI diagnostic');
  cli[lane]={status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr};
 }
 for(const lane of ['node','native']) for(const mode of (old.error ? ['parser-observation','body-observation'] : ['parser-observation'])){
  const output=join(scratch,lane+'-observation.json');
  const args=[...(lane==='node'?['build/node/src/observation-driver.js']:[]),mode,file,id,output,'return-audit','100000','64'];
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/observation-driver.exe'),args,{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,id+' observation exit');assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
  const record=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(record.bodyEvaluated,false); assert.equal(record.observation.kind,wantedPublic.rejection?.kind??'normal');
  if(wantedPublic.rejection) for(const [key,value] of Object.entries(wantedPublic.rejection)) assert.equal(record.observation[key],value,id+' public provenance');
  assert.deepEqual(record.location,old.error?.loc??null,id+' public location');
  if(old.error) assert.equal(record.observation.diagnostic,old.error.message,id+' diagnostic');
  if(eligible) {assert.equal(record.observation.phase,'parse');assert.equal(record.observation.constructorName,'SyntaxError');}
  observations[lane+'/'+mode]=record;
 }
 for(const mode of (old.error ? ['parser-observation','body-observation'] : ['parser-observation'])) assert.deepEqual(observations['node/'+mode],observations['native/'+mode],id+' public lanes');
 results.push({id,eligible,observations,cli,sourceUnits:source.length,sourceSha256:createHash('sha256').update(source).digest('hex'),expected,loc,public:before,audit,lanes});
}
writeFileSync(join(here,'results.json'),JSON.stringify(results,null,2)+'\n');
console.log(`${results.length} rows in each lane; full public AST/diagnostic baseline equality with only literal eligible return tag changes; exact audit outputs; no body/effects.`);
