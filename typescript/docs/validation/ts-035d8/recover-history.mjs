import './capture-history.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here='docs/validation/ts-035d8',hash=b=>createHash('sha256').update(b).digest('hex');
process.env.D8_STAGE='restoration-recovery';
const inventory=JSON.parse(readFileSync(here+'/historical-inventory.json')),recovered=[];
for(const row of inventory){
 if(existsSync(row.path)&&hash(readFileSync(row.path))===row.sha256)continue;
 const base=execFileSync('git',['show','ff2117e:typescript/'+row.path],{maxBuffer:128*1024*1024});
 const candidates=[base,Buffer.from(base.toString().replaceAll('\r\n','\n').replaceAll('\n','\r\n'))];
 const exact=candidates.find(b=>hash(b)===row.sha256);assert(exact,'No byte-exact historical recovery: '+row.path);
 writeFileSync(row.path,exact);assert.equal(hash(readFileSync(row.path)),row.sha256);recovered.push(row.path);
}
for(const row of inventory)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
writeFileSync(here+'/restoration.json',JSON.stringify({files:inventory.length,allBytesRestored:true,recoveredFromGitWithExactSavedHash:recovered},null,2)+'\n');
console.log(JSON.stringify({files:inventory.length,recovered,allBytesRestored:true}));
