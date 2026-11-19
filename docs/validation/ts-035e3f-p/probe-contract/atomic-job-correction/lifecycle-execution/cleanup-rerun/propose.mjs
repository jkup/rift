// Offline authoring only; retain preserve.mjs's failed CRLF assumption unchanged.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const here=import.meta.dirname,base=resolve(here,'../..');
const initial=JSON.parse(readFileSync(join(here,'checkpoint-replacement.json')));
const changes=[];
for(const name of initial.files){
 const source=readFileSync(name==='test-hooks.cs'?join(base,name):join(here,'reviewed-inputs',name),'utf8');
 const old=initial.old.replaceAll('\r\n','\n'),next=initial.next.replaceAll('\r\n','\n');
 assert.equal(source.split(old).length,2,name);
 writeFileSync(join(here,'proposed-'+name),source.replace(old,next),{flag:'wx'});
 changes.push({name,old,next});
}
writeFileSync(join(here,'checkpoint-replacement-final.json'),JSON.stringify({compiled:false,executed:false,changes},null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'offline-authoring-error.json'),JSON.stringify({script:'preserve.mjs',exitCode:1,error:'AssertionError [ERR_ASSERTION]: test-hooks.cs; 1 !== 2',cause:'CRLF assumption in proposed replacement; original hook segment uses LF',retained:['preserve.mjs','checkpoint-replacement.json'],effect:'Archive and outcome files completed before source proposal assertion; no C# or lifecycle execution. propose.mjs authors the exact LF source replacement separately.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({exactSourceProposals:3,compiled:0,executed:0}));
