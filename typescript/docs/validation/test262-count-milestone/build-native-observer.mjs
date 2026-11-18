import {execFile} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../tools/probe-verdict.mjs';
const root='/mnt/c/Users/jonku/code/rift/typescript';
const compiler='/var/tmp/rift-clean-compiler-package/relocated/bin/scriptc';
const output=root+'/build/test262-baseline-comparison/native-observer';
const run=args=>new Promise(resolve=>execFile(compiler,args,{cwd:root,encoding:'utf8',timeout:900000,maxBuffer:4*1024*1024,env:{...process.env,PATH:root+'/build/linux-toolchains/clang22-relative/bin:'+process.env.PATH,SCRIPTC_CACHE_DIR:'/var/tmp/rift-test262-native-cache',SCRIPTC_CACHE_MAX_MB:'1024'}},(error,stdout,stderr)=>resolve({args,status:error===null?0:typeof error.code==='number'?error.code:null,signal:error?.signal??null,error:error&&typeof error.code!=='number'?String(error):null,stdout,stderr})));
const build=await run(['build','src/script-observation-driver.ts','--tier','static-only','--no-keep-llvm','-o',output]);
writeFileSync('native-observer-build-clang.json',JSON.stringify(build,null,2));
if(build.status!==0) {console.log(JSON.stringify(build));process.exit(1);}
const coverage=await run(['coverage','src/script-observation-driver.ts']);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
const result={compiler,output,build,coverage,verdict,executableSha256:createHash('sha256').update(readFileSync(output)).digest('hex'),executionValidated:false};
writeFileSync('native-observer-compile.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({verdict,executableSha256:result.executableSha256}));
process.exitCode=verdict==='PASS'?0:1;
