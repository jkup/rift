import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {inspectCoff} from './reader.mjs';
const rows=[];function test(name,fn){fn();rows.push(name);}
const header=(size,sections,offset=0,slots=0)=>{const b=Buffer.alloc(size);b.writeUInt16LE(34404);b.writeUInt16LE(sections,2);b.writeUInt32LE(offset,8);b.writeUInt32LE(slots,12);return b;};
test('4096-sections-exact',()=>{const r=inspectCoff(header(20+4096*40,4096));assert.equal(r.kind,'inventory');assert.equal(r.sections.length,4096);});
test('262144-slots-including-auxiliary-exact',()=>{
 const end=20+262144*18,b=header(end+4,0,20,262144);b.writeUInt32LE(4,end);
 for(let slot=0;slot<262144;slot+=256){const p=20+slot*18;b.write('.file',p);b.writeInt16LE(-2,p+12);b[p+16]=103;b[p+17]=255;}
 const r=inspectCoff(b);assert.equal(r.kind,'inventory');assert.equal(r.symbols.length,1024);assert.equal(r.symbols.at(-1).auxiliary.at(-1).slot,262143);
});
function relocations(last){
 const counts=[65535,65535,65535,65535,last],b=header(240+counts.reduce((n,x)=>n+x,0)*10,5);let cursor=240;
 counts.forEach((count,i)=>{const p=20+i*40;b.write('.x',p);b.writeUInt32LE(4,p+16);b.writeUInt32LE(220+i*4,p+20);b.writeUInt32LE(cursor,p+24);b.writeUInt16LE(count,p+32);cursor+=count*10;});return b;
}
test('262144-relocations-exact',()=>{const r=inspectCoff(relocations(4));assert.equal(r.kind,'inventory');assert.equal(r.sections.reduce((n,s)=>n+s.relocations.length,0),262144);});
test('262145-relocations-rejected-before-allocation',()=>assert.deepEqual(inspectCoff(relocations(5)).error,{code:'RELOCATION_LIMIT',offset:212}));
for(const size of [1048576,1048577])test('directive-bytes-'+size,()=>{const b=header(60+size,1);b.write('.drectve',20);b.writeUInt32LE(size,36);b.writeUInt32LE(60,40);const r=inspectCoff(b);if(size===1048576){assert.equal(r.kind,'inventory');assert.equal(r.directives[0].hex.length,2097152);}else assert.deepEqual(r.error,{code:'DIRECTIVE_LIMIT',offset:36});});
const fixtures=JSON.parse(readFileSync(join(import.meta.dirname,'../ts-035e3g-p/correction-1/fixtures.json'))).cases;
test('4096-name-bytes-exact',()=>{const b=Buffer.from(fixtures.find(x=>x.id==='resolved-name-limit').bytesHex,'hex');b[4138]=0;const r=inspectCoff(b);assert.equal(r.kind,'inventory');assert.equal(r.symbols[0].name.bytesHex.length,8192);});
test('4194304-total-name-bytes-exact',()=>{const b=Buffer.from(fixtures.find(x=>x.id==='aggregate-name-limit').bytesHex,'hex');b.writeUInt32LE(4100,18456);const r=inspectCoff(b);assert.equal(r.kind,'inventory');assert.equal(r.symbols.at(-1).name.bytesHex,'');assert.equal(r.symbols.reduce((n,s)=>n+s.name.bytesHex.length/2,0),4194304);});
writeFileSync(process.argv[2],JSON.stringify({status:'passed',boundaries:rows,realObjectsInterpreted:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({boundaries:rows.length,status:'passed'}));
