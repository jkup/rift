import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {probeVerdict,completed} from '../../../../tools/probe-verdict.mjs';
const here=import.meta.dirname,root=resolve(here,'../../../..'),build=join(here,'build');
const frozen=JSON.parse(readFileSync(join(here,'frozen.json')));
for(const [p,h] of Object.entries(frozen.hashes))assert.equal(createHash('sha256').update(readFileSync(join(here,p))).digest('hex'),h,p);
mkdirSync(build,{recursive:true});
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
function execute(exe,args){const r=spawnSync(exe,args,{cwd:root,encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};}
const result={frozenSha256:createHash('sha256').update(readFileSync(join(here,'frozen.json'))).digest('hex'),claims:'Only actual-type trusted-bootstrap map simulation; no C implementation or acceptance',runs:[]};
const save=()=>writeFileSync(join(here,process.argv[2]??'results.json'),JSON.stringify(result,null,2)+'\n');
const entry=join(here,'probe.ts');
result.typecheck=execute(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','--target','es2024','--module','nodenext','--strict','--types','node','--rootDir',root,'--outDir',join(build,'node'),entry]);save();assert.ok(completed(result.typecheck),JSON.stringify(result.typecheck));
for(const id of ['input-a','input-b']){const node=execute(process.execPath,[join(build,'node/docs/validation/ts-034h6-cp/map-regression/probe.js'),join(here,'../'+id+'.js')]);result.runs.push({id,node});save();assert.ok(completed(node),JSON.stringify(node));assert.equal(node.stdout,frozen.expectedByInput[id]);}
const scriptc=join(root,'node_modules/scriptc/bin/scriptc.exe'),binary=join(build,'probe.exe');
result.build=execute(scriptc,['build',entry,'--tier','static-only','-o',binary]);save();
result.coverage=execute(scriptc,['coverage',entry]);save();
assert.ok(completed(result.build),JSON.stringify(result.build));
for(const run of result.runs){run.native=execute(binary,[join(here,'../'+run.id+'.js')]);run.verdict=probeVerdict({build:result.build,coverage:result.coverage,node:run.node,native:run.native});save();assert.equal(run.verdict,'PASS');assert.equal(run.native.stdout,frozen.expectedByInput[run.id]);}
result.status='PASS 20 rows per input per lane; independent literal expected stdout; static-only and separate zero-dynamic coverage';save();console.log(result.status);
