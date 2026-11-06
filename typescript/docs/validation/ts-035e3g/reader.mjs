import {createHash} from 'node:crypto';
import {types} from 'node:util';

export const LIMITS=Object.freeze({inputBytes:16777216,sections:4096,symbolSlots:262144,relocations:262144,stringBytes:1048576,nameBytes:4096,directiveBytes:1048576,totalResolvedNameBytes:4194304,serializedObjectBytes:134217728});
export const sha256=b=>createHash('sha256').update(b).digest('hex');
const typed=Object.getPrototypeOf(Uint8Array.prototype);
const getter=name=>Object.getOwnPropertyDescriptor(typed,name).get;
const getBuffer=getter('buffer'),getLength=getter('byteLength'),getOffset=getter('byteOffset');
const resizable=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable').get;
const detached=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'detached').get;
class Rejection {constructor(code,offset){this.code=code;this.offset=offset;}}
const reject=(code,offset)=>{throw new Rejection(code,offset);};
const rejected=(input,code,offset)=>({kind:'rejected',input,error:{code,offset}});

export function inspectCoff(value){
 // Use intrinsic brand/accessor checks, not properties controlled by the caller.
 if(!types.isUint8Array(value))return rejected(null,'INPUT_TYPE',null);
 const backing=getBuffer.call(value);
 if(types.isSharedArrayBuffer(backing)||resizable.call(backing)||detached.call(backing))return rejected(null,'INPUT_TYPE',null);
 const length=getLength.call(value);
 if(length>LIMITS.inputBytes)return rejected(null,'INPUT_LIMIT',null);
 const b=Buffer.from(new Uint8Array(backing,getOffset.call(value),length));
 const input={bytes:b.length,sha256:sha256(b)};
 try{return readOwned(b,input);}catch(e){if(e instanceof Rejection)return rejected(input,e.code,e.offset);throw e;}
}

