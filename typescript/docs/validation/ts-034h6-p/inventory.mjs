import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root=resolve(import.meta.dirname,'../../..'), repo=resolve(root,'..');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const names=new Set(['failure','resourceFailure','unsupportedFailure','toNumber','toString','toUint32','toIntegerOrInfinity','toLength','thisNumberValue','thisStringValue','thisBooleanValue','thisSymbolValue','createMutableBinding','internalGet','internalSet','defineOwnProperty','bootstrapDefineOwnProperty','internalHasProperty','internalDelete','getBindingValue','setMutableBinding','getValue','putValue','toPrimitive','toObject','toPropertyKey','deleteReference','getScriptBinding','putScriptBinding','getStrictGlobalBinding','putStrictGlobalBinding','projectThrow','display']);
const rows=[], files=[];
for(const p of [...walk(join(root,'src')),...walk(join(root,'test'))].filter(p=>p.endsWith('.ts')).sort()){
 const text=readFileSync(p,'utf8'), path=relative(repo,p).replaceAll('\\','/');
 files.push({path,sha256:createHash('sha256').update(text).digest('hex')});
 let owner='<module/callback>';
 text.split(/\r?\n/).forEach((line,i)=>{
  const declaration=/^\s*(?:(?:export|private|protected|public|override|static|async)\s+)*(?:function\s+)?([#\w]+)\s*\([^;]*\)\s*(?::[^=]+)?\s*\{/.exec(line);
  if(declaration&&!['if','for','while','switch','catch'].includes(declaration[1]))owner=declaration[1];
  for(const name of names)if(new RegExp('\\b'+name+'\\s*\\(').test(line))rows.push({path,line:i+1,category:declaration?.[1]===name?'definition/override':'call-or-inline-definition',name,ownerHint:owner,text:line.trim()});
  if(/throw new |throw [a-zA-Z]\w*;/.test(line))rows.push({path,line:i+1,category:'host-fault',name:'host-throw',ownerHint:owner,text:line.trim()});
  if(/diagnostic:|origin:|engine-diagnostic|constructorSlot|OperationContext/.test(line))rows.push({path,line:i+1,category:'context-record-observer',name:'record',ownerHint:owner,text:line.trim()});
 });}
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const output={base:git('rev-parse','HEAD'),branch:git('branch','--show-current'),description:'Line-complete call/override inventory (ownerHint is lexical, not an AST claim); host faults and explicit diagnostic records separate. Source is evidence, not change authorization.',files,rows};
writeFileSync(join(import.meta.dirname,'inventory.json'),JSON.stringify(output,null,2)+'\n');
const selected=rows.filter(r=>r.path.includes('/src/')&&r.name==='failure'&&r.category==='call-or-inline-definition');
writeFileSync(join(import.meta.dirname,'producer-index.md'),'# Actual failure callsites at '+output.base+'\n\n'+selected.map(r=>`- \`${r.path}:${r.line}\` — \`${r.ownerHint}\`: \`${r.text.replaceAll('\n',' ').replaceAll('\r','')}\``).join('\n')+'\n');
console.log(JSON.stringify({files:files.length,rows:rows.length,productionFailureCalls:selected.length}));
