import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { GuestObject, GuestError, UNDEFINED, normal, failure, languageFailure, resourceFailure, unsupportedFailure, sameValue, display, Environment, getValue, putValue, type Value, type ValueCompletion, type ThrowCompletion, type ErrorName, type Builtin, type OperationContext, type ConstructBuiltin, type PropertyKey } from "../src/runtime.js";
import { prepareBoundedScript, type ExecutableScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag, wellKnownHasInstance } from "../src/symbols.js";
import { GlobalEnvironment } from "../src/global-environment.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment } from "../src/script-environment.js";
import { toNumber, toString, toPropertyKey } from "../src/conversion.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { projectThrow } from "../src/observation.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => { throw new Error("unexpected output"); }, "script"); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function object(value: Value): GuestObject { if (value.kind !== "object") throw new Error("object required"); return value.object; }
function prepare(text: string, realm: Realm, id: string): ExecutableScript { const p = prepareBoundedScript({ id, text }, realm); if (p.kind !== "ready") throw new Error("preparation " + p.kind + ": " + text); return p.record; }
function idle(session: ScriptSession): void { const s = session.inspect(); check(s.active === null && s.calls === 0 && s.depth === 0, "idle"); }
function run(text: string, realm: Realm, session = createScriptSession(), id = "T"): ValueCompletion { const result = evaluateScript(session, prepare(text, realm, id)); check(result.phase === "body", "body phase"); idle(session); return result.completion; }
function define(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true }); }
function data(o: GuestObject, key: PropertyKey, value: Value): void { o.bootstrapDefine(key, { value, writable: true, enumerable: false, configurable: true }); }
function own(o: GuestObject, key: string): Value { const d = o.getOwnProperty(key); if (d === undefined || d.kind !== "data") throw new Error("data required " + key); return d.value; }
function keys(o: GuestObject, expected: string[]): void { const a = o.ownPropertyKeys(); check(a.length === expected.length, "key length"); for (let i = 0; i < a.length; i++) check(a[i] === expected[i], "key order"); }
function descriptor(o: GuestObject, key: string, value: Value): void { const d = o.getOwnProperty(key); check(d !== undefined && d.kind === "data" && sameValue(d.value, value) && d.writable && !d.enumerable && d.configurable, "descriptor " + key); }
function value(c: ValueCompletion): Value { if (c.type !== "normal") throw new Error("normal required " + c.diagnostic.message); return c.value; }
function thrown(c: ValueCompletion): ThrowCompletion { if (c.type !== "throw") throw new Error("throw required"); return c; }
function error(c: ValueCompletion, r: Realm, name: ErrorName): GuestObject { const t = thrown(c), o = object(t.value); check(o instanceof GuestError && o.getPrototypeOf() === r.getErrorPrototype(name) && t.diagnostic.name === name && t.origin.kind === "engine-diagnostic", "language error " + name); return o; }
function instance(c: ValueCompletion, r: Realm, name: ErrorName, message: string | null): GuestObject { const o = object(value(c)); check(o instanceof GuestError && o.getPrototypeOf() === r.getErrorPrototype(name), "instance " + name); if (message === null) check(o.getOwnProperty("message") === undefined, "absent message"); else descriptor(o, "message", str(message)); return o; }
function hostFault(callback: () => void, message: string): void { let caught = false; try { callback(); } catch (e) { if (!(e instanceof Error) || e.message !== message) throw e; caught = true; } check(caught, "host rejection " + message); }
function exactHost(callback: () => void, sentinel: Error): void { let caught = false; try { callback(); } catch (e) { if (!(e instanceof Error) || e !== sentinel) throw e; caught = true; } check(caught, "exact host sentinel"); }
function context(r: Realm): OperationContext { return { realm: r, call: (_c, _r, _a, _l): ValueCompletion => { throw new Error("unexpected call"); }, tick: (_l) => normal() }; }
function method(o: GuestObject, key: string): Value { return own(o, key); }
function alias(r: Realm, name: string, invoke: Builtin): GuestObject { const f = r.createBuiltin(name, 0, invoke); define(r, name, obj(f)); return f; }
const loc: Location = { line: 1, column: 1 };
const names: ErrorName[] = ["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError"];
const input = readFileSync(process.argv[2], "utf8");
check(input === "E(7);\n" || input === "E(11);\n", "frozen runtime input");
const payload = input === "E(7);\n" ? "seven" : "eleven", numeric = input === "E(7);\n" ? "7" : "11", inputId = input === "E(7);\n" ? "input-a" : "input-b";
const symbol: Value = { kind: "symbol", value: new GuestSymbol("s") };
{
 const r = fresh();
 for (const n of names) { const a = instance(run(n + "();", r), r, n, null), b = instance(run("new " + n + "();", r), r, n, null); check(a !== b, "fresh call/new"); keys(a, []); keys(b, []); }
 const a = instance(run("TypeError('x');", r), r, "TypeError", "x"), b = instance(run("new TypeError('x');", r), r, "TypeError", "x"); keys(a, ["message"]); keys(b, ["message"]); define(r,"e",obj(a)); check(sameValue(value(run("e instanceof TypeError && e instanceof Error && !(e instanceof ReferenceError) && e.constructor===TypeError;",r)),{kind:"boolean",value:true}),"instanceof graph");
 instance(run("Error(undefined);",r),r,"Error",null);instance(run("Error(null);",r),r,"Error","null");instance(run("Error("+numeric+");",r),r,"Error",numeric);instance(run("Error.call(7,'x');",r),r,"Error","x");
}
console.log("PASS E01 E02 E03");
{
 const r=fresh(),q=r.createObject(),p=r.createObject(),o=new GuestObject(p);let gets=0;
 define(r,"q",obj(q));const e=instance(run("Error('x',{cause:q});",r),r,"Error","x");keys(e,["message","cause"]);descriptor(e,"cause",obj(q));
 p.bootstrapDefine("cause",{get:obj(r.createBuiltin("cause",0,(_r,_a,_c,_l)=>{gets++;return normal();})),enumerable:false,configurable:true});define(r,"o",obj(o));const u=instance(run("Error(undefined,o);",r),r,"Error",null);keys(u,["cause"]);descriptor(u,"cause",UNDEFINED);check(gets===1,"one inherited cause Get");
 for(const source of ["Error(undefined,7);","Error(undefined,null);","Error(undefined,undefined);","Error(undefined,'x');"]){keys(instance(run(source,r),r,"Error",null),[]);}check(gets===1,"primitive options ignored");
}
console.log("PASS E04 E05");
{
 const r=fresh();const fmt=method(r.getErrorPrototype("Error"),"toString");alias(r,"fmt",(_r,a,c,l)=>c.call(fmt,a[0],[],l));
 for(const pair of [[UNDEFINED,UNDEFINED],[str(""),str("x")],[str("X"),str("")],[str("X"),str("y")]]){const o=r.createObject();data(o,"name",pair[0]);data(o,"message",pair[1]);define(r,"o",obj(o));const expected=pair[0].kind==="undefined"?"Error":pair[0].kind==="string"&&pair[0].value===""?"x":pair[1].kind==="string"&&pair[1].value===""?"X":"X: y";check(sameValue(value(run("fmt(o);",r)),str(expected)),"generic format");}
 check(sameValue(value(run("Error.prototype.toString.call({});",r)),str("Error")),"generic empty");
 for(const v of [UNDEFINED,{kind:"null"} as Value,num(7),symbol]){define(r,"o",v);error(run("fmt(o);",r),r,"TypeError");}
 const original=r.getErrorConstructor("TypeError");run("TypeError.name='Changed';TypeError.prototype.name='Changed';",r);check(sameValue(value(run("TypeError('x').toString();",r)),str("Changed: x")),"prototype formatting");check(sameValue(value(run("TypeError.toString();",r)),str("function TypeError() { [native code] }")),"initial source name");run("TypeError=7;",r);const generated=error(run("null.x;",r),r,"TypeError");check(generated.getPrototypeOf()===r.getErrorPrototype("TypeError")&&r.getErrorConstructor("TypeError")===original,"intrinsic independent of globals");
 data(generated,"constructor",num(7));data(generated,"message",str("changed"));check(generated instanceof GuestError,"brand independent of properties");
}
console.log("PASS E08 E09 E11");
{
 const a=fresh(),b=fresh();for(const n of names){define(b,"E",obj(a.getErrorConstructor(n)));const x=instance(run(input,b),a,n,numeric),y=instance(run("new "+input,b),a,n,numeric);check(x!==y&&a.getErrorConstructor(n)!==b.getErrorConstructor(n),"cross Realm");}
 const branded=a.createError("Error","x");branded.setPrototypeOf(null);const tag=method(a.objectPrototype,"toString");alias(b,"tag",(_r,args,c,l)=>c.call(tag,args[0],[],l));for(const o of [branded,a.getErrorPrototype("Error"),a.createObject()]){define(b,"o",obj(o));check(sameValue(value(run("tag(o);",b)),str(o===branded?"[object Error]":"[object Object]")),"ErrorData tag");}data(branded,wellKnownToStringTag,str("Custom"));define(b,"o",obj(branded));check(sameValue(value(run("tag(o);",b)),str("[object Custom]")),"custom tag");
 // Full five-family descriptor/graph/restriction matrix also executes in inherited A03.
 for(const n of names){const ctor=a.getErrorConstructor(n),proto=a.getErrorPrototype(n);keys(ctor,n==="Error"?["name","length","prototype","isError"]:["name","length","prototype"]);const d=ctor.getOwnProperty("prototype");check(d!==undefined&&d.kind==="data"&&!d.writable&&!d.enumerable&&!d.configurable&&sameValue(d.value,obj(proto)),"immutable prototype");check(ctor.getPrototypeOf()===(n==="Error"?a.functionPrototype:a.getErrorConstructor("Error")),"constructor inheritance");descriptor(proto,"constructor",obj(ctor));check(ctor.getOwnProperty("caller")===undefined&&ctor.getOwnProperty("arguments")===undefined,"inherited restrictions");}
}
console.log("PASS E12 E13 E14");
{
 const r=fresh();let output:Value[]=[];alias(r,"out",(_r,a,_c,_l)=>{output.push(a[0]);return normal();});run("try{missing;}catch(e){out(typeof e);out(e.constructor===ReferenceError);}try{throw 'ReferenceError: fake';}catch(e){out(typeof e);}",r);check(output.length===3&&sameValue(output[0],str("object"))&&sameValue(output[1],{kind:"boolean",value:true})&&sameValue(output[2],str("string")),"catch object and synthetic string");
 for(const source of ["{x;let x;}","{x=1;let x;}","function f(){x;let x;}f();","function f(){x=1;let x;}f();"]){const local=fresh();error(run(source,local),local,"ReferenceError");}

}
console.log("PASS E15");
{
 const a=fresh(),b=fresh(),c=context(b);const env=a.globalEnvironment;env.createMutableBinding("tdz",loc,a);error(env.getBindingValue("tdz",c,loc),b,"ReferenceError");error(env.setMutableBinding("tdz",num(7),c,loc),b,"ReferenceError");
 const block=new ScriptDeclarativeEnvironment({kind:"global",record:env});block.createMutableBinding("x",loc);error(block.getBindingValue("x",c,loc),b,"ReferenceError");error(block.setMutableBinding("x",num(1),c,loc),b,"ReferenceError");
 run("function f(){}",a);const fn=object(own(a.globalObject,"f")).callable;if(fn===null||fn.kind!=="script-guest")throw new Error("Script function");const activation=new ScriptFunctionEnvironment({kind:"global",record:env},UNDEFINED,fn);activation.createMutableBinding("x",loc);error(activation.getBindingValue("x",c,loc),b,"ReferenceError");error(activation.setMutableBinding("x",num(1),c,loc),b,"ReferenceError");
 error(env.createMutableBinding("tdz",loc,a),a,"TypeError");check(thrown(env.createMutableBinding("tdz",loc,null)).value.kind==="string","explicit null legacy");hostFault(()=>{block.getBindingValue("absent",c,loc);},"missing binding: absent");
}
console.log("PASS E16 E23");
{
 for(const source of ["null.x;","7();","new 7();","'x' in 7;","7 instanceof 7;","7 instanceof {};","let k=function(){};k.prototype=7;({}) instanceof k;"]){const r=fresh();error(run(source,r),r,"TypeError");}
 const r=fresh(),o=r.createObject();o.bootstrapDefine("x",{value:num(1),writable:false,enumerable:true,configurable:false});define(r,"o",obj(o));error(run("'use strict';o.x=2;",r),r,"TypeError");error(run("'use strict';delete o.x;",r),r,"TypeError");run("o.x=2;",r);check(sameValue(own(o,"x"),num(1)),"sloppy write");check(sameValue(value(run("delete o.x;",r)),{kind:"boolean",value:false}),"sloppy delete");
 const e=new Environment(null);e.bindings.set("x",{initialized:true,mutable:false,value:num(1)});const immutable=putValue({kind:"binding",environment:e,name:"x"},num(2),context(r),loc);if(immutable.type!=="throw")throw new Error("immutable throw");error(immutable,r,"TypeError");
 const k=r.createObject();data(k,wellKnownHasInstance,num(1));define(r,"k",obj(k));error(run("o instanceof k;",r),r,"TypeError");
 const foreign=fresh(),array=foreign.createArray();define(r,"a",obj(array));error(run("a.length=1.5;",r),r,"RangeError");check(sameValue(own(array,"length"),num(0)),"no mutation");let calls=0;const length=foreign.createObject();data(length,"valueOf",obj(foreign.createBuiltin("valueOf",0,(_r,_a,_c,_l)=>{calls++;return normal(num(1.5));})));define(r,"n",obj(length));error(run("a.length=n;",r),r,"RangeError");check(calls===2&&sameValue(own(array,"length"),num(0)),"two length coercions");
}
console.log("PASS E17 E18 E19");
{
 const a=fresh(),b=fresh();let radixEffects=0;const rad=b.createObject();data(rad,"valueOf",obj(b.createBuiltin("valueOf",0,(_r,_a,_c,_l)=>{radixEffects++;return normal(num(1));})));define(b,"rad",obj(rad));
 for(const prototype of [a.numberPrototype,a.stringPrototype,a.booleanPrototype,a.symbolPrototype]){const target=method(prototype,"toString");alias(b,"m",(_r,args,c,l)=>c.call(target,args[0],args.slice(1),l));error(run("m({},rad);",b),a,"TypeError");}check(radixEffects===0,"receiver before radix");
 const target=method(a.numberPrototype,"toString");alias(b,"m",(_r,args,c,l)=>c.call(target,args[0],args.slice(1),l));error(run("m(7,1);",b),a,"RangeError");error(run("m(7,37);",b),a,"RangeError");
 define(b,"f",obj(a.getErrorConstructor("Error")));const s=createScriptSession();error(run("f.caller;",b,s),a,"TypeError");check(s.inspect().steps===4&&s.inspect().lastAbrupt?.realm===a,"restricted getter attribution");error(run("f.arguments=7;",b),a,"TypeError");
}
console.log("PASS E20 E21");
{
 for(const text of ["let x;","function x(){}","var x;"]){const r=fresh();run("let x;",r);const s=createScriptSession(),result=evaluateScript(s,prepare(text,r,"second"));check(result.phase==="instantiation","conflict phase");error(result.completion,r,"SyntaxError");check(s.inspect().steps===1&&s.inspect().lastAbrupt?.unitId==="second","instantiation provenance");idle(s);}
 for(const text of ["let x;","function x(){}","var y;"]){const r=fresh();r.defineScriptGlobal("x",{value:num(7),writable:false,enumerable:false,configurable:false});r.globalObject.preventExtensions();const s=createScriptSession(),result=evaluateScript(s,prepare(text,r,"restricted"));check(result.phase==="instantiation","restriction phase");error(result.completion,r,text.startsWith("let")?"SyntaxError":"TypeError");check(s.inspect().steps===(text.startsWith("let")?1:text.startsWith("function")?2:3),"only declaration ticks");idle(s);}
}
console.log("PASS E22");
{
 const r=fresh(),c=context(r);const n=toNumber(symbol,loc,r),s=toString(symbol,loc,r);if(n.type!=="throw"||s.type!=="throw")throw new Error("conversion throws");error(n,r,"TypeError");error(s,r,"TypeError");const key=toPropertyKey(symbol,c,loc);check(key.type==="normal"&&key.value===symbol.value,"symbol key identity");for(const result of [toNumber(obj(r.createObject()),loc,r),toString(obj(r.createObject()),loc,r)])check(result.type==="throw"&&result.origin.kind==="unsupported-operation","unsupported primitive helper");
 let calls=0;const callback=r.createBuiltin("cb",0,(_r,_a,_c,_l)=>{calls++;return normal();});const o=r.createObject();data(o,"length",num(0));alias(r,"map",(_r,args,c,l)=>mapObjectDefaultArray(o,args[0],UNDEFINED,c,l));error(run("map(7);",r),r,"TypeError");data(o,"length",num(4294967296));define(r,"cb",obj(callback));error(run("map(cb);",r),r,"RangeError");check(calls===0,"no oversized callbacks");const a=r.createArray();data(a,"constructor",num(7));alias(r,"species",(_r,_a,c,l)=>mapObjectDefaultArray(a,obj(callback),UNDEFINED,c,l));const invalidSpecies=run("species();",r);error(invalidSpecies,r,"TypeError");check(thrown(invalidSpecies).diagnostic.message==="map species is not a constructor"&&calls===0,"invalid species language error before callbacks");
}
console.log("PASS E24 E25");
{
 for(const q of [obj(fresh().createObject()),num(7),str("q"),UNDEFINED,obj(fresh().createError("Error","q"))]){const r=fresh();define(r,"q",q);let seen=false;alias(r,"out",(_r,a,_c,_l)=>{seen=a[0].kind==="boolean"&&a[0].value;return normal();});const t=thrown(run("try{throw q;}catch(e){out(e===q);throw e;}",r));check(seen&&sameValue(t.value,q)&&t.origin.kind==="guest","exact guest rethrow");}
 const a=fresh(),b=fresh();const session=createScriptSession();run("function f(){missing;}",a,session,"H");define(b,"f",own(a.globalObject,"f"));const first=run("f();",b,session,"T");error(first,a,"ReferenceError");check(session.inspect().lastAbrupt?.unitId==="H"&&session.inspect().lastAbrupt?.realm===a,"function source transfer");const captured=thrown(first);alias(b,"same",(_r,_a,_c,_l)=>captured);run("try{same();}catch(e){}",b,session,"caught");check(run("same();",b,session,"again")===captured&&session.inspect().lastAbrupt?.unitId==="again","consumed history reset");const rethrow=thrown(run("try{f();}catch(e){throw e;}",b,session,"T-rethrow"));check(object(rethrow.value).getPrototypeOf()===a.getErrorPrototype("ReferenceError")&&rethrow.origin.kind==="guest","rethrow keeps Error object");check(session.inspect().lastAbrupt?.unitId==="T-rethrow"&&session.inspect().lastAbrupt?.realm===b,"rethrow source");
}
console.log("PASS E26 E27 E28");
{
 const r=fresh();let effects=0;alias(r,"out",(_r,_a,_c,_l)=>{effects++;return normal();});for(const source of ["try{while(true){}}catch(e){out(9);}","function f(){f();}try{f();}catch(e){out(9);}","function K(){new K();}try{new K();}catch(e){out(9);}"]){const t=thrown(run(source,r,createScriptSession({maxSteps:50,maxCalls:3})));check(t.origin.kind==="resource-limit"&&t.value.kind==="string","resource bypass");}check(effects===0,"catch not run");const blocked=prepareBoundedScript({id:"blocked",text:"Error('x');for(let x of []){}"},r);check(blocked.kind!=="ready","whole unit rejection");
 const synthetic=failure("TypeError","synthetic",loc),resource=resourceFailure("steps",1,0,"step limit exceeded",loc),unsupported=unsupportedFailure("runtime.object-to-string","TypeError","unsupported",loc),t=thrown(run("missing;",r));for(const result of [t,synthetic]){const observation=projectThrow(result);check(observation.kind==="throw"&&observation.constructor.name===null&&observation.constructor.realmId===null&&observation.constructor.secondary===null&&observation.constructor.outcome===(result===t?"unsupported":"absent"),"projection");}check(projectThrow(resource).kind==="resource-limit"&&projectThrow(unsupported).kind==="unsupported-syntax","origin projection");
 const e=object(t.value);for(const key of ["name","message","constructor"]){e.bootstrapDefine(key,{get:obj(r.createBuiltin("poison",0,(_r,_a,_c,_l):ValueCompletion=>{effects++;throw new Error("poison");})),enumerable:false,configurable:true});}const before=t.diagnostic.message;check(display(t.value)==="[object Object]"&&projectThrow(t).kind==="throw"&&t.diagnostic.message===before&&effects===0,"diagnostic rendering never coerces");
}
console.log("PASS E31 E34 E35 E36");

