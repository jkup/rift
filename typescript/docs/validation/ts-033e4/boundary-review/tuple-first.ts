import {Realm} from '../../../../src/realm.js';
import {GuestObject,normal,type OperationContext,type Value,type ValueCompletion,type Completion} from '../../../../src/runtime.js';
import type {Location} from '../../../../src/syntax.js';
import {attempt} from './tuple-state.js';
import {guard} from './tuple-guard.js';
function check(ok:boolean):void{if(!ok)throw new Error("assertion");}
function reject(action:()=>Completion):void{let caught=false;try{action();}catch{caught=true;}check(caught);}
const a=new Realm((_line:string):void=>{},"script"),b=new Realm((_line:string):void=>{},"script");
const context:OperationContext={realm:a,call:(_callee:Value,_receiver:Value,_args:Value[],_loc:Location):ValueCompletion=>{throw new Error("no-dispatch");},tick:(_loc:Location):ValueCompletion=>normal()};
const other:OperationContext={realm:a,call:context.call,tick:context.tick};
const receiver:Value={kind:"object",object:new GuestObject(a.objectPrototype)};
const wrongReceiver:Value={kind:"object",object:new GuestObject(a.objectPrototype)};
const args:Value[]=[receiver],wrongArgs:Value[]=[receiver],loc:Location={line:1,column:1},wrongLoc:Location={line:1,column:1};
let raw=0;
const result=normal(receiver);
const wrapped=guard(a,(_r,_args,_c,_l)=>{raw++;return result;});
const different=guard(a,(_r,_args,_c,_l)=>{raw++;return result;});
reject(():Completion=>wrapped(receiver,args,context,loc));
attempt(context,a,wrapped,receiver,args,loc,():Completion=>{
    reject(():Completion=>wrapped(receiver,args,other,loc));
    reject(():Completion=>wrapped(wrongReceiver,args,context,loc));
    reject(():Completion=>wrapped(receiver,wrongArgs,context,loc));
    reject(():Completion=>wrapped(receiver,args,context,wrongLoc));
    reject(():Completion=>different(receiver,args,context,loc));
    check(raw===0);
    check(wrapped(receiver,args,context,loc)===result);
    reject(():Completion=>wrapped(receiver,args,context,loc));
    check(raw===1);return result;
});
reject(():Completion=>attempt(context,b,wrapped,receiver,args,loc,():Completion=>wrapped(receiver,args,context,loc)));
const sentinel=new Error("sentinel");
const throwing=guard(a,(_r,_args,_c,_l)=>{throw sentinel;});
let same=false;
try{attempt(context,a,throwing,receiver,args,loc,():Completion=>throwing(receiver,args,context,loc));}
catch(error){same=error instanceof Error&&error===sentinel;}
check(same&&raw===1);
reject(():Completion=>throwing(receiver,args,context,loc));
check(attempt(context,a,wrapped,receiver,args,loc,():Completion=>wrapped(receiver,args,context,loc))===result&&raw===2);
console.log("PASS real-types permit tuple negatives identity replay cleanup");
