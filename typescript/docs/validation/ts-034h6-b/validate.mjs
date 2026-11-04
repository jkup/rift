import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const labels=['E01 E02 E03','E04 E05','E08 E09 E11','E12 E13 E14','E15','E16 E23','E17 E18 E19','E20 E21','E22','E24 E25','E26 E27 E28','E31 E34 E35 E36','E06 E07 E10 E29 E30 E32 E33 frozen B traces','B prefixes 504','G01 G02 G03 G04 G05 G06 G07 G09','G08 cross-tag legitimate nested call','G10 nested normal language host'];
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-errors-b.ts');assert.ok(gate);
const results=[];
try{for(const [id,number,payload] of [['input-a',7,'seven'],['input-b',11,'eleven']]){
 const file='fixtures/harness-errors-b/'+id+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/'+id+'.js'));
 const expected=labels.map(l=>'PASS '+l+'\n').join('')+`PASS runtime ${id} ${number} ${payload}\nPASS Symbol hooks and formatting conversion\n`;
 const row={id,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-errors-b.exe',lane==='node'?['build/node/test/harness-errors-b.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/error-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS E01-E36/G01-G10,15 B traces,504 prefixes/input/lane,two distinct runtime payloads; C deferred');
