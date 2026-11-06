// Deterministic filesystem interleavings, NOT a build-owner implementation.
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,existsSync,linkSync,symlinkSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
const here=import.meta.dirname, out=mkdtempSync(join(here,'uncertainty-'));
const expected=JSON.parse(readFileSync(join(here,'uncertainty-literals.json'))), results=[];
const read=p=>readFileSync(p,'utf8'), fresh=(n,text)=>{const p=join(out,n);writeFileSync(p,text,{flag:'wx'});return p;};
const error=fn=>{try{fn();return null;}catch(e){return e.code??e.name;}};
try {
 const p=fresh('copy-source.txt','original\n'), before=read(p);
 writeFileSync(p,'replacement\n');const copied=read(p);fresh('captured.txt',copied);writeFileSync(p,'original\n');const after=read(p);
 results.push({case:'source-ABA-during-copy',before,copied,after,endpointEqual:before===after,copyEqualsBefore:copied===before});
 const q=fresh('build-input.txt','original\n'),sealed=read(q);
 writeFileSync(q,'replacement\n');const consumed=read(q);writeFileSync(q,'original\n');const after2=read(q);
 results.push({case:'input-ABA-during-consumption',sealed,consumed,after:after2,endpointEqual:sealed===after2,consumedEqualsSealed:consumed===sealed});
 const lock=join(out,'owner');mkdirSync(lock);const second=error(()=>mkdirSync(lock));writeFileSync(q,'replacement\n');
 results.push({case:'exclusive-owner-is-cooperative',first:'acquired',second,outsideWriter:read(q),ownerStillPresent:existsSync(lock)});
 const r=fresh('partial.json','{"version":'),partial=read(r),secondWrite=error(()=>writeFileSync(r,'{}',{flag:'wx'}));
 results.push({case:'wx-is-not-complete-publication',partial,second:secondWrite,originalPreserved:read(r)===partial,parse:error(()=>JSON.parse(read(r)))});
 const original=fresh('original.txt','original\n'),alias=join(out,'alias.txt');linkSync(original,alias);const a=lstatSync(original),b=lstatSync(alias);
 results.push({case:'hardlink-alias',original:read(original),alias:read(alias),sameIdentity:a.dev===b.dev&&a.ino===b.ino,originalLinks:a.nlink,aliasLinks:b.nlink});
 const target=join(out,'target'),junction=join(out,'junction');mkdirSync(target);fresh('target/leaf.txt','original\n');symlinkSync(target,junction,'junction');const leaf=join(junction,'leaf.txt');
 results.push({case:'ancestor-junction',throughAlias:read(leaf),ancestorIsLink:lstatSync(junction).isSymbolicLink(),leafIsLink:lstatSync(leaf).isSymbolicLink(),realpathEqualsSpelling:realpathSync(leaf)===resolve(leaf)});
 assert.deepEqual(results,expected);
 // Oracle sensitivity only: every completed trace field is removed and altered.
 // These are data mutations, never actual source mutants or owner rejection tests.
 const mutations=[];
 for(let i=0;i<expected.length;i++)for(const key of Object.keys(expected[i]))for(const mode of ['omit','change']){
   const changed=structuredClone(results);if(mode==='omit')delete changed[i][key];else changed[i][key]=null;
   let rejected=false;try{assert.deepEqual(changed,expected);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;rejected=true;}
   assert(rejected);mutations.push({case:expected[i].case,key,mode,result:'whole-literal-difference'});
 }
 writeFileSync(join(out,'results.json'),JSON.stringify({kind:'filesystem-uncertainty-not-build-validation',results,mutations},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({directory:out,cases:results.length,oracleDataMutations:mutations.length}));
}catch(e){writeFileSync(join(out,'failure.json'),JSON.stringify({results,error:{name:e.name,code:e.code,message:e.message,stack:e.stack}},null,2)+'\n',{flag:'wx'});throw e;}
