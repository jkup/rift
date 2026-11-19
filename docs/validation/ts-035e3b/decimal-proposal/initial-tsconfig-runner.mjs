import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here=resolve(import.meta.dirname,'decimal-proposal'),root=resolve(import.meta.dirname,'../../..'),out=mkdtempSync(join(root,'build/ts035e3b-decimal-'));
const exe=resolve(root,'node_modules/scriptc/bin/scriptc.exe'),entry=resolve(here,'driver.ts'),binary=resolve(out,'decimal.exe'),records=[];
function run(command,args){const p=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});return {command,args,status:p.status,signal:p.signal,error:p.error?{code:p.error.code,message:p.error.message}:null,stdout:p.stdout??'',stderr:p.stderr??''};}
function save(){writeFileSync(resolve(here,'native-run.json'),JSON.stringify({out,records},null,2)+'\n');}
const tsc=run(process.execPath,['node_modules/typescript/bin/tsc','--target','es2024','--module','nodenext','--strict','--types','node','--outDir',resolve(out,'node'),entry]);records.push({stage:'tsc',...tsc});save();assert.equal(tsc.status,0,tsc.stdout+tsc.stderr);
const build=run(exe,['build',entry,'--tier','static-only','-o',binary]);records.push({stage:'build',...build});save();
const coverage=run(exe,['coverage',entry,'--explain-dynamic']);records.push({stage:'coverage',...coverage});save();
const success={status:0,signal:null,error:null,stdout:''};assert.equal(probeVerdict({build,coverage,node:success,native:success}),'PASS',JSON.stringify({build,coverage}));
const literals=JSON.parse(readFileSync(resolve(here,'decimal-literals.json'))),outputs=[];
for(const row of literals.filter(r=>!r.text.includes('\0'))){
 const node=run(process.execPath,[resolve(out,'node/driver.js'),row.text]),native=run(binary,[row.text]);
 assert.equal(probeVerdict({build,coverage,node,native}),'PASS',row.id+JSON.stringify({node,native}));
 for(const result of [node,native]){assert.equal(result.stdout.replaceAll('\r\n','\n'),row.expected+'\n',row.id);assert.equal(result.stderr,'',row.id);}
 outputs.push({id:row.id,node,native});
}
writeFileSync(resolve(here,'native-literals.json'),JSON.stringify({literals:literals.length,argvLiterals:outputs.length,excluded:['NUL cannot be passed in OS argv; separately tested in pure module'],binarySha256:createHash('sha256').update(readFileSync(binary)).digest('hex'),outputs},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,argvLiterals:outputs.length,staticOnly:true,zeroDynamic:true}));
