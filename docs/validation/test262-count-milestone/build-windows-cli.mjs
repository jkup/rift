import {readFileSync,writeFileSync,copyFileSync,existsSync,constants} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {scriptcPath} from '../../tools/scriptc-path.mjs';
import {runNativeCommand} from '../../tools/native-build-runner.mjs';
import {probeVerdict} from '../../tools/probe-verdict.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const directory=join(root,'build/test262-baseline-comparison');
const output=join(directory,'rift.exe');
const compiler=scriptcPath(root,{});
const env={...process.env,PATH:join(root,'build/windows-toolchains/zig/zig-x86_64-windows-0.16.0')+';'+process.env.PATH,SCRIPTC_CACHE_DIR:join(root,'build/weak-canonical-acceptance/cache'),SCRIPTC_CACHE_MAX_MB:'1024'};
const run=(command,args)=>runNativeCommand(command,args,{cwd:root,env});
const build=await run(compiler,['build','src/cli.ts','--tier','static-only','--no-keep-llvm','-o',output]);
writeFileSync(join(directory,'windows-cli-build.json'),JSON.stringify(build,null,2));
if(build.status!==0) {console.log(JSON.stringify(build));process.exit(1);}
const coverage=await run(compiler,['coverage','src/cli.ts']);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
const report={compiler,build,coverage,verdict,cases:[],installed:false};
const save=()=>writeFileSync(join(directory,'windows-cli-acceptance.json'),JSON.stringify(report,null,2));
save();
if(verdict!=='PASS') throw new Error('CLI compilation/coverage failed');
const cases=JSON.parse(readFileSync(join(root,'test/cases.json'),'utf8'));
cases.push({args:['-e','let k={},m=new WeakMap([[k,7]]),s=new WeakSet([k]);console.log(m.get(k),s.has(k),m.getOrInsert(k,9));'],stdout:'7 true 7\n'});
cases.push({args:[],status:64,error:'usage: rift'});
cases.push({args:['--time-zone','Not/AZone','-e','1'],status:64,error:'invalid time zone: Not/AZone'});
for(const test of cases) {
  const args=test.args??[test.file];
  const node=await run(process.execPath,[join(root,'build/node/src/cli.js'),...args]);
  const native=await run(output,args);
  const matches=result=>result.error===null&&result.signal===null&&result.status===(test.status??0)
    && result.stdout.replaceAll('\r\n','\n')===(test.stdout??'')
    && (test.error?result.stderr.includes(test.error):test.errorPattern?new RegExp(test.errorPattern).test(result.stderr):result.stderr==='');
  const passed=matches(node)&&matches(native);
  report.cases.push({test,node,native,passed});save();
  if(!passed) throw new Error('CLI case failed: '+JSON.stringify(test));
}
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const canonical=join(root,'build/native/rift.exe');
if(existsSync(canonical)) {
  report.previousExecutableSha256=hash(canonical);
  copyFileSync(canonical,join(directory,'prior-canonical-rift.exe'),constants.COPYFILE_EXCL);
}
copyFileSync(output,canonical);
report.executableSha256=hash(output);
if(hash(canonical)!==report.executableSha256) throw new Error('CLI install hash mismatch');
report.installed=true;save();
console.log(JSON.stringify({verdict,cases:report.cases.length,installed:true,executableSha256:report.executableSha256}));