function readOwned(b,input){
 const span=(offset,size,code,field)=>{if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(size)||offset<0||size<0||offset>b.length||size>b.length-offset)reject(code,field);};
 if(b.length>=8&&b.subarray(0,8).equals(Buffer.from('!<arch>\n')))reject('UNSUPPORTED_ARCHIVE',0);
 if(b.length>=2&&b[0]===0x4d&&b[1]===0x5a)reject('UNSUPPORTED_IMAGE',0);
 if(b.length>=4&&b[0]===0&&b[1]===0&&b[2]===255&&b[3]===255)reject('UNSUPPORTED_ANONYMOUS',0);
 span(0,20,'TRUNCATED_HEADER',0);
 const u16=p=>b.readUInt16LE(p),u32=p=>b.readUInt32LE(p);
 const header={machine:u16(0),sectionCount:u16(2),timestamp:u32(4),symbolTableOffset:u32(8),symbolSlotCount:u32(12),optionalHeaderBytes:u16(16),characteristics:u16(18)};
 if(header.machine!==34404)reject('UNSUPPORTED_MACHINE',0);
 if(header.optionalHeaderBytes!==0)reject('UNSUPPORTED_OPTIONAL_HEADER',16);
 if(header.sectionCount>LIMITS.sections)reject('SECTION_LIMIT',2);
 if(header.symbolSlotCount>LIMITS.symbolSlots)reject('SYMBOL_LIMIT',12);
 span(20,header.sectionCount*40,'TRUNCATED_SECTIONS',20);
 const occupied=[{start:0,end:20+header.sectionCount*40,kind:0}];
 const occupy=(start,size,kind)=>{if(size)occupied.push({start,end:start+size,kind});};
 const sections=[];let totalRelocations=0;
 for(let i=0;i<header.sectionCount;i++){
  const p=20+i*40;
  const s={index:i+1,name:null,virtualSize:u32(p+8),virtualAddress:u32(p+12),rawSize:u32(p+16),rawOffset:u32(p+20),relocationOffset:u32(p+24),lineOffset:u32(p+28),relocationCount:u16(p+32),lineCount:u16(p+34),characteristics:u32(p+36),rawSha256:null,relocations:[]};
  if(s.lineOffset||s.lineCount)reject('UNSUPPORTED_LINES',p+(s.lineOffset?28:34));
  if(s.characteristics&0x1000000)reject('UNSUPPORTED_RELOCATION_OVERFLOW',p+36);
  if(!s.rawSize&&s.rawOffset)reject('RAW_POINTER',p+20);
  if(s.rawSize&&!s.rawOffset&&!(s.characteristics&128))reject('RAW_POINTER',p+20);
  if(s.rawOffset){span(s.rawOffset,s.rawSize,'TRUNCATED_RAW',p+20);occupy(s.rawOffset,s.rawSize,1);}
  if(s.rawSize&&!s.rawOffset&&s.relocationCount)reject('UNSUPPORTED_BSS_RELOCATIONS',p+32);
  if(Boolean(s.relocationOffset)!==Boolean(s.relocationCount))reject('RELOCATION_POINTER',p+24);
  if(s.relocationCount){span(s.relocationOffset,s.relocationCount*10,'TRUNCATED_RELOCATIONS',p+24);occupy(s.relocationOffset,s.relocationCount*10,2);}
  totalRelocations+=s.relocationCount;if(totalRelocations>LIMITS.relocations)reject('RELOCATION_LIMIT',p+32);
  sections.push(s);
 }
 let stringTable=null;
 if(!header.symbolTableOffset&&header.symbolSlotCount)reject('SYMBOL_POINTER',8);
 if(header.symbolTableOffset){
  const bytes=header.symbolSlotCount*18;span(header.symbolTableOffset,bytes,'TRUNCATED_SYMBOLS',8);occupy(header.symbolTableOffset,bytes,3);
  const offset=header.symbolTableOffset+bytes;span(offset,4,'TRUNCATED_STRINGS',offset);const size=u32(offset);
  if(size<4)reject('STRING_SIZE',offset);if(size>LIMITS.stringBytes)reject('STRING_LIMIT',offset);span(offset,size,'TRUNCATED_STRINGS',offset);occupy(offset,size,4);
  stringTable={offset,bytes:size,sha256:sha256(b.subarray(offset,offset+size))};
 }
 occupied.sort((a,c)=>a.start-c.start||a.end-c.end||a.kind-c.kind);
 let end=0;for(const r of occupied){if(r.start<end)reject('OVERLAP',r.start);end=r.end;}
 let nameBytes=0;
 function name(p,section){
  const field=b.subarray(p,p+8),nul=field.indexOf(0);let start=p,size=nul<0?8:nul,offset=null;
  if(section&&field[0]===47){
   if(nul>=0&&field.subarray(nul).some(x=>x!==0))reject('SECTION_NAME_ENCODING',p);
   const decimal=field.subarray(1,nul<0?8:nul).toString('latin1');
   if(!/^(0|[1-9][0-9]*)$/.test(decimal))reject('SECTION_NAME_ENCODING',p);offset=Number(decimal);
  }else if(!section&&u32(p)===0)offset=u32(p+4);
  else if(nul>=0&&field.subarray(nul).some(x=>x!==0))reject('NAME_PADDING',p);
  if(offset!==null){
   if(!stringTable||offset<4||offset>=stringTable.bytes)reject('NAME_OFFSET',p);
   start=stringTable.offset+offset;const max=stringTable.offset+stringTable.bytes;
   // indexOf on a bounded view cannot accept a terminator outside this table.
   size=b.subarray(start,max).indexOf(0);if(size<0)reject('NAME_TERMINATOR',p);
  }
  if(size>LIMITS.nameBytes)reject('NAME_LIMIT',p);
  nameBytes+=size;if(nameBytes>LIMITS.totalResolvedNameBytes)reject('NAME_TOTAL_LIMIT',p);
  return {fieldHex:field.toString('hex'),bytesHex:b.subarray(start,start+size).toString('hex'),encoding:offset===null?'inline':'string-table',stringOffset:offset};
 }
 const directives=[];let directiveBytes=0;
 for(const s of sections){
  const p=20+(s.index-1)*40;s.name=name(p,true);
  if(s.rawOffset)s.rawSha256=sha256(b.subarray(s.rawOffset,s.rawOffset+s.rawSize));
  if(s.name.bytesHex==='2e64726563747665'){
   if(s.rawSize&&!s.rawOffset)reject('DIRECTIVE_NO_BYTES',p+20);
   directiveBytes+=s.rawSize;if(directiveBytes>LIMITS.directiveBytes)reject('DIRECTIVE_LIMIT',p+16);
   directives.push({sectionIndex:s.index,offset:s.rawOffset,bytes:s.rawSize,hex:s.rawSize?b.subarray(s.rawOffset,s.rawOffset+s.rawSize).toString('hex'):'',infoFlag:Boolean(s.characteristics&512)});
  }
 }
 const symbols=[],primary=new Set(),fltused={symbolSlots:[],relocationSites:[]};
 for(let slot=0;slot<header.symbolSlotCount;){
  const p=header.symbolTableOffset+slot*18,aux=b[p+17];
  if(aux>header.symbolSlotCount-slot-1)reject('AUXILIARY_RANGE',p+17);
  const n=name(p,false),sectionNumber=b.readInt16LE(p+12),value=u32(p+8);
  if(sectionNumber< -2||sectionNumber>header.sectionCount)reject('SYMBOL_SECTION',p+12);
  const classification=sectionNumber>0?'section-defined':sectionNumber===0?(value===0?'undefined':'common'):sectionNumber===-1?'absolute':'debug';
  const auxiliary=[];for(let i=1;i<=aux;i++)auxiliary.push({slot:slot+i,hex:b.subarray(p+i*18,p+(i+1)*18).toString('hex')});
  symbols.push({slot,name:n,value,sectionNumber,type:u16(p+14),storageClass:b[p+16],auxiliaryCount:aux,classification,auxiliary});
  primary.add(slot);if(n.bytesHex==='5f666c7475736564')fltused.symbolSlots.push(slot);slot+=aux+1;
 }
 const fltSlots=new Set(fltused.symbolSlots),widths=[0,8,4,4,4,4,4,4,4,4,2,4,1];
 for(const s of sections)for(let i=0;i<s.relocationCount;i++){
  const p=s.relocationOffset+i*10,virtualAddress=u32(p),symbolSlot=u32(p+4),type=u16(p+8);
  if(type>12)reject('UNSUPPORTED_RELOCATION_TYPE',p+8);
  let offsetInSection=null;const width=widths[type];
  if(type){if(!primary.has(symbolSlot))reject('RELOCATION_SYMBOL',p+4);offsetInSection=virtualAddress-s.virtualAddress;if(offsetInSection<0||offsetInSection>s.rawSize||width>s.rawSize-offsetInSection||!s.rawOffset)reject('RELOCATION_ADDRESS',p);if(fltSlots.has(symbolSlot))fltused.relocationSites.push({sectionIndex:s.index,relocationIndex:i});}
  s.relocations.push({index:i,virtualAddress,symbolSlot,type,offsetInSection,width});
 }
 const result={kind:'inventory',format:'coff-amd64-standard',input,header,sections,symbols,stringTable,directives,fltused};
 if(Buffer.byteLength(JSON.stringify(result))>LIMITS.serializedObjectBytes)reject('OUTPUT_LIMIT',null);
 return result;
}
