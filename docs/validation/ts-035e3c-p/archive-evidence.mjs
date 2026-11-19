import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=fileURLToPath(new URL('./',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex'),rows=[];
for(const dir of readdirSync(here).filter(n=>/^(run|context)-/.test(n))){
 const files=dir.startsWith('run-')&&existsSync(resolve(here,dir,'results'))?readdirSync(resolve(here,dir,'results')).filter(n=>n.endsWith('.json')).map(n=>dir+'/results/'+n):existsSync(resolve(here,dir,'results.json'))?[dir+'/results.json']:[];
 for(const path of files){
  const bytes=readFileSync(resolve(here,path)),compressed=gzipSync(bytes);
  if(!existsSync(resolve(here,path+'.gz')))writeFileSync(resolve(here,path+'.gz'),compressed,{flag:'wx'});
  const retained=readFileSync(resolve(here,path+'.gz'));assert.deepEqual(gunzipSync(retained),bytes);
  rows.push({path:path+'.gz',sha256:hash(retained),originalPath:path,originalSha256:hash(bytes),originalBytes:bytes.length,compressedBytes:retained.length});
 }
}
writeFileSync(resolve(here,'compressed-evidence.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({compressed:rows.length,originalBytes:rows.reduce((n,r)=>n+r.originalBytes,0)}));
