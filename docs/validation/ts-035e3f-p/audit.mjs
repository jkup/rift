import {readFileSync,readdirSync,lstatSync,realpathSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,relative,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
const here=dirname(fileURLToPath(import.meta.url)), root=resolve(here,'../../..'), repo=resolve(root,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,data)=>writeFileSync(join(here,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
function member(path,label=path){try{const s=lstatSync(path);return {path:label,realpath:realpathSync(path),kind:s.isSymbolicLink()?'link':s.isFile()?'file':s.isDirectory()?'directory':'other',nlink:s.nlink,dev:s.dev,ino:s.ino,bytes:s.size,sha256:s.isFile()?hash(readFileSync(path)):null};}catch(e){return {path:label,error:e.code};}}
function tree(path,label){const out=[];function visit(p,l){const m=member(p,l);if(m.kind==='directory'){for(const n of readdirSync(p).sort())visit(join(p,n),l+'/'+n);}else out.push(m);}visit(path,label);return out;}
function command(exe,args){const r=spawnSync(exe,args,{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024});return {exe,args,cwd:root,status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};}
const tracked=command('git',['ls-files','-z']);if(tracked.status!==0)throw Error('git inventory failed');
// git runs in typescript, so include the complete repository explicitly.
const all=spawnSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024});if(all.status!==0)throw Error('repo inventory failed');
save('preservation.json',all.stdout.split('\0').filter(p=>p&&!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p)).map(p=>({path:p,bytes:readFileSync(join(repo,p)).length,sha256:hash(readFileSync(join(repo,p)))})));
save('project-inputs.json',['src','test','probes','tools'].flatMap(p=>tree(join(root,p),p)).concat(['package.json','package-lock.json','tsconfig.json'].map(p=>member(join(root,p),p))));
save('installed-packages.json',tree(join(root,'node_modules'),'node_modules'));
const past=JSON.parse(readFileSync(join(root,'docs/validation/ts-035e3d/generated-closure.json'),'utf8'));
const zig=past.zig.path;
const envNames=['PATH','PATHEXT','SystemRoot','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','HOME','NODE_OPTIONS','NODE_PATH','SCRIPTC_LINKER','SCRIPTC_TARGET','SCRIPTC_RUNTIME_PACK','SCRIPTC_NO_CACHE','SCRIPTC_CACHE_DIR','ZIG_LIB_DIR','ZIG_GLOBAL_CACHE_DIR','ZIG_LOCAL_CACHE_DIR','CC','CXX','CFLAGS','CPPFLAGS','LDFLAGS','LIB','LIBPATH','INCLUDE','WindowsSdkDir','WindowsSDKVersion','UniversalCRTSdkDir','UCRTVersion','VCToolsInstallDir','VCINSTALLDIR','VSINSTALLDIR','SDKROOT'];
const environment=envNames.map(name=>{const key=Object.keys(process.env).find(k=>k.toLowerCase()===name.toLowerCase());return {name,present:key!==undefined,value:key===undefined?null:process.env[key]};});
const pathValue=environment.find(x=>x.name==='PATH').value;
save('host.json',{observedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,release:os.release(),node:member(process.execPath),nodeVersion:process.version,environment,environmentScope:'allowlisted build/search settings only; not a complete effective environment or past build environment',zigFromPastRecord:member(zig),pathCandidates:(pathValue??'').split(';').map(p=>({directory:p,zig:member(join(p,'zig.exe')),clang:member(join(p,'clang.exe')),link:member(join(p,'link.exe'))}))});
save('discovery-commands.json',[
command(join(root,'node_modules/scriptc/bin/scriptc.exe'),['--version']),
command(join(root,'node_modules/scriptc/bin/scriptc.exe'),['--help']),
command(join(root,'node_modules/scriptc/bin/scriptc.exe'),['build','--help']),
command(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--version']),
command(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--showConfig','-p','tsconfig.json']),
command('zig',['version']),command(zig,['version']),command(zig,['env'])]);
save('zig-tree.json',tree(dirname(zig),'zig-install'));
const exeFiles=[process.execPath,join(root,'node_modules/scriptc/bin/scriptc.exe'),join(root,'node_modules/@typescript/typescript-win32-x64/lib/tsc.exe'),zig,...tree(join(root,'node_modules/@scriptc'),'@scriptc').filter(x=>x.path.endsWith('.exe')||x.path.endsWith('.dll')).map(x=>join(root,'node_modules',x.path))];
function peImports(b){const pe=b.readUInt32LE(0x3c);if(b.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('not PE');const count=b.readUInt16LE(pe+6),size=b.readUInt16LE(pe+20),opt=pe+24,magic=b.readUInt16LE(opt),dir=opt+(magic===0x20b?112:96);const sections=[];for(let i=0;i<count;i++){const s=opt+size+i*40;sections.push({rva:b.readUInt32LE(s+12),size:Math.max(b.readUInt32LE(s+8),b.readUInt32LE(s+16)),raw:b.readUInt32LE(s+20)});}const off=r=>{const s=sections.find(s=>r>=s.rva&&r<s.rva+s.size);if(!s)throw Error('unmapped RVA');return s.raw+r-s.rva;};const str=r=>{const o=off(r),end=b.indexOf(0,o);return b.toString('ascii',o,end);};const imports=[],rva=b.readUInt32LE(dir+8);if(rva){let p=off(rva);for(let i=0;i<1024;i++,p+=20){const name=b.readUInt32LE(p+12);if(!name)break;imports.push(str(name));}}return {machine:b.readUInt16LE(pe+4),imports,delayImportDirectoryRva:b.readUInt32LE(dir+13*8),limit:'static direct import names only; no DLL resolution, API-set forwarding, transitive or dynamically loaded libraries'};}
save('pe-imports.json',[...new Set(exeFiles)].map(p=>{try{return {...member(p),pe:peImports(readFileSync(p))};}catch(e){return {path:p,error:String(e)};}}));
const compiler=readFileSync(join(root,'node_modules/scriptc/bin/scriptc.exe')).toString('latin1');
save('compiler-string-hints.json',{meaning:'binary string hints only; neither supported-option proof nor effective lookup trace',names:[...new Set(compiler.match(/(?:SCRIPTC|ZIG)_[A-Z_0-9]+/g)??[])].sort()});
console.log('Read-only inventories and discovery retained. No compilation or guest launch.');
