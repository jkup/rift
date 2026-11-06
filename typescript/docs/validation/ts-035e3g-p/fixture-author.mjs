// Synthetic fixture author only. Never reads an object; no inspectCoff implementation.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,sha=b=>createHash('sha256').update(b).digest('hex');
const h=s=>Buffer.from(s,'hex'),txt=s=>Buffer.from(s),clone=structuredClone;
const name=s=>({fieldHex:Buffer.concat([txt(s),Buffer.alloc(8-txt(s).length)]).toString('hex'),bytesHex:txt(s).toString('hex'),encoding:'inline',stringOffset:null});
const identity=b=>({bytes:b.length,sha256:sha(b)});
const header={machine:34404,sectionCount:0,timestamp:0,symbolTableOffset:0,symbolSlotCount:0,optionalHeaderBytes:0,characteristics:0};
const empty={kind:'inventory',format:'coff-amd64-standard',input:null,header,sections:[],symbols:[],stringTable:null,directives:[],fltused:{symbolSlots:[],relocationSites:[]}};
const cases=[];
function good(id,bytes,expected){cases.push({id,bytesHex:bytes.toString('hex'),expected:{...clone(expected),input:identity(bytes)}});}
function bad(id,bytes,code,offset){cases.push({id,bytesHex:bytes.toString('hex'),expected:{kind:'rejected',input:identity(bytes),error:{code,offset}}});}
const minimal=h('6486000000000000000000000000000000000000');good('empty-standard',minimal,empty);
// Two sections; raw spans 100..104 and104..108; relocation108..118;
// ten symbol slots118..298; 21-byte string table298..319.
const full=Buffer.alloc(319);
full.set(h('6486020000000000760000000a00000000000000'));
full.set(h('2e74657874000000000000000000000004000000640000006c000000000000000100000020000060'),20);
full.set(h('2e647265637476650000000000000000040000006800000000000000000000000000000000020000'),60);
full.set(h('010203042f5800ff'),100);full.set(h('00000000020000000400'),108);
// Independently authored records; writes contain no reading or layout discovery.
full.set(h('2e7465787400000000000000010000000301'),118);
full.set(h('040000000100000000000000000000000000'),136);
full.set(h('5f666c747573656400000000000000000200'),154);
full.set(h('646566696e65640001000000010000000200'),172);
full.set(h('616273000000000007000000ffff00000200'),190);
full.set(h('2e66696c6500000000000000feff00006702'),208);
full.set(h('666978747572652e63000000000000000000'),226);
full.set(h('aabbccddeeff00112233445566778899aabb'),244);
full.set(h('636f6d6d6f6e000004000000000000000200'),262);
full.set(h('000000000400000002000000010000000200'),280);
full.set(h('150000006c6f6e675f73796d626f6c5f6e616d6500'),298);
const section=(index,n,rawOffset,characteristics)=>({index,name:name(n),virtualSize:0,virtualAddress:0,rawSize:4,rawOffset,relocationOffset:0,lineOffset:0,relocationCount:0,lineCount:0,characteristics,rawSha256:sha(index===1?h('01020304'):h('2f5800ff')),relocations:[]});
const symbol=(slot,n,value,sectionNumber,storageClass,classification,auxiliary=[])=>({slot,name:name(n),value,sectionNumber,type:0,storageClass,auxiliaryCount:auxiliary.length,classification,auxiliary});
const expected=clone(empty);expected.header={...header,sectionCount:2,symbolTableOffset:118,symbolSlotCount:10};expected.sections=[{...section(1,'.text',100,1610612768),relocationOffset:108,relocationCount:1,relocations:[{index:0,virtualAddress:0,symbolSlot:2,type:4,offsetInSection:0,width:4}]},section(2,'.drectve',104,512)];
expected.symbols=[symbol(0,'.text',0,1,3,'section-defined',[{slot:1,hex:'040000000100000000000000000000000000'}]),symbol(2,'_fltused',0,0,2,'undefined'),symbol(3,'defined',1,1,2,'section-defined'),symbol(4,'abs',7,-1,2,'absolute'),symbol(5,'.file',0,-2,103,'debug',[{slot:6,hex:'666978747572652e63000000000000000000'},{slot:7,hex:'aabbccddeeff00112233445566778899aabb'}]),symbol(8,'common',4,0,2,'common'),{...symbol(9,'long',2,1,2,'section-defined'),name:{fieldHex:'0000000004000000',bytesHex:'6c6f6e675f73796d626f6c5f6e616d65',encoding:'string-table',stringOffset:4}}];
expected.stringTable={offset:298,bytes:21,sha256:sha(h('150000006c6f6e675f73796d626f6c5f6e616d6500'))};expected.directives=[{sectionIndex:2,offset:104,bytes:4,hex:'2f5800ff',infoFlag:true}];expected.fltused={symbolSlots:[2],relocationSites:[{sectionIndex:1,relocationIndex:0}]};good('symbols-aux-directive-relocation',full,expected);
const long=Buffer.alloc(74);long.set(h('64860100000000003c0000000000000000000000'));long.set(h('2f34000000000000'),20);long.set(h('0e0000002e6c6f6e676e616d6500'),60);
const longExpected=clone(empty);longExpected.header={...header,sectionCount:1,symbolTableOffset:60};longExpected.sections=[{index:1,name:{fieldHex:'2f34000000000000',bytesHex:'2e6c6f6e676e616d65',encoding:'string-table',stringOffset:4},virtualSize:0,virtualAddress:0,rawSize:0,rawOffset:0,relocationOffset:0,lineOffset:0,relocationCount:0,lineCount:0,characteristics:0,rawSha256:null,relocations:[]}];longExpected.stringTable={offset:60,bytes:14,sha256:sha(h('0e0000002e6c6f6e676e616d6500'))};good('long-section-no-symbols',long,longExpected);
function changed(base,offset,hex){const b=Buffer.from(base);b.set(h(hex),offset);return b;}
let b=changed(full,32,'00100000');b=changed(b,108,'00100000');let e=clone(expected);e.sections[0].virtualAddress=4096;e.sections[0].relocations[0].virtualAddress=4096;good('nonzero-section-address',b,e);
b=changed(full,112,'ffffffff0000');e=clone(expected);e.sections[0].relocations=[{index:0,virtualAddress:0,symbolSlot:4294967295,type:0,offsetInSection:null,width:0}];e.fltused.relocationSites=[];good('ignored-relocation-no-dereference',b,e);
b=changed(full,96,'00000000');e=clone(expected);e.sections[1].characteristics=0;e.directives[0].infoFlag=false;good('directive-name-without-info',b,e);
b=changed(full,284,'05000000');e=clone(expected);e.symbols[6].name={fieldHex:'0000000005000000',bytesHex:'6f6e675f73796d626f6c5f6e616d65',encoding:'string-table',stringOffset:5};good('string-suffix-offset',b,e);
b=changed(full,170,'ff00');e=clone(expected);e.symbols[1].storageClass=255;good('unknown-storage-class-raw',b,e);
b=changed(long,20,'2e62737300000000');b=changed(b,36,'10000000');b=changed(b,56,'80000000');e=clone(longExpected);e.sections[0].name=name('.bss');e.sections[0].rawSize=16;e.sections[0].characteristics=128;good('uninitialized-no-stored-bytes',b,e);
for(let size=0;size<20;size++)bad('header-truncated-'+size,minimal.subarray(0,size),'TRUNCATED_HEADER',0);
bad('archive',txt('!<arch>\n'),'UNSUPPORTED_ARCHIVE',0);bad('image-prefix',h('4d5a'),'UNSUPPORTED_IMAGE',0);bad('import-signature',h('0000ffff00006486000000000000000000000000'),'UNSUPPORTED_ANONYMOUS',0);bad('bigobj-family-signature',h('0000ffff0200648600000000c7a1bad1eebaa94baf20faf66aa4dcb8'),'UNSUPPORTED_ANONYMOUS',0);
const mutations=[
 ['machine',minimal,0,'4c01','UNSUPPORTED_MACHINE',0],['optional-header',minimal,16,'0100','UNSUPPORTED_OPTIONAL_HEADER',16],['section-limit',minimal,2,'0110','SECTION_LIMIT',2],['symbol-limit',minimal,12,'01000400','SYMBOL_LIMIT',12],
 ['missing-sections',minimal,2,'0100','TRUNCATED_SECTIONS',20],['lines-pointer',full,48,'01000000','UNSUPPORTED_LINES',48],['lines-count',full,54,'0100','UNSUPPORTED_LINES',54],
 ['overflow-marker-plausible',full,56,'20000061','UNSUPPORTED_RELOCATION_OVERFLOW',56],['overflow-marker-malformed',full,56,'20000061','UNSUPPORTED_RELOCATION_OVERFLOW',56],
 ['raw-missing',full,40,'00000000','RAW_POINTER',40],['raw-truncated',full,40,'3e010000','TRUNCATED_RAW',40],['empty-raw-pointer',full,36,'00000000','RAW_POINTER',40],
 ['relocation-pointer-zero',full,44,'00000000','RELOCATION_POINTER',44],['relocation-truncated',full,44,'3e010000','TRUNCATED_RELOCATIONS',44],['empty-relocation-pointer',full,52,'0000','RELOCATION_POINTER',44],
 ['symbol-pointer-zero',full,8,'00000000','SYMBOL_POINTER',8],['symbol-table-truncated',full,8,'00010000','TRUNCATED_SYMBOLS',8],
 ['string-size-small',full,298,'03000000','STRING_SIZE',298],['string-size-truncated',full,298,'16000000','TRUNCATED_STRINGS',298],['string-limit',full,298,'01001000','STRING_LIMIT',298],
 ['section-name-negative',long,20,'2f2d310000000000','SECTION_NAME_ENCODING',20],['section-name-leading-zero',long,20,'2f30340000000000','SECTION_NAME_ENCODING',20],['section-name-base64',long,20,'2f2f414141410000','SECTION_NAME_ENCODING',20],['section-name-offset-small',long,20,'2f33000000000000','NAME_OFFSET',20],['section-name-offset-end',long,20,'2f31340000000000','NAME_OFFSET',20],
 ['inline-padding',full,20,'2e00746578740000','NAME_PADDING',20],['symbol-name-offset-small',full,284,'03000000','NAME_OFFSET',280],['symbol-name-offset-end',full,284,'15000000','NAME_OFFSET',280],['symbol-name-unterminated',full,318,'58','NAME_TERMINATOR',280],
 ['aux-slots-overrun',full,135,'0a','AUXILIARY_RANGE',135],['section-index-outside',full,184,'0300','SYMBOL_SECTION',184],['negative-section-index',full,184,'fdff','SYMBOL_SECTION',184],
 ['unknown-relocation-type',full,116,'0d00','UNSUPPORTED_RELOCATION_TYPE',116],['relocation-aux-slot',full,112,'01000000','RELOCATION_SYMBOL',112],['relocation-slot-outside',full,112,'0a000000','RELOCATION_SYMBOL',112],['relocation-address-width',full,108,'01000000','RELOCATION_ADDRESS',108],['relocation-width-eight',full,116,'0100','RELOCATION_ADDRESS',108],
 ['raw-overlap-header',full,40,'14000000','OVERLAP',20],['raw-overlap-raw',full,80,'64000000','OVERLAP',100]
];for(const [id,src,at,hex,code,offset]of mutations)bad(id,changed(src,at,hex),code,offset);
// Give the two overflow cases different counts/sentinel bytes while preserving early rejection.
let overflow=cases.find(x=>x.id==='overflow-marker-plausible');b=h(overflow.bytesHex);b.set(h('ffff'),52);b.set(h('00000100000000000000'),108);overflow.bytesHex=b.toString('hex');overflow.expected.input=identity(b);
bad('string-prefix-truncated',full.subarray(0,300),'TRUNCATED_STRINGS',298);
bad('bss-relocation',changed(full,56,'80000000').map((x,i)=>i>=40&&i<44?0:x),'UNSUPPORTED_BSS_RELOCATIONS',52);

