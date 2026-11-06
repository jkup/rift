// Inert reduction of accepted host TypeScript only. No guest source is executed.
import assert from 'node:assert/strict';
import {readFileSync as read,writeFileSync as write} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../../../',import.meta.url),here=new URL('./',import.meta.url);
const original=read(new URL('src/script-observation.ts',root),'utf8');
const start=original.indexOf('class Attempt {'),end=original.indexOf('export function observeScripts');
assert.ok(start>=0&&end>start);
const slice=original.slice(start,end);
function construct(source,control){
 const allocations=[];
 class ObjectStub {getOwnProperty(name){return {kind:'data',value:this[name]};}}
 class RealmStub {
  constructor(output,profile='legacy'){this.output=output;this.profile=profile;this.globalObject=new ObjectStub();this.globalObject.ReferenceError={kind:'object',object:{owner:this}};this.extensions=[];allocations.push(this);}
  defineScriptGlobal(name,descriptor){this.extensions.push({name,descriptor});}
 }
 const js=stripTypeScriptTypes(source,{mode:'transform'});
 const Attempt=Function('Realm','GuestObject','check','own','obj',js+'\nreturn Attempt;')(RealmStub,ObjectStub,(ok,msg)=>assert.ok(ok,msg),(o,n)=>o.getOwnProperty(n).value,o=>({kind:'object',object:o}));
 const a=new Attempt({units:[],steps:1,calls:1},'conformance',control!==null);
 if(control!==null)a.controlSetup(control,'alpha');
 const result={mode:a.mode,preflightControl:a.preflightControl,control:a.control,realms:allocations.map(r=>({profile:r.profile,registered:a.realms.get(r)??null,outputFault:(()=>{try{r.output('inert');return null;}catch(e){return e.message;}})(),extensions:r.extensions.map(x=>({name:x.name,writable:x.descriptor.writable,enumerable:x.descriptor.enumerable??false,configurable:x.descriptor.configurable,owner:allocations.indexOf(x.descriptor.value.object.owner)}))}))};
 return {result,attempt:a,allocations};
}
const ids=[null,'B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16','N01','N02','I01'];
const results=[];
for(const id of ids){
 const expected={mode:'conformance',preflightControl:id!==null,control:id??'none',realms:[{profile:'script',registered:'test',outputFault:'unexpected Script output',extensions:id==='B09'?[{name:'Other',writable:true,enumerable:false,configurable:true,owner:1}]:[]}]};
 if(id==='B09')expected.realms.push({profile:'script',registered:'other',outputFault:'control output',extensions:[]});
 const actual=construct(slice,id),fresh=construct(slice,id);
 assert.deepEqual(actual.result,expected,'construction/'+id);assert.deepEqual(fresh.result,expected);
 assert.notEqual(actual.attempt,fresh.attempt);assert.notEqual(actual.allocations[0],fresh.allocations[0]);
 results.push({id,expected,actual:actual.result});
}
const mutants=[['main-profile','}, "script");','}, "legacy");',null],['main-sink','unexpected Script output','control output',null],['main-registration','this.realms.set(this.realm, "test")','this.realms.set(this.realm, "other")',null],['other-profile','throw new Error("control output"); }, "script")','throw new Error("control output"); }, "legacy")','B09'],['other-registration','this.realms.set(owner, "other")','this.realms.set(owner, "test")','B09'],['other-transfer','if (control === "B09") r.defineScriptGlobal','if (control === "NEVER") r.defineScriptGlobal','B09']];
const rejected=[];
for(const [name,from,to,id] of mutants){assert.ok(slice.includes(from),'mutant setup '+name);const output=construct(slice.replace(from,to),id).result;assert.notDeepEqual(output,results.find(r=>r.id===id).expected,'mutation escaped '+name);rejected.push({name,output});}
write(new URL('construction-results.json',here),JSON.stringify({claim:'Inert host construction only; no Realm implementation, parser, evaluator, or guest execution',results,rejected},null,2)+'\n');
console.log('20 actual extracted constructor/controlSetup traces; 20 fresh allocations; six completed mutants rejected');
