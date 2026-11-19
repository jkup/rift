// Independent synthetic writer and expected literals only; no reader import/execution.
import {writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),name=s=>({fieldHex:Buffer.concat([Buffer.from(s),Buffer.alloc(8-s.length)]).toString('hex'),bytesHex:Buffer.from(s).toString('hex'),encoding:'inline',stringOffset:null});
const cases=[];const identity=b=>({bytes:b.length,sha256:hash(b)});
function one(id,{size=0,pointer=0,length=60,sectionName='.empty',flags=0,relocations=0,lineCount=0,relocationType=0}={},error){
 const b=Buffer.alloc(length);b.writeUInt16LE(34404,0);b.writeUInt16LE(1,2);b.write(sectionName,20);b.writeUInt32LE(size,36);b.writeUInt32LE(pointer,40);b.writeUInt32LE(relocations?60:0,44);b.writeUInt16LE(relocations,52);b.writeUInt16LE(lineCount,54);b.writeUInt32LE(flags,56);
 if(size&&pointer>=60&&pointer+size<=length)b.fill(0xab,pointer,pointer+size);
 if(relocations){b.writeUInt32LE(4294967295,60);b.writeUInt32LE(4294967295,64);b.writeUInt16LE(relocationType,68);}
 let expected;if(error)expected={kind:'rejected',input:identity(b),error};else expected={kind:'inventory',format:'coff-amd64-standard',input:identity(b),header:{machine:34404,sectionCount:1,timestamp:0,symbolTableOffset:0,symbolSlotCount:0,optionalHeaderBytes:0,characteristics:0},sections:[{index:1,name:name(sectionName),virtualSize:0,virtualAddress:0,rawSize:size,rawOffset:pointer,relocationOffset:relocations?60:0,lineOffset:0,relocationCount:relocations,lineCount,characteristics:flags,rawSha256:size&&pointer?hash(Buffer.alloc(size,0xab)):null,relocations:relocations?[{index:0,virtualAddress:4294967295,symbolSlot:4294967295,type:0,offsetInSection:null,width:0}]:[]}],symbols:[],stringTable:null,directives:sectionName==='.drectve'?[{sectionIndex:1,offset:pointer,bytes:size,hex:size?Buffer.alloc(size,0xab).toString('hex'):'',infoFlag:Boolean(flags&512)}]:[],fltused:{symbolSlots:[],relocationSites:[]}};
 cases.push({id,bytesHex:b.toString('hex'),expected});
}
for(const pointer of [0,1,20,59,60])one('empty-pointer-'+pointer,{pointer});
one('empty-past-eof',{pointer:61},{code:'RAW_POINTER',offset:40});one('empty-uint32-max',{pointer:4294967295},{code:'RAW_POINTER',offset:40});
for(const flags of [0,512])for(const pointer of [0,20,60])one('empty-directive-'+flags+'-'+pointer,{pointer,flags,sectionName:'.drectve'});
one('empty-directive-past-eof',{pointer:61,sectionName:'.drectve',flags:512},{code:'RAW_POINTER',offset:40});
one('nonempty-stored',{size:4,pointer:60,length:64,sectionName:'.data'});
one('nonempty-truncated',{size:4,pointer:61,length:64},{code:'TRUNCATED_RAW',offset:40});one('nonempty-at-eof',{size:4,pointer:64,length:64},{code:'TRUNCATED_RAW',offset:40});
one('nonempty-missing-pointer',{size:4},{code:'RAW_POINTER',offset:40});one('nonempty-header-overlap',{size:4,pointer:20},{code:'OVERLAP',offset:20});
one('bss-absent',{size:4,flags:128});for(const flags of [128,640])one('bss-directive-absent-'+flags,{size:4,flags,sectionName:'.drectve'},{code:'DIRECTIVE_NO_BYTES',offset:40});
one('bss-relocation',{size:4,flags:128,relocations:1,length:70},{code:'UNSUPPORTED_BSS_RELOCATIONS',offset:52});
one('empty-relocation-ignored',{pointer:70,relocations:1,length:70});one('empty-relocation-missing-primary',{pointer:70,relocations:1,length:70,relocationType:4},{code:'RELOCATION_SYMBOL',offset:64});
one('line-error-before-empty-pointer',{pointer:4294967295,lineCount:1},{code:'UNSUPPORTED_LINES',offset:54});one('overflow-before-empty-pointer',{pointer:4294967295,flags:16777216},{code:'UNSUPPORTED_RELOCATION_OVERFLOW',offset:56});
function neighbors(id,emptyPointer,firstSize,secondSize,error){
 const b=Buffer.alloc(104);b.writeUInt16LE(34404);b.writeUInt16LE(2,2);b.write('.empty',20);b.writeUInt32LE(firstSize,36);b.writeUInt32LE(emptyPointer,40);b.write('.data',60);b.writeUInt32LE(secondSize,76);b.writeUInt32LE(100,80);b.set([1,2,3,4],100);
 let expected;if(error)expected={kind:'rejected',input:identity(b),error};else expected={kind:'inventory',format:'coff-amd64-standard',input:identity(b),header:{machine:34404,sectionCount:2,timestamp:0,symbolTableOffset:0,symbolSlotCount:0,optionalHeaderBytes:0,characteristics:0},sections:[{index:1,name:name('.empty'),virtualSize:0,virtualAddress:0,rawSize:0,rawOffset:emptyPointer,relocationOffset:0,lineOffset:0,relocationCount:0,lineCount:0,characteristics:0,rawSha256:null,relocations:[]},{index:2,name:name('.data'),virtualSize:0,virtualAddress:0,rawSize:4,rawOffset:100,relocationOffset:0,lineOffset:0,relocationCount:0,lineCount:0,characteristics:0,rawSha256:hash(Buffer.from([1,2,3,4])),relocations:[]}],symbols:[],stringTable:null,directives:[],fltused:{symbolSlots:[],relocationSites:[]}};
 cases.push({id,bytesHex:b.toString('hex'),expected});
}
neighbors('empty-pointer-inside-neighbor',100,0,4);neighbors('empty-pointer-neighbor-eof',104,0,4);neighbors('genuine-neighbor-overlap',100,4,4,{code:'OVERLAP',offset:100});neighbors('genuine-neighbor-truncation',104,0,5,{code:'TRUNCATED_RAW',offset:80});neighbors('empty-pointer-before-neighbor-truncation',105,0,5,{code:'RAW_POINTER',offset:40});
writeFileSync(new URL('./empty-fixtures.json',import.meta.url),JSON.stringify({status:'independent future literals; proposed reader not invoked',cases},null,2)+'\n',{flag:'wx'});console.log({independentFutureLiterals:cases.length});