// Literal event schedules copied from the accepted, pre-production freeze.
const traces: {id:string;sourceA:string;sourceB:string;columns:number[];effects:string[];sourceTicks:number}[] = [
  {
    "id": "T01",
    "sourceA": "E(7);\n",
    "sourceB": "E(11);\n",
    "columns": [
      1,
      1,
      3,
      1
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3
  },
  {
    "id": "T02",
    "sourceA": "new E(7);\n",
    "sourceB": "new E(11);\n",
    "columns": [
      1,
      1,
      5,
      7,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4
  },
  {
    "id": "T03",
    "sourceA": "E(\"x\",o);\n",
    "sourceB": "E(\"x\",o);\n",
    "columns": [
      1,
      1,
      3,
      7,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4
  },
  {
    "id": "T04",
    "sourceA": "E(\"x\",o);\n",
    "sourceB": "E(\"x\",o);\n",
    "columns": [
      1,
      1,
      3,
      7,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4
  },
  {
    "id": "T05",
    "sourceA": "E(m);\n",
    "sourceB": "E(m);\n",
    "columns": [
      1,
      1,
      3,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "M"
    ],
    "sourceTicks": 3
  },
  {
    "id": "T06",
    "sourceA": "E(m,o);\n",
    "sourceB": "E(m,o);\n",
    "columns": [
      1,
      1,
      3,
      5,
      1,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "",
      "M",
      "",
      "C"
    ],
    "sourceTicks": 4
  },
  {
    "id": "T07",
    "sourceA": "E(m,o);\n",
    "sourceB": "E(m,o);\n",
    "columns": [
      1,
      1,
      3,
      5,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "M",
      "",
      "C"
    ],
    "sourceTicks": 4
  },
  {
    "id": "T08",
    "sourceA": "fmt(o);\n",
    "sourceB": "fmt(o);\n",
    "columns": [
      1,
      1,
      5,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3
  },
  {
    "id": "T09",
    "sourceA": "fmt(o);\n",
    "sourceB": "fmt(o);\n",
    "columns": [
      1,
      1,
      5,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "N",
      "",
      "n",
      "M",
      "",
      "m"
    ],
    "sourceTicks": 3
  },
  {
    "id": "T10",
    "sourceA": "new E(m,o);\n",
    "sourceB": "new E(m,o);\n",
    "columns": [
      1,
      1,
      5,
      7,
      9,
      1,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "M",
      "",
      "C"
    ],
    "sourceTicks": 5
  },
  {
    "id": "T11",
    "sourceA": "new E(m,o);\n",
    "sourceB": "new E(m,o);\n",
    "columns": [
      1,
      1,
      5,
      7,
      9,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "",
      "M",
      "",
      "C"
    ],
    "sourceTicks": 5
  },
  {
    "id": "T12",
    "sourceA": "E(m);\n",
    "sourceB": "E(m);\n",
    "columns": [
      1,
      1,
      3,
      1,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "M",
      "V"
    ],
    "sourceTicks": 3
  },
  {
    "id": "T19",
    "sourceA": "missing;\n",
    "sourceB": "missing;\n",
    "columns": [
      1,
      1
    ],
    "effects": [
      "",
      ""
    ],
    "sourceTicks": 2
  },
  {
    "id": "T20",
    "sourceA": "E(s,o);\n",
    "sourceB": "E(s,o);\n",
    "columns": [
      1,
      1,
      3,
      5,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4
  },
  {
    "id": "T21",
    "sourceA": "fmt(o);\n",
    "sourceB": "fmt(o);\n",
    "columns": [
      1,
      1,
      5,
      1
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3
  }
];
function traceRun(trace: {id:string;sourceA:string;sourceB:string;columns:number[];effects:string[];sourceTicks:number}, cross: boolean, seed: number, limit: number, maxCalls: number, stop: string, mode: number): void {
 const a=fresh(),b=cross?fresh():a,h=fresh(),s=createScriptSession({maxSteps:limit,maxCalls});let effects="";
 const sentinel=new Error("host sentinel"),foreign=h.createError("Error","foreign"),q:ThrowCompletion={type:"throw",value:mode===1?num(7):obj(foreign),diagnostic:{phase:"runtime",name:"Error",message:"q",loc},origin:{kind:"guest"}};
 const unsupported=unsupportedFailure("runtime.object-to-string","TypeError","unsupported",loc);
 const m=a.createObject(),optionsProto=a.createObject(),o=new GuestObject(optionsProto),name=a.createObject(),msg=a.createObject();
 const hook=(letter:string, result:Value): GuestObject=>h.createBuiltin(letter,0,(_receiver,_args,c,_loc):ValueCompletion=>{effects+=letter;check(c.realm===h,"hook active Realm");if(stop===letter){if(mode===3)return unsupported;if(mode===4)throw sentinel;return q;}return normal(result);});
 const messageGetter=hook("M",obj(msg));
 data(msg,"toString",obj(hook("m",str(payload))));
 data(name,"toString",obj(h.createBuiltin("n",0,(_r,_args,_c,_l):ValueCompletion=>{effects+="n";if(stop==="n"){if(mode===3)return unsupported;if(mode===4)throw sentinel;return q;}o.bootstrapDefine("message",{get:obj(messageGetter),enumerable:false,configurable:true});return normal(str("X"));})));
 const id=trace.id;
 if(id==="T09"){
  o.bootstrapDefine("name",{get:obj(hook("N",obj(name))),enumerable:false,configurable:true});
  o.bootstrapDefine("message",{get:obj(h.createBuiltin("stale",0,(_r,_a,_c,_l):ValueCompletion=>{throw new Error("stale message getter");})),enumerable:false,configurable:true});
 }else if(id==="T08"){data(o,"name",str("X"));data(o,"message",str("y"));}
 else if(id==="T21"){data(o,"name",symbol);o.bootstrapDefine("message",{get:obj(h.createBuiltin("poison",0,(_r,_a,_c,_l):ValueCompletion=>{throw new Error("message after Symbol name");})),enumerable:false,configurable:true});}
 else if(id==="T03")data(o,"cause",num(7));
 else if(id!=="T04")optionsProto.bootstrapDefine("cause",{get:obj(hook("C",num(7))),enumerable:false,configurable:true});
 const protocol=id==="T07"||id==="T11";
 data(m,protocol?wellKnownToPrimitive:"toString",obj(hook("M",id==="T12"?obj(m):str(payload))));if(id==="T12")data(m,"valueOf",obj(hook("V",obj(m))));
 define(b,"E",obj(a.getErrorConstructor("Error")));define(b,"m",obj(m));define(b,"o",obj(o));define(b,"s",symbol);
 const fmt=method(a.getErrorPrototype("Error"),"toString");alias(b,"fmt",(_r,args,c,l)=>c.call(fmt,args[0],[],l));
 if(seed===7){run("0;0;0;",b,s,"seed");run(";",b,s,"seed");check(s.inspect().steps===7,"seven seed");}
 const source=inputId==="input-a"?trace.sourceA:trace.sourceB;
 let result:ValueCompletion=normal(),host=false;
 try{result=run(source,b,s,inputId);}catch(e){if(!(e instanceof Error)||e!==sentinel)throw e;host=true;}
 idle(s);const n=trace.columns.length,k=limit-seed,stopIndex=trace.effects.indexOf(stop),stopReached=stop!==""&&stopIndex>=0&&k>=stopIndex+1;
 if(maxCalls===64){
  const ticks=stopReached?stopIndex+1:Math.min(k+1,n);check(s.inspect().steps===seed+ticks,id+" exact steps");
  const expectedEffects=trace.effects.slice(0,stopReached?stopIndex+1:Math.min(k,n)).join("");check(effects===expectedEffects,id+" effect prefix "+k+" "+effects);
  if(stopReached){check(host===(mode===4),id+" host classification");if(!host)check(result===(mode===3?unsupported:q),id+" exact abrupt completion");const provenance=s.inspect().lastAbrupt;if(mode!==4)check(provenance!==null&&provenance.realm===h&&provenance.unitId===inputId,id+" hook provenance");return;}
  check(!host,id+" no host escape");
  if(k<n){const t=thrown(result);check(t.origin.kind==="resource-limit"&&t.origin.guardCode==="steps"&&t.origin.count===seed+k+1&&t.origin.limit===limit,id+" resource prefix");check(t.diagnostic.loc.line===1&&t.diagnostic.loc.column===trace.columns[k],id+" coordinate "+k);const provenance=s.inspect().lastAbrupt;check(provenance!==null&&provenance.unitId===inputId&&provenance.realm===(k<trace.sourceTicks?b:a),id+" prefix Realm/source");return;}
 }else if(id!=="T19"&&maxCalls<=1){
  if(maxCalls===0||id==="T08"||id==="T09"||id==="T21"||trace.effects.some(e=>e!=="")){
   const t=thrown(result);check(t.origin.kind==="resource-limit"&&t.origin.guardCode==="calls"&&t.origin.count===maxCalls&&t.origin.limit===maxCalls,id+" call guard");const ticks=maxCalls===0?trace.sourceTicks:(id==="T08"||id==="T09"||id==="T21")?3:trace.effects.findIndex(e=>e!=="")+1;check(s.inspect().steps===ticks&&effects==="",id+" call guard ordering");return;
  }
 }
 if(id==="T19")error(result,b,"ReferenceError");else if(id==="T12"||id==="T20"||id==="T21")error(result,a,"TypeError");else if(id==="T08"||id==="T09")check(sameValue(value(result),str(id==="T08"?"X: y":"X: "+payload)),id+" format result");
 else {const message=id==="T01"||id==="T02"?numeric:id==="T03"||id==="T04"?"x":payload;const e=instance(result,a,"Error",message);const cause=id==="T03"||id==="T06"||id==="T07"||id==="T10"||id==="T11";keys(e,cause?["message","cause"]:["message"]);if(cause)descriptor(e,"cause",num(7));}
}
let prefixes=0;
for(const trace of traces){
 for(const cross of [false,true])for(const seed of [0,7])for(let k=0;k<=trace.columns.length+1;k++){traceRun(trace,cross,seed,seed+k,64,"",0);prefixes++;}
 for(const cross of [false,true])for(const maxCalls of [0,1,trace.id==="T09"?3:2])traceRun(trace,cross,0,1000,maxCalls,"",0);
 for(const letter of trace.effects)if(letter!=="")for(const mode of [1,2,3,4])for(const cross of [false,true])for(const seed of [0,7])for(let k=0;k<=trace.columns.length+1;k++)traceRun(trace,cross,seed,seed+k,64,letter,mode);
}
console.log("PASS E06 E07 E10 E29 E30 E32 E33 frozen B traces");
console.log("PASS B prefixes "+prefixes);
function constructSlot(o:GuestObject):ConstructBuiltin { const slot=o.constructorSlot;if(slot===null||slot.kind!=="builtin-constructor")throw new Error("builtin constructor slot");return slot.invoke; }
function callSlot(o:GuestObject):Builtin { const slot=o.callable;if(slot===null||slot.kind!=="builtin")throw new Error("builtin call slot");return slot.invoke; }
{
 const a=fresh(),b=fresh(),legacy=new Realm((_line:string)=>{});let callbacks=0,gets=0,ticks=0;
 const k=a.createBuiltinConstructor("K",0,(_r,_a,_c,_l)=>normal(),(_callee,_args,_c,_l)=>{callbacks++;return normal(obj(a.createObject()));});const invoke=constructSlot(k);
 const c:OperationContext={realm:a,call:(_f,_r,_a,_l):ValueCompletion=>{throw new Error("unauthorized call");},tick:(_l)=>{ticks++;return normal();}};
 hostFault(()=>{invoke(k,[],c,loc);},"Script execution unavailable");hostFault(()=>{invoke(k,[],context(b),loc);},"Script execution unavailable");hostFault(()=>{invoke(k,[],context(legacy),loc);},"cross-profile callable invocation");check(callbacks===0&&gets===0&&ticks===0,"raw guards before effects");
 const shell=new GuestObject(a.functionPrototype,false,k.callable,k.constructorSlot);shell.bootstrapDefine("prototype",{get:obj(a.createBuiltin("poison",0,(_r,_a,_c,_l)=>{gets++;return normal(obj(a.objectPrototype));})),enumerable:false,configurable:true});define(a,"K",obj(shell));const s=createScriptSession();hostFault(()=>{run("new K();",a,s);},"invalid builtin constructor metadata");check(s.inspect().steps===3&&gets===0&&callbacks===0,"copied slot rejected before Get");idle(s);
 const other=a.createBuiltinConstructor("Other",0,(_r,_a,_c,_l)=>normal(),(_c,_a,_ctx,_l)=>normal(obj(a.createObject())));define(a,"K",obj(new GuestObject(a.functionPrototype,false,other.callable,k.constructorSlot)));const ss=createScriptSession();hostFault(()=>{run("new K();",a,ss);},"invalid builtin constructor metadata");check(ss.inspect().steps===3&&gets===0&&callbacks===0,"mismatched records before effects");idle(ss);
 let retained:OperationContext|null=null;
 alias(a,"make",(_r,args,ctx,l)=>{retained=ctx;hostFault(()=>{invoke(k,args.slice(),ctx,l);},"Script execution unavailable");hostFault(()=>{invoke(k,args,ctx,{line:l.line,column:l.column});},"Script execution unavailable");return normal();});const active=createScriptSession();run("make(7);",a,active);check(active.inspect().steps===3&&callbacks===0,"G06/G07 reachable missing-permit controls");
 alias(b,"make",(_r,_args,_ctx,_l)=>{const old=retained;if(old===null)throw new Error("retained context");hostFault(()=>{invoke(k,[],old,loc);},"Script execution unavailable");check(active.inspect().steps===3,"old owner unchanged");return normal();});const later=createScriptSession();run("make(7);",b,later);check(later.inspect().steps===3&&callbacks===0,"retained owner denial");
}
console.log("PASS G01 G02 G03 G04 G05 G06 G07 G09");
{
 const r=fresh();let callbacks=0,leafCalls=0;const leaf=r.createBuiltin("leaf",0,(_r,_a,_c,_l)=>{leafCalls++;return normal(num(7));});
 const k=r.createBuiltinConstructor("K",0,(_r,_a,_c,_l)=>normal(),(callee,args,c,l):ValueCompletion=>{callbacks++;const invoke=constructSlot(callee);hostFault(()=>{invoke(callee,args,c,l);},"Script execution unavailable");hostFault(()=>{callSlot(callee)(UNDEFINED,args,c,l);},"Script execution unavailable");check(sameValue(value(c.call(obj(leaf),UNDEFINED,[],l)),num(7)),"nested legitimate call");hostFault(()=>{invoke(callee,args,c,l);},"Script execution unavailable");return normal(obj(r.createObject()));});define(r,"K",obj(k));const s=createScriptSession();run("new K();",r,s);check(callbacks===1&&leafCalls===1&&s.inspect().steps===3,"one-use and cross-tag");
 const ordinary=r.createBuiltin("ordinary",0,(_r,_a,_c,_l)=>normal());check(ordinary.constructorSlot===null,"ordinary builtin nonconstructible");
}
console.log("PASS G08 cross-tag legitimate nested call");
type RetainedCall = { invoke: Builtin; receiver: Value; args: Value[]; context: OperationContext; loc: Location };
function rejectRetained(call: RetainedCall | null): void {
 if(call===null)throw new Error("missing retained callback");
 hostFault(()=>{call.invoke(call.receiver,call.args,call.context,call.loc);},"Script execution unavailable");
}
for(const constructing of [false,true])for(const mode of [0,1,2]){
 const a=fresh(),b=fresh(),outer=createScriptSession(),inner=createScriptSession(),sentinel=new Error("inner host"),q=num(7);let effects="",restorations=0;let retainedOuter:RetainedCall|null=null;
 define(b,"q",q);alias(b,"h",(_r,_a,_c,_l):ValueCompletion=>{throw sentinel;});const m=a.createObject(),o=a.createObject();
 const messageHook=a.createBuiltin("M",0,(receiver,args,c,l):ValueCompletion=>{
  retainedOuter={invoke:callSlot(messageHook),receiver,args,context:c,loc:l};
  effects+="M";const before=outer.inspect();
  check(before.steps===(constructing?7:6)&&before.active?.realm===a&&before.calls===2&&before.depth===2,"outer hook checkpoint");
  try {
   const result=run(mode===0?"0;":mode===1?"throw q;":"h();",b,inner,"inner");
   if(result.type==="throw")return result;return normal(str(payload));
  } finally {
   // Inspect the still-active outer hook even while a host sentinel unwinds.
   const after=outer.inspect(),prior=before.active,current=after.active;
   if(prior===null||current===null)throw new Error("missing restored outer frame");
   check(current.record===prior.record&&current.realm===a&&current.scopeId===prior.scopeId&&
    current.lexical===prior.lexical&&current.variable===prior.variable&&current.function===prior.function&&
    current.strict===prior.strict&&sameValue(current.thisValue,prior.thisValue)&&
    current.privateEnvironment===prior.privateEnvironment&&current.phase===prior.phase,"nested frame restoration");
   check(after.calls===2&&after.depth===2&&after.steps===before.steps&&c.realm===a,"nested state restoration");
   check(inner.inspect().steps===2,"inner exit literal ticks");idle(inner);
   rejectRetained(retainedOuter);
   check(outer.inspect().steps===before.steps&&outer.inspect().calls===2&&outer.inspect().depth===2,"raw denial during unwind has no effects");
   restorations++;
  }
 });
 data(m,wellKnownToPrimitive,obj(messageHook));
 o.bootstrapDefine("cause",{get:obj(a.createBuiltin("C",0,(_r,_args,_c,_l)=>{effects+="C";return normal(num(7));})),enumerable:false,configurable:true});define(a,"E",obj(a.getErrorConstructor("Error")));define(a,"m",obj(m));define(a,"o",obj(o));
 const source=constructing?"new E(m,o);":"E(m,o);";
 if(mode===2)exactHost(()=>{run(source,a,outer,inputId);},sentinel);else {const result=run(source,a,outer,inputId);if(mode===1)check(sameValue(thrown(result).value,q),"nested language throw");else instance(result,a,"Error",payload);}
 check(inner.inspect().steps===2&&effects===(mode===0?"MC":"M"),"inner ticks and outer continuation");check(outer.inspect().steps===(constructing?(mode===0?9:7):(mode===0?8:6)),"outer cutoff");idle(inner);idle(outer);check(sameValue(value(run("7;",a)),num(7)),"session works after exit");
 check(restorations===1,"finally checked every exit mode");
 const outerSteps=outer.inspect().steps,innerSteps=inner.inspect().steps;
 rejectRetained(retainedOuter);check(outer.inspect().steps===outerSteps&&inner.inspect().steps===innerSteps,"stale outer callback idle denial");
 // Reenter both original owners; a newly allocated session cannot prove recovery.
 for(const owner of [{realm:a,session:outer,id:"reuse-outer"},{realm:b,session:inner,id:"reuse-inner"}]){
  const start=owner.session.inspect().steps;let calls=0;let retained:RetainedCall|null=null;
  const record=prepare("resume(7);",owner.realm,owner.id);
  const resume=alias(owner.realm,"resume",(receiver,args,c,l):ValueCompletion=>{
   calls++;retained={invoke:callSlot(resume),receiver,args,context:c,loc:l};
   const active=owner.session.inspect();
   check(c.realm===owner.realm&&active.active?.realm===owner.realm&&active.active?.record===record&&
    active.calls===1&&active.depth===2&&active.steps===start+3,"same-owner guarded reuse literal state");
   check(args.length===1&&sameValue(args[0],num(7)),"reuse argument");
   rejectRetained(retainedOuter);rejectRetained(retained);
   const denied=owner.session.inspect();
   check(calls===1&&denied.steps===start+3&&denied.calls===1&&denied.depth===2&&denied.active?.record===record,"live stale denial has no effects");
   return normal(num(7));
  });
  const result=evaluateScript(owner.session,record);
  check(result.phase==="body"&&sameValue(value(result.completion),num(7))&&calls===1,"original owner reuse result");
  check(owner.session.inspect().steps===start+3,"original owner cumulative delta three");idle(owner.session);
  rejectRetained(retained);rejectRetained(retainedOuter);
  check(calls===1&&owner.session.inspect().steps===start+3,"idle retained callback denial has no effects");idle(owner.session);
 }
 check(outer.inspect().steps===outerSteps+3&&inner.inspect().steps===innerSteps+3,"both original sessions reused");idle(outer);idle(inner);
}
console.log("PASS G10 nested normal language host");
console.log("PASS runtime "+inputId+" "+numeric+" "+payload);
// Additional Symbol-producing hooks and generic formatting failure order.
{
 const a=fresh(),b=fresh(),m=b.createObject(),o=b.createObject();let effects="";
 data(m,wellKnownToPrimitive,obj(b.createBuiltin("M",0,(_r,_a,_c,_l)=>{effects+="M";return normal(symbol);})));o.bootstrapDefine("cause",{get:obj(b.createBuiltin("C",0,(_r,_a,_c,_l)=>{effects+="C";return normal();})),configurable:true});define(b,"E",obj(a.getErrorConstructor("Error")));define(b,"m",obj(m));define(b,"o",obj(o));error(run("E(m,o);",b),a,"TypeError");check(effects==="M","Symbol hook rejects before cause");
 const fmt=method(a.getErrorPrototype("Error"),"toString");alias(b,"fmt",(_r,args,c,l)=>c.call(fmt,args[0],[],l));for(const key of ["name","message"]){effects="";const r=b.createObject();data(r,"name",str("X"));data(r,"message",str("x"));data(r,key,obj(m));define(b,"o",obj(r));error(run("fmt(o);",b),a,"TypeError");check(effects==="M","Symbol conversion once");}
}
console.log("PASS Symbol hooks and formatting conversion");
