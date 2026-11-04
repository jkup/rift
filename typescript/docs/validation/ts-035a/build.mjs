import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
function run(args) {
 const r=spawnSync('node_modules/scriptc/bin/scriptc.exe',args,{encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});
 return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};
}
const entry='test/script-observation-serialization.ts';
const build=run(['build',entry,'--tier','static-only','-o','build/native/script-observation-serialization.exe']);
const coverage=run(['coverage',entry]);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
writeFileSync(new URL('gate.json',import.meta.url),JSON.stringify({entry,build,coverage,verdict},null,2)+'\n');
console.log(verdict,build.stderr,coverage.stdout);
process.exitCode=verdict==='PASS'?0:1;
