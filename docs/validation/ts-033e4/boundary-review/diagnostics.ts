import {Realm} from '../../../../src/realm.js';
import {GuestObject,UNDEFINED,normal,type Builtin,type OperationContext,type Value,type ValueCompletion,type Completion} from '../../../../src/runtime.js';
import type {Location} from '../../../../src/syntax.js';
import {attempt} from './diagnostic-state.js';
import {guard} from './diagnostic-guard.js';
function check(ok:boolean):void{if(!ok)throw new Error("assertion");}
function error(action:()=>Completion,message:string):void{
    let matched=false;
    try{action();}catch(e){matched=e instanceof Error&&e.message===message;}
    check(matched);
}
let ticks=0,dispatches=0,raw=0,legacyRaw=0;
function context(realm:Realm):OperationContext{return {realm,
    call:(_callee:Value,_receiver:Value,_args:Value[],_loc:Location):ValueCompletion=>{dispatches++;return normal();},
    tick:(_loc:Location):ValueCompletion=>{ticks++;return normal();}};}
function invokeOf(object:GuestObject):Builtin{const c=object.callable;if(c===null||c.kind!=="builtin")throw new Error("builtin");return c.invoke;}
function propertyObject(object:GuestObject,name:string):GuestObject{const d=object.getOwnProperty(name);if(d===undefined||d.kind!=="data"||d.value.kind!=="object")throw new Error("property");return d.value.object;}
const a=new Realm((_line:string):void=>{},"script"),b=new Realm((_line:string):void=>{},"script"),legacy=new Realm((_line:string):void=>{});
const legacyOther=new Realm((_line:string):void=>{});
const ca=context(a),cb=context(b),cl=context(legacy),clone:OperationContext={realm:a,call:ca.call,tick:ca.tick};
const receiver:Value={kind:"object",object:a.createObject()},wrongReceiver:Value={kind:"object",object:a.createObject()};
const args:Value[]=[receiver],wrongArgs:Value[]=[receiver],loc:Location={line:1,column:1},wrongLoc:Location={line:1,column:1};
const result=normal(receiver),cross="cross-profile callable invocation",closed="Script execution unavailable";
// Check existing production guard diagnostics unchanged, including cross-Realm same-profile denial.
const existing=invokeOf(a.createBuiltin("probe",0,(_r,_a,_c,_l):Completion=>{raw++;return result;}));
const foreign=invokeOf(b.createBuiltin("probe",0,(_r,_a,_c,_l):Completion=>{raw++;return result;}));
const restricted=a.functionPrototype.getOwnProperty("caller");
if(restricted===undefined||restricted.kind!=="accessor"||restricted.get.kind!=="object")throw new Error("restricted");
for(const fn of [existing,foreign,invokeOf(a.functionPrototype),invokeOf(propertyObject(propertyObject(a.globalObject,"console"),"log")),invokeOf(propertyObject(a.functionPrototype,"call")),invokeOf(propertyObject(a.functionPrototype,"toString")),invokeOf(restricted.get.object)]){
    error(():Completion=>fn(receiver,args,cl,loc),cross);
    error(():Completion=>fn(receiver,args,ca,loc),closed);
}
const existingLegacy=invokeOf(legacyOther.createBuiltin("probe",0,(_r,_a,c,_l):Completion=>{legacyRaw++;check(c===cl);return result;}));
error(():Completion=>existingLegacy(receiver,args,ca,loc),cross);
check(existingLegacy(receiver,args,cl,loc)===result&&legacyRaw===1&&raw===0);
console.log("PASS existing guard cross-profile callable invocation / Script execution unavailable / legacy direct");
// Proposed model guard: literal failures with the real runtime types.
const wrapped=guard(a,(_r,_a,c,_l):Completion=>{raw++;check(c===ca);return result;});
const other=guard(a,(_r,_a,_c,_l):Completion=>{raw++;return result;});
const legacyWrapped=guard(legacyOther,(_r,_a,c,_l):Completion=>{legacyRaw++;check(c===cl);return result;});
for(const c of [ca,cb,clone])error(():Completion=>wrapped(receiver,args,c,loc),closed);
error(():Completion=>wrapped(receiver,args,cl,loc),cross);
error(():Completion=>legacyWrapped(receiver,args,ca,loc),cross);
check(legacyWrapped(receiver,args,cl,loc)===result&&legacyRaw===2);
attempt(ca,a,wrapped,receiver,args,loc,():Completion=>{
    error(():Completion=>wrapped(receiver,args,cl,loc),cross);
    error(():Completion=>wrapped(receiver,args,clone,loc),closed);
    error(():Completion=>wrapped(receiver,args,cb,loc),closed);
    error(():Completion=>other(receiver,args,ca,loc),closed);
    error(():Completion=>wrapped(wrongReceiver,args,ca,loc),closed);
    error(():Completion=>wrapped(receiver,wrongArgs,ca,loc),closed);
    error(():Completion=>wrapped(receiver,args,ca,wrongLoc),closed);
    check(raw===0&&ticks===0&&dispatches===0);
    // Legacy direct invocation neither requires nor consumes the pending Script permit.
    check(legacyWrapped(receiver,args,cl,loc)===result&&legacyRaw===3);
    check(wrapped(receiver,args,ca,loc)===result&&raw===1);
    error(():Completion=>wrapped(receiver,args,ca,loc),closed);
    return result;
});
error(():Completion=>wrapped(receiver,args,ca,loc),closed);
error(():Completion=>attempt(ca,b,wrapped,receiver,args,loc,():Completion=>wrapped(receiver,args,ca,loc)),closed);
check(raw===1&&ticks===0&&dispatches===0);
console.log("PASS proposed exact diagnostics invalid tuple leaves permit unused / authentic consumes once");
const sentinel=new Error("sentinel");
const throwing=guard(a,(_r,_a,_c,_l):Completion=>{throw sentinel;});
let same=false;
try{attempt(ca,a,throwing,receiver,args,loc,():Completion=>throwing(receiver,args,ca,loc));}
catch(e){same=e instanceof Error&&e===sentinel;}
check(same);
error(():Completion=>throwing(receiver,args,ca,loc),closed);
check(attempt(ca,a,wrapped,receiver,args,loc,():Completion=>wrapped(receiver,args,ca,loc))===result&&raw===2);
check(ticks===0&&dispatches===0);
console.log("PASS proposed host identity cleanup / no validation ticks or dispatch");
