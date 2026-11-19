import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const cwd='C:/Users/jonku/code/scriptc';
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'});
const head=git('rev-parse','HEAD').trim();
if(head!=='6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff')throw Error('wrong pinned source');
const selections={
 'packages/compiler/src/ir/ir.ts':[[290,315],[3220,3250]],
 'packages/compiler/src/ir/validate.ts':[[2860,2885]],
 'packages/compiler/src/backend/llvm/expr-calls.ts':[[855,1025]],
 'packages/runtime/src/scr_closure.h':[[1,110]],
 'packages/compiler/src/frontend/lowering/class-protocols.ts':[[95,200]],
 'packages/compiler/src/frontend/type-mapper.ts':[[8745,8770],[8800,8860]],
 'packages/compiler/src/frontend/lowering/coercions/structural.ts':[[1,45]],
 'packages/compiler/src/frontend/lowering/coercions/structural-plans.ts':[[560,610]],
 'packages/compiler/src/frontend/lowering/lower-calls.ts':[[10110,10155],[10585,10635]],
 'packages/compiler/src/frontend/lowering/class-attributes.ts':[[29,40],[89,155]],
 'packages/compiler/src/ir/tiers.ts':[[85,125]],
 'packages/runtime/src/scr_json.c':[[3160,3195]],
};
const files=Object.entries(selections).map(([path,ranges])=>{
 const content=git('show',`HEAD:${path}`),lines=content.split('\n');
 return {path,sha256:createHash('sha256').update(content).digest('hex'),excerpts:ranges.map(([start,end])=>({start,end,text:lines.slice(start-1,end).join('\n')}))};
});
writeFileSync(new URL('source-evidence.json',import.meta.url),JSON.stringify({repository:git('remote','get-url','origin').trim(),head,status:git('status','--porcelain'),files},null,2)+'\n');
console.log(`Captured ${files.length} pinned source files; checkout status ${JSON.stringify(git('status','--porcelain'))}`);
