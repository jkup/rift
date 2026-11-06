import {readFileSync as read,writeFileSync as write,readdirSync as ls,statSync as stat} from 'node:fs';
import {resolve,relative,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),repo=dirname(root);
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>write(join(here,n),JSON.stringify(v,null,2)+'\n');
function tree(d){return ls(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(join(d,e.name)):e.isFile()?[join(d,e.name)]:[]).sort();}
function member(p,base=root){const b=read(p);return {path:relative(base,p).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};}
const tracked=execFileSync('git',['ls-files','-z'],{cwd:repo,maxBuffer:10000000}).toString().split('\0').filter(Boolean);
const protectedPaths=tracked.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-execution-identity.md'].includes(p)&&!p.startsWith('typescript/docs/validation/ts-035e3e-p/'));
save('preservation.json',protectedPaths.map(p=>member(join(repo,p),repo)));
const source=[...tree(join(root,'src')).filter(p=>p.endsWith('.ts')),join(root,'test/script-observation.ts')].sort();
save('construction-source.json',source.map(p=>member(p)));
const host=tree(join(root,'tools')).filter(p=>p.endsWith('.mjs'));
save('imports.json',[...source,...host].map(p=>({path:relative(root,p).replaceAll('\\','/'),imports:[...read(p,'utf8').matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)/g)].map(m=>m[1]),dynamicImportSyntax:/\bimport\s*\(/.test(read(p,'utf8'))})));
const groups={source:source.map(p=>member(p)),adapterAndTests:host.map(p=>member(p)),configuration:['package.json','package-lock.json','tsconfig.json'].map(p=>member(join(root,p))),fixtures:['test/fixtures/harness-bundle','test/fixtures/script-observation'].flatMap(d=>tree(join(root,d)).map(p=>member(p))),installedPackages:['scriptc','@scriptc','typescript','@typescript','@types','undici-types','yaml'].flatMap(d=>tree(join(root,'node_modules',d)).map(p=>member(p)))};
save('closure-inventory.json',groups);
const accepted=join(root,'docs/validation/ts-035e3d');
save('accepted-evidence.json',['generated-closure.json','copied-inputs.json','complete-artifact-index.json','completion.json','run-location.json','prepare.mjs','run.mjs'].map(p=>member(join(accepted,p))));
const data=JSON.parse(read(join(accepted,'generated-closure.json')));
save('build-evidence-shape.json',{generatedKeys:Object.keys(data),generatedCounts:Object.fromEntries(Object.entries(data).filter(([k,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),claim:'Retained accepted evidence only; no new build or source-to-binary certification.'});
console.log(JSON.stringify({protected:protectedPaths.length,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))}));
