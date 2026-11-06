import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const here=resolve(import.meta.dirname,'decimal-proposal');mkdirSync(here);
const original=readFileSync(resolve(import.meta.dirname,'../ts-035e3b-p/proposals/script-producer-request.ts'),'utf8');
const before='    need(text.length > 0, "limit");',after='    if (text.length === 0) throw new Error("script-producer/limit");';
assert.equal(original.split(before).length,2);
const candidate=original.replace(before,after);
writeFileSync(resolve(here,'script-producer-request.ts'),candidate,{flag:'wx'});
const hash=b=>createHash('sha256').update(b).digest('hex');
writeFileSync(resolve(here,'manifest.json'),JSON.stringify({status:'unapplied partial proposal; key enumeration remains unresolved',path:'typescript/src/script-producer-request.ts',before:hash(original),after:hash(candidate),replacement:{before,after}},null,2)+'\n',{flag:'wx'});
const start=candidate.indexOf('function decimal('),end=candidate.indexOf('// Typed ordinary host data');
const decimal=candidate.slice(start,end);
writeFileSync(resolve(here,'decimal.ts'),'function need(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }\n'+decimal.replace('function decimal','export function decimal'),{flag:'wx'});
writeFileSync(resolve(here,'driver.ts'),`import { decimal } from "./decimal.js";
try { console.log("value:" + decimal(process.argv[2])); }
catch (error) { if (error instanceof Error) console.log("error:" + error.message); else throw error; }
`,{flag:'wx'});
const rows=[];
function add(text,expected,label){rows.push({id:label,text,expected});}
const max=9007199254740991n;
for(const n of [0n,1n,9n,10n,99n,100n,100000n,2147483647n,2147483648n,...Array.from({length:33},(_,i)=>max+BigInt(i)-16n)]){
 for(const zeroes of [0,1,32]){const s='0'.repeat(zeroes)+String(n);add(s,n<=max?'value:'+String(n):'error:script-producer/limit','boundary/'+n+'/'+zeroes);}
}
for(const s of ['',' ',' 1','1 ','+1','-0','-1','1.0','1e0','0x1','0b1','1_0','NaN','Infinity','\t1','1\n','１','١','\u0000','0/','9:', '9007199254740991x'])add(s,'error:script-producer/limit','invalid/'+JSON.stringify(s));
for(const n of [0n,1n,max,max+1n])add('0'.repeat(10000)+String(n),n<=max?'value:'+String(n):'error:script-producer/limit','long-zero/'+n);
add('9'.repeat(1000),'error:script-producer/limit','overflow/1000');
// NUL cannot travel in OS argv; its expectation is exercised in the pure module.
writeFileSync(resolve(here,'decimal-literals.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,before:hash(original),after:hash(candidate)}));
