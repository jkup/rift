// E1 design evidence only. No production API, registry or loader is installed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual as equal} from 'node:util';
import {frozenManifest,variants,blockers} from '../../../tools/test262/input.mjs';
const dir='docs/validation/ts-035e-p/';
const {manifest}=await frozenManifest();
const copy=structuredClone;
const canonical='{"registryVersion":1,"kind":"script-runtime-capabilities","entries":[]}\n';
const fields=['flags','features','includes','locale','negative'];
const flags=['onlyStrict','noStrict','raw','module','async','generated','CanBlockIsTrue','CanBlockIsFalse','non-deterministic'];
const runtime=new Set(['asi','RegExp','return-asi','error-objects','strict-script-contract','directive-script','global-script','harness-capabilities']);
const fail=code=>{throw Error(code);};
function object(x,keys){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Reflect.ownKeys(x).some(k=>typeof k!=='string')||!equal(Reflect.ownKeys(x).sort(),[...keys].sort()))return false;return keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));}
function list(x){
 if(!Array.isArray(x)||Object.getPrototypeOf(x)!==Array.prototype)return false;
 const length=Object.getOwnPropertyDescriptor(x,'length');
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0)return false;
 const count=length.value,keys=Reflect.ownKeys(x);
 if(keys.length!==count+1||keys[count]!=='length')return false;
 for(let i=0;i<count;i++){
  if(keys[i]!==String(i))return false;
  const item=Object.getOwnPropertyDescriptor(x,String(i));
  if(!item||!Object.hasOwn(item,'value')||typeof item.value!=='string'||item.value.length===0)return false;
 }
 return true;
}
const projection=e=>Object.fromEntries(fields.map(k=>[k,copy(e[k]??(k==='negative'?null:[]))]));
function validate(meta,variant,manifestId){
 if(!object(meta,fields)||!fields.slice(0,4).every(k=>list(meta[k])))fail('script-capabilities/metadata');
 if(meta.flags.some(f=>!flags.includes(f))||[['onlyStrict','noStrict'],['raw','onlyStrict'],['raw','module'],['module','noStrict'],['module','onlyStrict'],['raw','async'],['CanBlockIsTrue','CanBlockIsFalse']].some(pair=>pair.every(f=>meta.flags.includes(f))))fail('script-capabilities/metadata');
 for(const include of meta.includes){const p='harness/'+include;if(!p.endsWith('.js')||/[\\:\0]/.test(p)||p.split('/').some(s=>!s||s==='.'||s==='..'))fail('script-capabilities/metadata');}
 const n=meta.negative;if(n!==null&&(!object(n,['phase','type'])||!['parse','runtime','resolution'].includes(n.phase)||typeof n.type!=='string'||!n.type.trim()||(n.phase==='resolution'&&!meta.flags.includes('module'))))fail('script-capabilities/metadata');
 if(typeof variant!=='string'||!variants(meta).includes(variant))fail('script-capabilities/variant');
 if(manifestId!==null){if(typeof manifestId!=='string')fail('script-capabilities/manifest-id');const entry=manifest.entries.find(e=>e.id===manifestId);if(!entry)fail('script-capabilities/manifest-id');if(!equal(meta,projection(entry)))fail('script-capabilities/manifest-metadata');}
}
function mapDebts(legacy){return legacy.map((d,n)=>({id:`legacy:${n}:${d.reasonCode}`,status:d.status,reasonCode:d.reasonCode,authority:runtime.has(d.reasonCode)?'runtime':'never'})).concat({id:'runtime:coverage',status:'unsupported-feature',reasonCode:'runtime-capabilities',authority:'runtime'});}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function reconstruct(...args){if(args.length!==3)fail('script-capabilities/arguments');const [meta,variant,id]=args;validate(meta,variant,id);return freeze(mapDebts(blockers(meta,variant,id)));}
// IO parameter is confined to this evidence model, not a proposed public API.
function reader(args,bytes,ioError=null){if(args.length)fail('script-capabilities/arguments');if(ioError)fail('script-capabilities/read');if(!Buffer.isBuffer(bytes)||!bytes.equals(Buffer.from(canonical)))fail('script-capabilities/registry-bytes');return freeze({registryVersion:1,kind:'script-runtime-capabilities',entries:[]});}
const cases=[];
const add=(id,input,expected)=>cases.push({id,input,expected});
// Frozen full arrays are generated once, then replayed without rewriting.
for(const e of manifest.entries)for(const v of variants(projection(e)))add('corpus/'+e.id+'/'+v,{args:[projection(e),v,e.id]}, {debts:mapDebts(blockers(projection(e),v,e.id))});
const normal=projection({});
const literalNormal=[{id:'legacy:0:directive-script',status:'unsupported-profile',reasonCode:'directive-script',authority:'runtime'},{id:'runtime:coverage',status:'unsupported-feature',reasonCode:'runtime-capabilities',authority:'runtime'}];
add('raw-null',{args:[{...normal,flags:['raw']},'raw',null]},{debts:literalNormal});
add('duplicates',{args:[{...normal,features:['future','future'],flags:['raw']},'raw',null]},{debts:[{id:'legacy:0:unrecognized-feature',status:'unsupported-feature',reasonCode:'unrecognized-feature',authority:'never'},{id:'legacy:1:unrecognized-feature',status:'unsupported-feature',reasonCode:'unrecognized-feature',authority:'never'},{...literalNormal[0],id:'legacy:2:directive-script'},literalNormal[1]]});
const reject=(id,args,code)=>add(id,{args},{error:'script-capabilities/'+code});
for(const k of fields){const m=copy(normal);delete m[k];reject('missing/'+k,[m,'strict',null],'metadata');}
for(const k of ['description','blockers','id'])reject('extra/'+k,[{...normal,[k]:'extra'},'strict',null],'metadata');
for(const k of fields.slice(0,4))for(const value of [null,'x',[1],['']])reject('type/'+k+'/'+JSON.stringify(value),[{...normal,[k]:value},'strict',null],'metadata');
for(const value of [null,[],7,'text'])reject('metadata/'+JSON.stringify(value),[value,'strict',null],'metadata');
for(const f of [['unknown'],['onlyStrict','noStrict'],['raw','onlyStrict'],['raw','module'],['module','noStrict'],['module','onlyStrict'],['raw','async'],['CanBlockIsTrue','CanBlockIsFalse']])reject('flags/'+f,[{...normal,flags:f},'strict',null],'metadata');
for(const include of ['../x.js','/x.js','x\\y.js','x:y.js','x\0.js','x.txt','a//b.js'])reject('include/'+include,[{...normal,includes:[include]},'strict',null],'metadata');
for(const negative of [{},[],{phase:'runtime',type:''},{phase:'runtime',type:1},{phase:'parse',type:'SyntaxError',extra:true},{phase:'resolution',type:'SyntaxError'},{phase:'other',type:'Error'}])reject('negative/'+JSON.stringify(negative),[{...normal,negative},'strict',null],'metadata');
for(const variant of ['raw','module','unknown',null,1])reject('variant/'+variant,[normal,variant,null],'variant');
reject('raw-not-nonstrict',[{...normal,flags:['raw']},'non-strict',null],'variant');
reject('onlystrict-not-nonstrict',[{...normal,flags:['onlyStrict']},'non-strict',null],'variant');
for(const id of ['', 'unknown',1,{},[]])reject('id/'+JSON.stringify(id),[normal,'strict',id],'manifest-id');
reject('known-id-wrong-metadata',[{...normal,flags:['raw']},'raw',manifest.entries[0].id],'manifest-metadata');
reject('missing-id',[normal,'strict'],'arguments');reject('extra-arg',[normal,'strict',null,{}],'arguments');
reject('precedence',[{},'unknown','unknown'],'metadata');
add('null-id-no-special-debt',{args:[normal,'strict',null]},{debts:[{id:'legacy:0:strict-script-contract',status:'unsupported-profile',reasonCode:'strict-script-contract',authority:'runtime'},{id:'legacy:1:harness-capabilities',status:'unsupported-feature',reasonCode:'harness-capabilities',authority:'runtime'},literalNormal[1]]});
add('duplicate-flags-preserved',{args:[{...normal,flags:['raw','raw']},'raw',null]},{debts:literalNormal});
const registry=[];
const rb=(id,bytes,error='registry-bytes',args=[],ioError=null)=>registry.push({id,args,bytesBase64:bytes.toString('base64'),ioError,expected:error?{error:'script-capabilities/'+error}:{value:JSON.parse(canonical)}});
rb('canonical',Buffer.from(canonical),null);
for(const [id,text] of [['no-newline',canonical.trimEnd()],['crlf',canonical.replace('\n','\r\n')],['pretty',JSON.stringify(JSON.parse(canonical),null,2)+'\n'],['reorder','{"kind":"script-runtime-capabilities","registryVersion":1,"entries":[]}\n'],['trailing-space',canonical+' '],['trailing-record',canonical+canonical],['truncated',canonical.slice(0,-3)],['bom','\ufeff'+canonical],['version',canonical.replace(':1',':2')],['extra',canonical.replace('"entries":[]','"entries":[],"extra":0')],['nonempty',canonical.replace('[]','[{}]')],['duplicate',canonical.replace('"registryVersion":1','"registryVersion":1,"registryVersion":1')],['escaped-duplicate',canonical.replace('"registryVersion":1','"registryVersion":1,"\\u0072egistryVersion":1')],['escaped-key',canonical.replace('registryVersion','\\u0072egistryVersion')],['null','null\n'],['array','[]\n']])rb(id,Buffer.from(text));
rb('invalid-utf8',Buffer.from([0xc0,0xaf]));rb('empty',Buffer.alloc(0));rb('oversized',Buffer.alloc(65537,32));
for(const args of [['elsewhere.json'],[null],[{}],[{path:'elsewhere.json'}],[{registry:JSON.parse(canonical)}],[{verify:true}]])rb('argument/'+JSON.stringify(args),Buffer.from(canonical),'arguments',args);
rb('missing-file',Buffer.alloc(0),'read',[],'ENOENT');rb('permission',Buffer.alloc(0),'read',[],'EACCES');
for(const [id,text] of [['missing-key',canonical.replace('"entries":[],','').replace(',"entries":[]','')],['wrong-kind',canonical.replace('script-runtime-capabilities','other')],['version-type',canonical.replace(':1',':"1"')],['entries-null',canonical.replace('[]','null')],['entries-object',canonical.replace('[]','{}')]])rb(id,Buffer.from(text));
const frozenPath=dir+'e1-literals.json';
if(process.argv.includes('--freeze'))writeFileSync(frozenPath,JSON.stringify({cases,registry},null,2)+'\n');
const literals=JSON.parse(readFileSync(frozenPath));
assert.deepEqual(literals,{cases,registry}); // Detect source/manifest changes, never silently refresh expected literals.
function check(fn,expected){if(expected.error)assert.throws(fn,e=>e.constructor===Error&&e.message===expected.error);else assert.deepEqual(fn(),expected.debts??expected.value);}
for(const r of literals.cases)check(()=>reconstruct(...r.input.args),r.expected);
for(const r of literals.registry)check(()=>reader(r.args,Buffer.from(r.bytesBase64,'base64'),r.ioError),r.expected);
const input={...copy(normal),flags:['raw']},before=copy(input),out=reconstruct(input,'raw',null),out2=reconstruct(input,'raw',null);
assert.deepEqual(input,before);assert.notEqual(out,out2);assert.notEqual(out[0],out2[0]);assert(Object.isFrozen(out)&&out.every(Object.isFrozen));assert.throws(()=>out.push({}),TypeError);assert.throws(()=>out[0].authority='never',TypeError);input.flags.push('unknown');assert.deepEqual(out,literalNormal);
const r1=reader([],Buffer.from(canonical)),r2=reader([],Buffer.from(canonical));assert.notEqual(r1,r2);assert.notEqual(r1.entries,r2.entries);assert(Object.isFrozen(r1)&&Object.isFrozen(r1.entries));assert.throws(()=>r1.entries.push({}),TypeError);
const unknown=mapDebts([{status:'unsupported-feature',reasonCode:'future-debt'},{status:'unsupported-feature',reasonCode:'future-debt'}]);assert.deepEqual(unknown,[{id:'legacy:0:future-debt',status:'unsupported-feature',reasonCode:'future-debt',authority:'never'},{id:'legacy:1:future-debt',status:'unsupported-feature',reasonCode:'future-debt',authority:'never'},literalNormal[1]]);
let getterCalls=0;const accessor={...normal};Object.defineProperty(accessor,'flags',{get(){getterCalls++;return [];},enumerable:true});assert.throws(()=>reconstruct(accessor,'strict',null),/metadata/);assert.equal(getterCalls,0);
for(const meta of [Object.assign(Object.create(null),normal),{...normal,[Symbol('extra')]:1},{...normal,flags:new Array(1)}])assert.throws(()=>reconstruct(meta,'strict',null),/metadata/);
assert.throws(()=>reconstruct(normal,'strict',undefined),e=>e.message==='script-capabilities/manifest-id');
assert.throws(()=>reader([undefined],Buffer.from(canonical)),e=>e.message==='script-capabilities/arguments');
assert.throws(()=>reader(['override'],Buffer.alloc(0),'ENOENT'),e=>e.message==='script-capabilities/arguments');
const readonly=freeze(copy(normal));assert.doesNotThrow(()=>reconstruct(readonly,'strict',null));
const accessorControls=[];
for(const field of fields.slice(0,4))for(const [name,key] of [['keys','keys'],['every','every'],['iterator',Symbol.iterator],['index','0']]){
 let calls=0;const array=['value'];
 Object.defineProperty(array,key,{get(){calls++;throw Error('accessor invoked');},enumerable:true,configurable:true});
 assert.throws(()=>reconstruct({...normal,[field]:array},'strict',null),e=>e.constructor===Error&&e.message==='script-capabilities/metadata');
 assert.equal(calls,0,field+'/'+name);
 accessorControls.push({field,accessor:name,expectedError:'script-capabilities/metadata',expectedCalls:0,actualCalls:calls});
}
// This model has no environment lookup. An extra environment value cannot alter
// bytes, arguments or fixed-path semantics; production source review must retain
// that absence rather than introducing an environment-variable API.
const environmentWitness={SCRIPT_CAPABILITIES_PATH:'elsewhere.json',SCRIPT_CAPABILITIES_REGISTRY:'{"entries":[{}]}'};
assert.deepEqual(reader([],Buffer.from(canonical)),JSON.parse(canonical));
const counts={'unsupported-feature':0,'unsupported-profile':0};for(const c of literals.cases.slice(0,60))counts[c.expected.debts[0].status]++;
assert.deepEqual(counts,{'unsupported-feature':19,'unsupported-profile':41});
const result={corpusFullArrays:60,debtCases:literals.cases.length,readerByteCases:literals.registry.length,counts,unknownDuplicatePolicy:unknown,detachmentAndFreeze:'PASS',nonJsonObjectControls:4,accessorControls,explicitUndefinedAndArgumentPriority:'PASS',frozenInput:'PASS',environmentWitness:{input:environmentWitness,expected:JSON.parse(canonical),meaning:'No environment lookup; source-contract witness only'},production:false};
writeFileSync(dir+'e1-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
