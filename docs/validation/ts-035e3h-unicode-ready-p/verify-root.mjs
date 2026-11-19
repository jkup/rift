import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const here=import.meta.dirname;
const repo=path.resolve(here,'../../../..');
const base='ec63ebee1e77c818b405ed9f546cbbfacae187ab';
const packagePath='typescript/docs/validation/ts-035e3h-unicode-ready-p/';
const allowed=new Set(['Claude Roadmap.md','typescript/TASKS.md']);
const expectedFiles=[
  'README.md','check-attempt-1.json','check-attempt-2.json','check-proposal.mjs',
  'child-contract.json.txt','enabled-bindings-row.json','enabled-bindings.json.txt',
  'enabled-entry-row.json','enabled-entry.mjs.txt','entry-transform.json',
  'future-invocation.json','materialization.json','proposal.json','verify-root.mjs'
].sort();
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:repo,maxBuffer:4_000_000}).toString();
const changed=git('diff','--name-only',base).trim().split(/\r?\n/).filter(Boolean);
assert(changed.length>0);
for(const name of changed)assert(allowed.has(name)||name.startsWith(packagePath),name);
const numstat=git('diff','--numstat',base,'--','typescript/TASKS.md').trim();
assert.match(numstat,/^4\s+0\s+typescript\/TASKS\.md$/);
const roadmapStat=git('diff','--numstat',base,'--','Claude Roadmap.md').trim();
assert.match(roadmapStat,/^10\s+0\s+Claude Roadmap\.md$/);
const untracked=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean);
for(const name of untracked)assert(name.startsWith(packagePath),name);
const tree=git('ls-tree','-r','--name-only','-z',base).split('\0').filter(Boolean);
assert.equal(tree.length,13913,'accepted baseline tracked-file count');

const found=[];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const file=path.join(dir,name),stat=fs.lstatSync(file);
    assert(!stat.isSymbolicLink(),file);
    if(stat.isDirectory())walk(file);
    else {assert(stat.isFile(),file);assert.equal(stat.nlink,1,file);found.push(path.relative(here,file).replaceAll('\\','/'));}
  }
}
walk(here);
assert.deepEqual(found.sort(),expectedFiles);
for(const root of [
  'C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-unicode-runner-1',
  'C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-unicode-diagnostic-1'
])assert.throws(()=>fs.lstatSync(root),e=>e.code==='ENOENT');
execFileSync(process.execPath,[path.join(here,'check-proposal.mjs')],{cwd:repo,stdio:'inherit'});
console.log(JSON.stringify({base,baselineTrackedFiles:tree.length,allowedTrackedChanges:changed.length,packageFiles:found.length,bothRootsAbsent:true,oldSealsChanged:false,passed:true}));
