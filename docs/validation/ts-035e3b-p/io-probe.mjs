import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=mkdtempSync(fileURLToPath(new URL('io-',import.meta.url))),path=resolve(out,'existing.json');
writeFileSync(path,'original',{encoding:'utf8',flag:'wx'});let error;
try{writeFileSync(path,'replacement',{encoding:'utf8',flag:'wx'});}catch(e){error={code:e.code,syscall:e.syscall};}
assert.equal(error.code,'EEXIST');assert.equal(readFileSync(path,'utf8'),'original');
const hash=x=>createHash('sha256').update(x).digest('hex');
const chunks=[Buffer.from('abcd'),Buffer.from('efgh'),Buffer.from('ij')],all=Buffer.concat(chunks),retained=Buffer.concat(chunks.slice(0,2));
assert.notEqual(hash(all),hash(retained));
const result={exclusiveOutput:{path,error,bytes:'original'},streamingIllustration:{claim:'offline arithmetic example of unchanged C capture rule; not transport evidence',limit:5,chunks:chunks.map(b=>b.toString()),totalBytes:10,retainedBytes:8,firstCapCount:8,streamingSha256:hash(all),retainedSha256:hash(retained)}};
writeFileSync(resolve(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,...result}));
