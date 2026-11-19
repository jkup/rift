import {readFileSync,writeFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]).sort();}
function member(path,label=relative(base,path).replaceAll('\\','/')){const stat=lstatSync(path);return {path:label,bytes:stat.size,sha256:hash(readFileSync(path)),symbolicLink:stat.isSymbolicLink(),links:stat.nlink};}
const source=[...walk(resolve(base,'src')).filter(p=>p.endsWith('.ts')),resolve(base,'test/script-observation.ts'),...walk(resolve(base,'test/fixtures/script-observation')),...walk(resolve(base,'test/fixtures/harness-bundle')),...['package.json','package-lock.json','tsconfig.json','tools/build-native.mjs','tools/probe-verdict.mjs'].map(p=>resolve(base,p))].sort();
const adapter=[...['script-observe.mjs','script-driver-result.mjs','script-result.mjs','input.mjs'].map(p=>resolve(base,'tools/test262',p)),...walk(resolve(base,'node_modules/yaml'))].sort();
const nodeFiles=[...walk(resolve(base,'build/node/src')).filter(p=>p.endsWith('.js')),resolve(base,'build/node/test/script-observation.js')];
const nativeFiles=['build/native/script-observation-driver.exe','build/native/script-observation.exe'].map(p=>resolve(base,p));
const toolchain=['scriptc','typescript','yaml'].flatMap(name=>walk(resolve(base,'node_modules',name))).map(p=>member(p));
const result={claim:'Read-only current member-byte inventory. Existing built artifacts are not rebuilt or certified; provenance/freshness and linker/sysroot closure remain unresolved.',host:process.version,platform:process.platform+'/'+process.arch,nodeExecutable:member(process.execPath,'@node'),observationSource:source.map(p=>member(p)),observationAdapter:adapter.map(p=>member(p)),nodeBuilt:nodeFiles.map(p=>member(p)),nativeBuilt:nativeFiles.map(p=>existsSync(p)?member(p):{path:relative(base,p),missing:true}),toolchainPackages:toolchain,unresolved:['source-to-artifact fresh build provenance','effective compiler dependencies beyond inventoried package trees','Zig/linker/sysroot content allowlist','conformance host-services descriptor','conformance preflight dispatcher/descriptor','execution registry/rule policy','exclusive archive schema and lexical parent owner']};
writeFileSync(resolve(here,'dependency-members.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({source:source.length,adapter:adapter.length,nodeBuilt:nodeFiles.length,nativeBuilt:nativeFiles.length,toolchain:toolchain.length}));
