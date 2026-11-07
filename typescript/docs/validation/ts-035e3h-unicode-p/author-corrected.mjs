import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),old=resolve(here,'../ts-035e3h-runtime-exec'),base='659faeb7c7c94681bab19f576c7fae6276c6b86a';
const hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{cwd:repo,maxBuffer:20000000}).toString();
const write=(p,s)=>(fs.existsSync(join(here,p)) ? (fs.readFileSync(join(here,p)).equals(Buffer.from(s)) ? undefined : (()=>{throw Error('existing mismatch '+p)})()) : fs.writeFileSync(join(here,p),s,{flag:'wx'})),json=(p,o)=>write(p,JSON.stringify(o,null,2)+'\n');
const prior=git('show',base+':typescript/TASKS.md');
const entry='\n### TS-035E3h unicode-P — offline localization and separate diagnostic design\n\nStatus: offline design complete; stopped for actual/root/second review. Sole writer chat 01a1afd0-5fa8-73b2-98a9-d887c42b9aee; base '+base+'. Own only docs/validation/ts-035e3h-unicode-p/ and this entry. Pinned Newtonsoft source provides matching replacement mechanism, installed dependency metadata is not binary/source binding; intermediate PowerShell strings remain unmeasured. Exact source trace and independently authored diagnostic literals frozen; diagnostic source remains txt, execution unauthorized. No production fix, oracle normalization, retry, fixedroot reuse, diagnostic/PowerShell/API/Add-Type/compiler/helper/recorder/linker execution or binary loading/reflection. Preserve failed observation, raw bytes, all history/seals; COORDINATION root-owned. No compatibility/provenance authority.\n';
write('prior-tasks.md',prior);write('task-entry.txt',entry);fs.writeFileSync(join(repo,'typescript/TASKS.md'),prior+entry);
write('.gitattributes','* -text\n');
const rows=git('ls-tree','-rz',base).split('\0').filter(Boolean).map(r=>{const [h,path]=r.split('\t'),[mode,type,gitOid]=h.split(' ');if(type!=='blob')throw Error(type);return {path,mode,gitOid};}).filter(r=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(r.path)).map(r=>{const b=fs.readFileSync(join(repo,r.path));return {...r,bytes:b.length,sha256:hash(b)};});
json('preservation.json',{base,rows});
fs.mkdirSync(join(here,'_preserve'),{recursive:true});
write('guard-tasks.md',fs.readFileSync(join(old,'prior-tasks.md'),'utf8')+fs.readFileSync(join(old,'task-entry.txt'),'utf8'));
const changes=[];
for(const [src,name,top] of [[join(old,'verify.mjs'),'runtime-observation-guard.mjs',true],...fs.readdirSync(join(old,'_preserve')).filter(n=>n.endsWith('.mjs')).map(n=>[join(old,'_preserve',n),n,false])]){
 const b=fs.readFileSync(src);let s=b.toString();const replacements=[];
 const replace=(a,z,required=true)=>{const count=s.split(a).length-1;if(required&&!count)throw Error(a);if(count){replacements.push({old:a,next:z,count,all:true});s=s.replaceAll(a,z);}};
 replace('import.meta.dirname',`resolve(import.meta.dirname,'../../ts-035e3h-runtime-exec${top?'':'/_preserve'}')`);
 replace("p==='typescript/TASKS.md'","p.startsWith('typescript/docs/validation/ts-035e3h-unicode-p/')||p==='typescript/TASKS.md'",false);
 if(top){replace("join(repo,'typescript/TASKS.md')","join(import.meta.dirname,'../guard-tasks.md')");replace("'./_preserve/readiness-guard.mjs'","'./readiness-guard.mjs'");replace("'./check-observation.mjs'","'../../ts-035e3h-runtime-exec/check-observation.mjs'");}
 write('_preserve/'+name,s);changes.push({name,source:relative(repo,src).replaceAll('\\','/'),sourceBytes:b.length,sourceSha256:hash(b),replacements,bytes:Buffer.byteLength(s),sha256:hash(s)});
}
json('guard-transformations.json',changes);
const runtime=join(repo,'typescript/build/ts035e3h-link-command-observation');
const config=fs.readFileSync(join(runtime,'inputs.json'));const cfg=JSON.parse(config);
const hex=s=>Array.from({length:s.length},(_,i)=>s.charCodeAt(i).toString(16).padStart(4,'0')).join('');
const identities=[];for(const p of [join(runtime,'inputs.json'),join(runtime,'supervise.ps1'),join(runtime,'supervisor.cs'),join(repo,'typescript/docs/validation/ts-035e3h-capture-p/recorder.cs.txt'),'C:/Users/jonku/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.deps.json']){const b=fs.readFileSync(p);identities.push({path:p,bytes:b.length,sha256:hash(b)});}
json('read-identities.json',identities);
const deps=JSON.parse(fs.readFileSync(identities.at(-1).path));json('dependency-metadata.json',{source:identities.at(-1),libraries:Object.entries(deps.libraries).filter(([k])=>k==='Newtonsoft.Json/13.0.4'||k==='Microsoft.PowerShell.Commands.Utility/7.6.5'),limitation:'Named manifest metadata only; no assembly loading or proof of executed source revision.'});
json('staged-literals.json',{source:identities[0],asciiEscapeOffsets:[...config.toString().matchAll(/\\u(?:d800|dc00)/g)].map(m=>({byteOffset:Buffer.byteLength(config.toString().slice(0,m.index)),literal:m[0]})),argv:cfg.argv.map((s,index)=>({index,units:hex(s)})),environmentValue:{name:'RIFT_UNITS',units:hex(cfg.childEnvironment.RIFT_UNITS)},decoder:'Node JSON parsing is an offline aid, not a measurement of PowerShell ConvertFrom-Json.'});
write('measured-differences.json',fs.readFileSync(join(old,'field-differences.json')));
console.log(JSON.stringify({claimed:here,baseline:rows.length,guards:changes.length}));
