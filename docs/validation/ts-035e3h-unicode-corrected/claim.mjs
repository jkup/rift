import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),old=resolve(here,'../ts-035e3h-unicode-inert'),base='97e6d6623e7d89ead0cff3f12f7c89690f4518c0',hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{cwd:repo,maxBuffer:20000000}).toString(),write=(n,b)=>fs.writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,o)=>write(n,JSON.stringify(o,null,2)+'\n');
const prior=git('show',base+':typescript/TASKS.md'),entry='\n### TS-035E3h unicode corrected — bounded inert correction\n\nStatus: claimed for bounded inert correction of teardown, descriptor finalization and inventory; sole writer chat 01a1afd0-5fa8-73b2-98a9-d887c42b9aee; base '+base+'. Own only docs/validation/ts-035e3h-unicode-corrected/ and this entry. Preserve rejected97e6d662 and all old bytes. Freeze explicit cap/inventory/startup-cache amendments; diagnostic source/input/stdout/ten-env/tool/5s+5s unchanged. Gate remains false; synthetic transport and separate filesystem fixtures only. No diagnostic or child execution, fixedroot reservation/materialization, PowerShell/API/Add-Type/helper/compiler/recorder/linker, scans, binary loading/reflection, fix or oracle normalization. Stop actual/root/second before readiness/execution; COORDINATION root-owned.\n';
write('prior-tasks.md',prior);write('task-entry.txt',entry);fs.writeFileSync(join(repo,'typescript/TASKS.md'),prior+entry);write('.gitattributes','* -text\n');
const rows=git('ls-tree','-rz',base).split('\0').filter(Boolean).map(r=>{const [h,path]=r.split('\t'),[mode,type,gitOid]=h.split(' ');if(type!=='blob')throw Error(type);return {path,mode,gitOid};}).filter(r=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(r.path)).map(r=>{const b=fs.readFileSync(join(repo,r.path));return {...r,bytes:b.length,sha256:hash(b)};});json('preservation.json',{base,rows});
fs.mkdirSync(join(here,'_preserve'));write('guard-tasks.md',fs.readFileSync(join(old,'prior-tasks.md'),'utf8')+fs.readFileSync(join(old,'task-entry.txt'),'utf8'));
const changes=[];
for(const [src,name,top] of [[join(old,'verify.mjs'),'rejected-inert-guard.mjs',true],...fs.readdirSync(join(old,'_preserve')).filter(n=>n.endsWith('.mjs')).map(n=>[join(old,'_preserve',n),n,false])]){
 const b=fs.readFileSync(src);let s=b.toString();const replacements=[];
 const replace=(a,z,required=true)=>{const count=s.split(a).length-1;if(required&&!count)throw Error(a);if(count){replacements.push({old:a,next:z,count,all:true});s=s.replaceAll(a,z);}};
 replace('import.meta.dirname',`resolve(import.meta.dirname,'../../ts-035e3h-unicode-inert${top?'':'/_preserve'}')`);
 replace("p==='typescript/TASKS.md'","p.startsWith('typescript/docs/validation/ts-035e3h-unicode-corrected/')||p==='typescript/TASKS.md'",false);
 if(top){replace("join(repo,'typescript/TASKS.md')","join(import.meta.dirname,'../guard-tasks.md')");replace("'./_preserve/unicode-design-guard.mjs'","'./unicode-design-guard.mjs'");replace("'./check-inert.mjs'","'../../ts-035e3h-unicode-inert/check-inert.mjs'");}
 write('_preserve/'+name,s);changes.push({name,source:relative(repo,src).replaceAll('\\','/'),sourceBytes:b.length,sourceSha256:hash(b),replacements,bytes:Buffer.byteLength(s),sha256:hash(s)});
}json('guard-transformations.json',changes);
console.log(JSON.stringify({claimed:true,baseline:rows.length,guards:changes.length}));