// Duplicate names and misleading auxiliary bytes must not become a resolver.
b=changed(full,172,'5f666c7475736564');e=clone(expected);e.symbols[2].name=name('_fltused');e.fltused.symbolSlots=[2,3];good('fltused-defined-and-undefined-separate-slots',b,e);
b=changed(full,136,'5f666c747573656400000000000000000000');e=clone(expected);e.symbols[0].auxiliary[0].hex='5f666c747573656400000000000000000000';good('auxiliary-fltused-not-primary',b,e);
b=changed(full,104,'efbbbf20');e=clone(expected);e.sections[1].rawSha256=sha(h('efbbbf20'));e.directives[0].hex='efbbbf20';good('directive-bom-retained-not-decoded',b,e);
b=changed(full,172,'ff66696e65640000');e=clone(expected);e.symbols[2].name={fieldHex:'ff66696e65640000',bytesHex:'ff66696e6564',encoding:'inline',stringOffset:null};good('nonutf8-symbol-name-raw',b,e);

// Resource boundary literals are authored, not inferred from actual object sizes.
const tooLongName=Buffer.alloc(20+18+4+4098);tooLongName.set(h('6486000000000000140000000100000000000000'));tooLongName.set(h('000000000400000000000000000000000200'),20);tooLongName.writeUInt32LE(4102,38);tooLongName.fill(0x61,42,4139);bad('resolved-name-limit',tooLongName,'NAME_LIMIT',20);
const manyNames=Buffer.alloc(20+1025*18+4+4097);manyNames.set(h('6486000000000000140000000104000000000000'));for(let n=0;n<1025;n++)manyNames.set(h('000000000400000000000000000000000200'),20+n*18);manyNames.writeUInt32LE(4101,18470);manyNames.fill(0x61,18474,22570);bad('aggregate-name-limit',manyNames,'NAME_TOTAL_LIMIT',18452);
writeFileSync(new URL('fixtures.json',import.meta.url),JSON.stringify({status:'future-literals-no-reader-executed',cases},null,2)+'\n',{flag:'w'});
console.log(JSON.stringify({futureFixtures:cases.length,positive:cases.filter(x=>x.expected.kind==='inventory').length,negative:cases.filter(x=>x.expected.kind==='rejected').length,readerInvocations:0}));
