import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const here=new URL('./',import.meta.url);
const {sandbox}=JSON.parse(readFileSync(new URL('run-location.json',here)));
const rows=JSON.parse(readFileSync(join(sandbox,'test/fixtures/script-observation-serialization/frozen.json')));
const results=[];
for(const lane of ['node','native'])for(const input of ['alpha','beta']){
 const binary=lane==='node'?process.execPath:join(sandbox,'build/native/script-observation-serialization.exe');
 const args=lane==='node'?['build/node/test/script-observation-serialization.js']:[];
 args.push('test/fixtures/script-observation-serialization/'+input+'.txt');
 const started=new Date().toISOString();const r=spawnSync(binary,args,{cwd:sandbox,timeout:30000,maxBuffer:4e6});
 assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);
 const name='serializer-'+lane+'-'+input;
 writeFileSync(new URL(name+'.stdout.txt',here),r.stdout);writeFileSync(new URL(name+'.stderr.txt',here),r.stderr);
 const lines=r.stdout.toString().replaceAll('\r\n','\n').split('\n');assert.equal(lines.pop(),'');
 const expected=rows.filter(row=>row.binding.nonce===input);assert.deepEqual(lines,expected.map(row=>row.ascii));
 results.push({lane,input,started,binary,args,cwd:sandbox,status:r.status,signal:r.signal,records:lines.length,stdoutSha256:createHash('sha256').update(r.stdout).digest('hex')});
}
writeFileSync(new URL('serializer-results.json',here),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.map(({lane,input,records,status})=>({lane,input,records,status}))));
