// Author the exact amendment without importing or invoking the amended runner.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,prior=resolve(here,'..'),repo=resolve(here,...Array(14).fill('..'));
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n'),rows=[];
function save(name,replacements=[]){const source=join(prior,name),before=read(source);let s=before.toString();for(const x of replacements){assert.equal(s.split(x.old).length,2,name+' '+x.old);s=s.replace(x.old,x.next);}const b=Buffer.from(s);write(name,b);rows.push({name,source:relative(repo,source).replaceAll('\\','/'),sourceBytes:before.length,sourceSha256:hash(before),bytes:b.length,sha256:hash(b),replacements});}
const original=join(repo,'typescript/docs/validation/ts-035e3f-p');
save('runner.mjs',[
 {old:"import assert from 'node:assert/strict';",next:"import assert from 'node:assert/strict';\nimport {observeCmdIdentity,validateCmdIdentity} from './cmd-identity.mjs';"},
 {old:'prior=resolve(here,'+JSON.stringify(relative(prior,original).replaceAll('\\','/'))+')',next:'prior=resolve(here,'+JSON.stringify(relative(here,original).replaceAll('\\','/'))+')'},
 {old:'let before,zigBefore,projectBefore,rootBefore;',next:'let before,zigBefore,projectBefore,rootBefore,cmdBefore;'},
 {old:'      const tools=[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.cmd,c.cmdSha256),identity(c.zig,c.zigSha256)];',next:"      cmdBefore=observeCmdIdentity();save(join(c.root,'cmd-before.json'),cmdBefore);validateCmdIdentity(cmdBefore,c.cmd,c.cmdSha256);\n      const tools=[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.zig,c.zigSha256)];"},
 {old:"      ['tools-after',()=>save(join(c.root,'tools-after.json'),[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.cmd,c.cmdSha256),identity(c.zig,c.zigSha256)])],",next:"      ['cmd-after',()=>{const after=observeCmdIdentity();save(join(c.root,'cmd-after.json'),after);validateCmdIdentity(after,c.cmd,c.cmdSha256);if(cmdBefore)assert.deepEqual(after,cmdBefore,'cmd identity drift');}],\n      ['tools-after',()=>save(join(c.root,'tools-after.json'),[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.zig,c.zigSha256)])],"}
]);
for(const name of ['supervisor.cs','supervise.ps1','contract.json','expected-plan.json'])save(name);
json('transformations.json',{base:'e37d0497ab2d6e5f3713e0f88e257d870c13740e',rows});
write('prior-design.md',read(join(repo,'typescript/docs/script-build-provenance.md')));const p=join(prior,'manifest.json'),b=read(p);json('prior-manifest.json',{path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});
console.log(JSON.stringify({files:rows.length,changedFiles:1,genericExactUnchanged:true,runInvocations:0}));
