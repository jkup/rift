import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript, prepareStrictScript, type ExecutableScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { GuestObject, UNDEFINED, normal, sameValue, type Value, type ValueCompletion, type ThrowCompletion, type Builtin, type OperationContext, type PropertyKey, type PropertyDescriptorUpdate } from "../src/runtime.js";
import { GuestNumber, GuestBoolean, GuestStringObject, GuestSymbolObject } from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { ScriptDeclarativeEnvironment, resolveScriptBinding, getScriptBinding } from "../src/script-environment.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
const loc = { line: 1, column: 1 };
function prepare(text: string, realm: Realm, id = "T"): ExecutableScript {
 const p = prepareBoundedScript({ id, text }, realm);
 if (p.kind !== "ready") throw new Error("prepare " + p.kind + ": " + text);
 return p.record;
}
function idle(s: ScriptSession): void { const i=s.inspect(); check(i.active===null && i.calls===0 && i.depth===0,"idle"); }
function run(text: string, r: Realm, s=createScriptSession(), id="T"): ValueCompletion { const result=evaluateScript(s,prepare(text,r,id)); idle(s); return result.completion; }
function define(r: Realm, name: string, value: Value): void { r.defineScriptGlobal(name,{value,writable:true,enumerable:true,configurable:true}); }
function obj(o: GuestObject): Value { return {kind:"object",object:o}; }
function number(n: number): Value { return {kind:"number",value:n}; }
function builtin(r: Realm, name: string, cb: Builtin): Value { return obj(r.createBuiltin(name,1,cb)); }
function own(r: Realm,name: string): Value { const d=r.globalObject.getOwnProperty(name); if(d===undefined || d.kind!=="data")throw new Error("missing "+name);return d.value; }
function scalar(v: Value): string { if(v.kind==="number" || v.kind==="string" || v.kind==="boolean")return ""+v.value;return v.kind; }
function recorder(r: Realm, values: Value[]): void { define(r,"out",builtin(r,"out",(_t,a,_c,_l): ValueCompletion=>{values.push(a[0]);return normal();})); }
function expect(c: ValueCompletion, value: Value, label: string): void { check(c.type==="normal" && sameValue(c.value,value),label); }
function throws(c: ValueCompletion,name: string): void { check(c.type==="throw" && c.diagnostic.name===name,"throw "+name); }
function context(r: Realm): OperationContext { return {realm:r,tick:(_l)=>normal(),call:(_v,_t,_a,_l): ValueCompletion=>{throw new Error("setup call");}}; }
function property(r: Realm,o: GuestObject,key: PropertyKey,d: PropertyDescriptorUpdate): void { const c=o.defineOwnProperty(key,d,context(r),loc);check(c.type==="normal" && c.value,"define property"); }
function frozen(o: GuestObject,key: string,v: Value): void { o.bootstrapDefine(key,{value:v,writable:false,enumerable:true,configurable:false}); }
function logCase(id: string, source: string, expected: string): void {const r=fresh(),out: Value[]=[];recorder(r,out);check(run(source,r).type==="normal",id+" completion");check(out.map(scalar).join(",")===expected,id+" output");console.log("PASS "+id);}
const input=readFileSync(process.argv[2],"utf8");
check(input==="function f(){return this;}out(f.call(7));7;\n" || input==="function f(){return this;}out(f.call(11));11;\n","runtime source exact");
const ir=fresh(), inputOut: Value[]=[];recorder(ir,inputOut);const expectedInput=input.includes("11")?11:7;expect(run(input,ir),number(expectedInput),"runtime result");const inputBox=inputOut[0];check(inputBox.kind==="object" && inputBox.object instanceof GuestNumber && inputBox.object.numberData===expectedInput && inputBox.object.getPrototypeOf()===ir.numberPrototype,"runtime defining box");console.log("PASS runtime source");
logCase("M01","function f(){return this;}out(f()===this);","true");
logCase("M02",'function f(){"use strict";return this;}out(f());',"undefined");
for(const strict of [false,true]){const r=fresh(),out: Value[]=[];recorder(r,out);run((strict?'"use strict";':'')+'function f(){return this;}',r,createScriptSession(),"H");run(strict?'out(f());':'"use strict";out(f()===this);',r);check(strict?out[0].kind==="undefined":out[0].kind==="boolean" && out[0].value,"M03/M04");}
console.log("PASS M03-M04");
logCase("M05","function f(){return this;}out(f.call(null)===this);out(f.call(undefined)===this);","true,true");
logCase("M06",'function f(){"use strict";return this;}out(f.call(null));out(f.call(3));',"null,3");
{
 const a=fresh(),b=fresh(),out: Value[]=[];recorder(b,out);run("function f(){return this;}",a);const f=own(a,"f");define(b,"f",f);
 const symbol=new GuestSymbol("canonical"),o=new GuestObject(a.objectPrototype);define(b,"sym",{kind:"symbol",value:symbol});define(b,"o",obj(o));
 run('"use strict";out(f());out(f.call(3));out(f.call(3));out(f.call(false));out(f.call(""));out(f.call(sym));out(f.call(o));',b);
 check(sameValue(out[0],a.globalThisValue),"M09 global");
 for(const i of [1,2]){const v=out[i];check(v.kind==="object" && v.object instanceof GuestNumber && v.object.numberData===3 && v.object.getPrototypeOf()===a.numberPrototype,"M07 Number");}
 check(!sameValue(out[1],out[2]),"fresh boxes");
 const bv=out[3],sv=out[4],yv=out[5];check(bv.kind==="object" && bv.object instanceof GuestBoolean && !bv.object.booleanData && bv.object.getPrototypeOf()===a.booleanPrototype,"Boolean");
 check(sv.kind==="object" && sv.object instanceof GuestStringObject && sv.object.stringData==="" && sv.object.getPrototypeOf()===a.stringPrototype,"String");
 check(yv.kind==="object" && yv.object instanceof GuestSymbolObject && yv.object.symbolData===symbol && yv.object.getPrototypeOf()===a.symbolPrototype,"Symbol");check(sameValue(out[6],obj(o)),"object identity");
 check(f.kind==="object" && f.object.callable?.kind==="script-guest" && !f.object.callable.strict && f.object.callable.thisMode==="global","callee metadata");
}
console.log("PASS M07-M09");
logCase("M10","function f(){function g(){return x;}let x=7;return g;}out(f()());","7");
logCase("M11","function f(a){var a;function a(){return 9;}return a();}out(f(7));","9");
throws(run("function f(){return g();let x=7;function g(){return x;}}f();",fresh()),"ReferenceError");console.log("PASS M12");
logCase("M13",'function f(){"use strict";return function(){return this;};}out(f()());function g(){return this;}out(g()===this);',"undefined,true");
logCase("M14","try{throw 7;}catch(e){out(e);}","7");
logCase("M15","var i=0;for(;i<2;i++){switch(i){case 0:continue;default:out(i);}}out(i);","1,2");
for(const strict of [false,true]){
 const prefix=strict?'"use strict";':'';
 for(const source of ["out(o.p=7);out(o.p);","out(o.p++);out(o.p);"]){const r=fresh(),out: Value[]=[];recorder(r,out);const o=new GuestObject(r.objectPrototype);frozen(o,"p",number(1));define(r,"o",obj(o));const c=run(prefix+source,r);if(strict) throws(c,"TypeError");else check(out.map(scalar).join(",")===(source.includes("++")?"1,1":"7,1"),"R01/R02");}
 {const r=fresh();const c=run(prefix+"ghost=7;",r);if(strict){throws(c,"ReferenceError");check(r.globalObject.getOwnProperty("ghost")===undefined,"no strict property");}else{expect(c,number(7),"R03");const d=r.globalObject.getOwnProperty("ghost");check(d!==undefined && d.kind==="data" && d.writable && d.enumerable && d.configurable,"assignment flags");}}
 for(const deleted of [false,true]){const r=fresh();if(deleted)define(r,"x",number(1));define(r,"seed",builtin(r,"seed",(_t,_a,_c,_l): ValueCompletion=>{if(deleted)r.globalObject.internalDelete("x");else frozen(r.globalObject,"x",number(1));return normal(number(7));}));const c=run(prefix+"x=seed();",r);if(strict) throws(c,"ReferenceError");else expect(c,number(7),"R04/R05");if(!strict)check(scalar(own(r,"x"))===(deleted?"7":"1"),"captured base");}
 {const r=fresh(),out: Value[]=[];recorder(r,out);define(r,"x",number(9));run(prefix+"let x=1;x=7;out(x);out(this.x);",r);check(out.map(scalar).join(",")==="7,9","R06");}
 {const r=fresh();r.globalObject.preventExtensions();const c=run(prefix+"ghost=7;",r);if(strict)throws(c,"ReferenceError");else expect(c,number(7),"R07");check(r.globalObject.getOwnProperty("ghost")===undefined,"nonextensible");}
 {const r=fresh();frozen(r.globalObject,"x",number(1));const c=run(prefix+"var x=7;x;",r);if(strict)throws(c,"TypeError");else expect(c,number(1),"R17");}
 {const c=run(prefix+"(3).x=7;",fresh());if(strict)throws(c,"TypeError");else expect(c,number(7),"R16");}
}
console.log("PASS R01-R07 R16 R17");
throws(run("missing;",fresh()),"ReferenceError");expect(run("typeof missing;",fresh()),{kind:"string",value:"undefined"},"R08 typeof");throws(run("x;let x;",fresh()),"ReferenceError");
logCase("R09","out(delete missing);var x;out(delete x);let y;out(delete y);ghost=7;out(delete ghost);","true,false,false,true");
logCase("R10","out(delete x);let x;","false");
logCase("R13","out(delete (out(7)));","7,true");
{const r=fresh(),out: Value[]=[];recorder(r,out);property(r,r.objectPrototype,"p",{value:number(1),writable:true,enumerable:true,configurable:true});run("out(delete p);out(p);",r);check(out.map(scalar).join(",")==="true,1","R12");}
console.log("PASS R08 R12");
for(const strict of [false,true]){
 const prefix=strict?'"use strict";':'';
 {const r=fresh(),log: string[]=[],o=new GuestObject(r.objectPrototype);property(r,o,"p",{get:builtin(r,"getter",(_t,_a,_c,_l): ValueCompletion=>{log.push("G");return normal(number(1));}),configurable:false});define(r,"o",obj(o));const c=run(prefix+"delete o.p;",r);if(strict)throws(c,"TypeError");else expect(c,{kind:"boolean",value:false},"R11");check(log.length===0,"delete no getter");}
 {const r=fresh(),log: string[]=[],o=new GuestObject(r.objectPrototype),k=new GuestObject(r.objectPrototype);const sentinel: ThrowCompletion={type:"throw",origin:{kind:"guest"},value:obj(new GuestObject()),diagnostic:{phase:"runtime",name:"Error",message:"sentinel",loc:{line:900,column:9}}};
 property(r,k,wellKnownToPrimitive,{value:builtin(r,"key",(_t,_a,_c,_l): ValueCompletion=>{log.push("K");return normal({kind:"string",value:"p"});})});property(r,o,"p",{set:builtin(r,"setter",(_t,_a,_c,_l): ValueCompletion=>{log.push("S");return sentinel;})});
 define(r,"o",obj(o));define(r,"k",obj(k));define(r,"rhs",builtin(r,"rhs",(_t,_a,_c,_l): ValueCompletion=>{log.push("RHS");return normal(number(7));}));const s=createScriptSession();check(run(prefix+"o[k]=rhs();",r,s)===sentinel,"R14 exact completion");check(log.join(",")==="RHS,K,S" && s.inspect().lastAbrupt?.unitId==="T","R14 trace/provenance");}
 {const r=fresh(),log: string[]=[],o=new GuestObject(r.objectPrototype),k=new GuestObject(r.objectPrototype);property(r,k,wellKnownToPrimitive,{value:builtin(r,"key",(_t,_a,_c,_l): ValueCompletion=>{log.push("K");return normal({kind:"string",value:"p"});})});property(r,o,"p",{get:builtin(r,"get",(_t,_a,_c,_l): ValueCompletion=>{log.push("G");return normal(number(1));}),set:builtin(r,"set",(_t,a,_c,_l): ValueCompletion=>{log.push("S"+scalar(a[0]));return normal();})});define(r,"o",obj(o));define(r,"k",obj(k));define(r,"out",builtin(r,"out",(_t,a,_c,_l): ValueCompletion=>{log.push("out"+scalar(a[0]));return normal();}));run(prefix+"out(o[k]++);",r);check(log.join(",")==="K,G,S2,out1","R15 cached key");}
 {const r=fresh();let receiver: Value=UNDEFINED;property(r,r.numberPrototype,"x",{set:builtin(r,"set",(t,_a,_c,_l): ValueCompletion=>{receiver=t;return normal();})});expect(run(prefix+"(3).x=7;",r),number(7),"primitive setter completion");check(sameValue(receiver,number(3)),"R16 primitive receiver");}
}
console.log("PASS R11 R14 R15 R16 setter");
for(const strict of [false,true]){
 const r=fresh(),prefix=strict?'"use strict";':'';define(r,"x",number(8));run(prefix+'var x;function f(a){return a;}let g=(function(){});let o={m:function(){}};',r);
 check(scalar(own(r,"x"))==="8","D01 repeated var");const fd=r.globalObject.getOwnProperty("f");check(fd!==undefined && fd.kind==="data" && fd.writable && fd.enumerable && !fd.configurable,"D01 function flags");
 const out: Value[]=[];recorder(r,out);run("out(f);out(g);out(o.m);",r);
 for(let i=0;i<out.length;i++){const v=out[i];if(v.kind!=="object")throw new Error("function object");const f=v.object;for(const key of ["name","length"]){const d=f.getOwnProperty(key);check(d!==undefined && d.kind==="data" && !d.writable && !d.enumerable && d.configurable,"D02 descriptor");if(d!==undefined && d.kind==="data")check(scalar(d.value)===(key==="name"?["f","g","m"][i]:i===0?"1":"0"),"D02 metadata");}const p=f.getOwnProperty("prototype");check(p!==undefined && p.kind==="data" && p.writable && !p.enumerable && !p.configurable,"prototype flags");if(p!==undefined && p.kind==="data" && p.value.kind==="object"){const c=p.value.object.getOwnProperty("constructor");check(c!==undefined && c.kind==="data" && sameValue(c.value,v) && c.writable && !c.enumerable && c.configurable,"constructor");}check(f.getOwnProperty("caller")===undefined && f.getOwnProperty("arguments")===undefined,"no own restricted");}
 for(const source of ["f.caller;","f.arguments;","f.caller=7;"])throws(run(prefix+source,r),"TypeError");
 const f=out[0];if(f.kind==="object"){property(r,f.object,"caller",{value:number(3),writable:true,configurable:true});expect(run("f.caller;",r),number(3),"own shadow");}
 const r2=fresh();frozen(r2.globalObject,"bad",number(1));throws(run(prefix+"function bad(){}",r2),"TypeError");
 const r3=fresh();r3.defineScriptGlobal("f",{value:number(1),writable:true,enumerable:true,configurable:false});check(run(prefix+"function f(){}",r3).type==="normal","D06 replace");const d=r3.globalObject.getOwnProperty("f");check(d!==undefined && d.kind==="data" && d.writable && d.enumerable && !d.configurable,"D06 flags");
}
{const a=fresh(),b=fresh();for(const key of ["caller","arguments"]){const ad=a.functionPrototype.getOwnProperty(key),bd=b.functionPrototype.getOwnProperty(key);check(ad!==undefined && ad.kind==="accessor" && bd!==undefined && bd.kind==="accessor","D04 accessors");if(ad!==undefined && ad.kind==="accessor" && bd!==undefined && bd.kind==="accessor"){check(sameValue(ad.get,ad.set) && !sameValue(ad.get,bd.get) && !ad.enumerable && ad.configurable,"D04 identity");if(ad.get.kind==="object"){check(!ad.get.object.isExtensible(),"thrower frozen");for(const name of ["name","length"]){const d=ad.get.object.getOwnProperty(name);check(d!==undefined && d.kind==="data" && !d.writable && !d.enumerable && !d.configurable,"thrower flags");}}}}}
{const r=fresh(),unit={id:"original",text:"function f(){/*keep*/return this;}"};const p=prepareBoundedScript(unit,r);check(p.kind==="ready","D05 prepare");if(p.kind==="ready"){unit.id="forged";unit.text="forged";evaluateScript(createScriptSession(),p.record);expect(run("f.toString();",r),{kind:"string",value:"function f(){/*keep*/return this;}"},"D05 original source");}}
console.log("PASS D01-D06");
const negatives=["function f(a,a){}","function f(){return arguments;}","eval('1');","with(o){}","{function f(){}}","switch(1){case 1:function f(){}}","try{}catch(e){var e;}","try{}catch(e){let e;}",'function f(){"use strict";delete x;}','"use strict";delete x;',"function f(){return 7;}const tail=0;","out(9);function f(a=1){}","function f(){return 7;}new C(...xs);","let x;var x;","for(let i=0;;){}",'"use strict";function f(){(delete (x));}'];
for (const source of negatives) {
    const r=fresh(), out:Value[]=[]; recorder(r,out);
    const p=prepareBoundedScript({id:"N",text:source},r);
    check(out.length === 0 && r.globalObject.getOwnProperty("f") === undefined, "preparation is inert");
    if (source === "function f(a,a){}") {
        check(p.kind === "ready", "sloppy duplicate parameters prepare");
        expect(run(source,r),UNDEFINED,"original duplicate function executes");
        expect(run("f(1,7);",r),UNDEFINED,"empty duplicate function returns undefined");
        expect(run("f.length;",r),{kind:"number",value:2},"duplicate function length");
    } else if (source === "eval('1');") {
        check(p.kind === "ready", "eval prepares");
        expect(run(source,r),{kind:"number",value:1},"eval executes");
    } else if (source === "{function f(){}}" || source === "switch(1){case 1:function f(){}}") {
        check(p.kind === "ready", "sloppy block function prepares");
        expect(run(source+"typeof f;",r),{kind:"string",value:"function"},"sloppy block function publishes");
        expect(run("f();",r),UNDEFINED,"sloppy block function executes");
    } else if (source === "function f(){return arguments;}") {
        check(p.kind === "ready", "arguments prepares");
        expect(run(source+"f(7,8).length;",r),{kind:"number",value:2},"arguments length");
        expect(run("f(7)[0];",r),{kind:"number",value:7},"arguments value");
    } else if (source === "function f(){return 7;}new C(...xs);") {
        check(p.kind === "ready", "spread constructor prepares");
        check(run("function C(){}var xs=[];"+source,r).type === "normal", "spread constructor executes");
    } else if (source === "function f(){return 7;}const tail=0;") {
        check(p.kind === "ready", "const tail prepares");
        expect(run(source+"f()+tail;",r),{kind:"number",value:7},"const tail executes");
    } else if (source === "out(9);function f(a=1){}") {
        check(p.kind === "ready", "default parameter prepares");
        expect(run(source+"f();",r),UNDEFINED,"default parameter function executes");
        check(out.length === 1 && sameValue(out[0],{kind:"number",value:9}),"default source output retained");
        expect(run("f.length;",r),{kind:"number",value:0},"default function length");
    } else if (source === "for(let i=0;;){}") {
        check(p.kind === "ready", "lexical for prepares");
        const result=run(source,r,createScriptSession({maxSteps:100,maxCalls:64}));
        check(result.type === "throw" && result.origin.kind === "resource-limit", "lexical loop bounded");
    } else check(p.kind !== "ready", "negative "+source);
}
for(const text of [" ".repeat(100001),"(".repeat(129)+"1"+")".repeat(129)+";"]){const p=prepareBoundedScript({id:"N16",text},fresh());check(p.kind==="blocked" && p.rejection.kind==="resource-limit","N16 resource");}
logCase("negative neighbors",'try{throw 7;}catch(e){var x=9;out(e);out(x);}let o={arguments:8};out(o.arguments);',"7,9,8");
check(run('"use strict";{function f(){return 7;}f();}',fresh()).type==="normal","strict block neighbor");
check(prepareStrictScript({id:"old",text:""},fresh()).kind==="profile-rejected","old strict empty");expect(run("",fresh()),UNDEFINED,"bounded empty");
for(const source of ['"x";"use strict";function f(){return this;}f();','function f(){"use strict";return function(){return this;};}f()();'])expect(run(source,fresh()),UNDEFINED,"directive inheritance");
for(const source of ['("use strict");',';"use strict";','"use\\x20strict";']){const r=fresh();const p=prepareBoundedScript({id:"directive",text:source+'function f(){return this;}f();'},r);if(p.kind==="ready")expect(evaluateScript(createScriptSession(),p.record).completion,r.globalThisValue,"non-directive");}
console.log("PASS N01-N16 strict entry and directives");

const traces = [
  {
    "id": "P13-sloppy-call",
    "setup": "",
    "source": "function f(){\nreturn this;\n}\nf();",
    "lines": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      4,
      4,
      1,
      1,
      2,
      2
    ],
    "columns": [
      10,
      10,
      10,
      10,
      1,
      10,
      1,
      1,
      1,
      1,
      1,
      1,
      8
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 6
  },
  {
    "id": "P14-strict-call",
    "setup": "",
    "source": "\"use strict\";\nfunction f(){\nreturn this;\n}\nf();",
    "lines": [
      2,
      2,
      2,
      2,
      2,
      2,
      1,
      1,
      2,
      5,
      5,
      2,
      3,
      3
    ],
    "columns": [
      10,
      10,
      10,
      10,
      1,
      10,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      8
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 6
  },
  {
    "id": "P09-cross-realm-box",
    "setup": "function f(){\nreturn this;\n}",
    "source": "f.call(3);",
    "lines": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2
    ],
    "columns": [
      1,
      1,
      1,
      3,
      8,
      1,
      1,
      1,
      8
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T",
      "H",
      "H",
      "H",
      "H"
    ],
    "instantiation": 0
  },
  {
    "id": "P03-unresolved-write",
    "setup": "",
    "source": "x=7;",
    "lines": [
      1,
      1,
      1
    ],
    "columns": [
      1,
      1,
      3
    ],
    "units": [
      "T",
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P05-failed-property-write",
    "setup": "",
    "source": "o.p=7;",
    "lines": [
      1,
      1,
      1,
      1,
      1
    ],
    "columns": [
      1,
      1,
      1,
      3,
      5
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P04-failed-postfix",
    "setup": "",
    "source": "o.p++;",
    "lines": [
      1,
      1,
      1,
      1
    ],
    "columns": [
      1,
      1,
      1,
      3
    ],
    "units": [
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P02-delete-binding",
    "setup": "",
    "source": "delete x;",
    "lines": [
      1,
      1
    ],
    "columns": [
      1,
      1
    ],
    "units": [
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P04-delete-property",
    "setup": "",
    "source": "delete o.p;",
    "lines": [
      1,
      1,
      1,
      1
    ],
    "columns": [
      1,
      1,
      8,
      10
    ],
    "units": [
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P06-key-set-abrupt",
    "setup": "",
    "source": "o[k]=rhs();",
    "lines": [
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "columns": [
      1,
      1,
      1,
      3,
      6,
      1
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P05-var",
    "setup": "",
    "source": "var x;",
    "lines": [
      1,
      1,
      1,
      1,
      1
    ],
    "columns": [
      5,
      5,
      5,
      5,
      1
    ],
    "units": [
      "T",
      "T",
      "T",
      "T",
      "T"
    ],
    "instantiation": 4
  },
  {
    "id": "P02-throw",
    "setup": "",
    "source": "throw 7;",
    "lines": [
      1,
      1
    ],
    "columns": [
      1,
      7
    ],
    "units": [
      "T",
      "T"
    ],
    "instantiation": 0
  },
  {
    "id": "P16-fdi-lexical",
    "setup": "function f(a){\nvar v;\nlet x;\nreturn a;\n}",
    "source": "f(7);",
    "lines": [
      1,
      1,
      1,
      1,
      2,
      1,
      1,
      2,
      2,
      2,
      1,
      3,
      2,
      3,
      4,
      4
    ],
    "columns": [
      1,
      1,
      3,
      1,
      5,
      12,
      12,
      5,
      5,
      5,
      1,
      5,
      1,
      1,
      1,
      8
    ],
    "units": [
      "T",
      "T",
      "T",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H",
      "H"
    ],
    "instantiation": 0
  }
];
let prefixes=0;
for(const trace of traces) for(const seed of [0,7]) for(let k=0;k<=trace.lines.length;k++){
 const a=fresh(),r=trace.id==="P09-cross-realm-box"?fresh():a,s=createScriptSession({maxSteps:seed+k,maxCalls:64}),log: string[]=[];
 const o=new GuestObject(r.objectPrototype),key=new GuestObject(r.objectPrototype);
 const sentinel: ThrowCompletion={type:"throw",origin:{kind:"guest"},value:obj(new GuestObject()),diagnostic:{phase:"runtime",name:"Error",message:"sentinel",loc:{line:900,column:9}}};
 if(trace.setup!==""){run(trace.setup,a,createScriptSession(),"H");if(r!==a)define(r,"f",own(a,"f"));}
 if(trace.id==="P05-failed-property-write" || trace.id==="P04-failed-postfix"){frozen(o,"p",number(1));define(r,"o",obj(o));}
 if(trace.id==="P02-delete-binding")define(r,"x",number(7));
 if(trace.id==="P04-delete-property"){property(r,o,"p",{get:builtin(r,"get",(_t,_a,_c,_l): ValueCompletion=>{log.push("G");return normal(number(1));}),configurable:false});define(r,"o",obj(o));}
 if(trace.id==="P06-key-set-abrupt"){
  property(r,key,wellKnownToPrimitive,{value:builtin(r,"key",(_t,_a,_c,_l): ValueCompletion=>{log.push("K");return normal({kind:"string",value:"p"});})});
  property(r,o,"p",{set:builtin(r,"set",(_t,_a,_c,_l): ValueCompletion=>{log.push("S");return sentinel;})});define(r,"o",obj(o));define(r,"k",obj(key));define(r,"rhs",builtin(r,"rhs",(_t,_a,_c,_l): ValueCompletion=>{log.push("R");return normal(number(7));}));
 }
 if(seed===7){check(run("1;1;1;;",r,s,"seed").type==="normal" && s.inspect().steps===7,"real seven-step seed");}
 const record=prepare(trace.source,r),result=evaluateScript(s,record),c=result.completion;
 idle(s);check(s.inspect().steps===seed+(k<trace.lines.length?k+1:k),trace.id+" steps "+k);
 if(k<trace.lines.length){check(c.type==="throw" && c.origin.kind==="resource-limit" && c.origin.guardCode==="steps" && c.origin.count===seed+k+1 && c.origin.limit===seed+k,trace.id+" origin "+k);if(c.type==="throw"){check(c.diagnostic.loc.line===trace.lines[k] && c.diagnostic.loc.column===trace.columns[k],trace.id+" coordinate "+k);check(s.inspect().lastAbrupt?.unitId===trace.units[k],trace.id+" unit "+k);}check(result.phase===(k<trace.instantiation?"instantiation":"body"),trace.id+" phase "+k);}
 else if(trace.id==="P06-key-set-abrupt")check(c===sentinel,"prefix exact sentinel");
 else if(trace.id==="P02-throw")check(c.type==="throw" && c.origin.kind==="guest" && sameValue(c.value,number(7)),"throw7");
 else if(trace.id==="P13-sloppy-call")expect(c,r.globalThisValue,"global this");
 else if(trace.id==="P14-strict-call" || trace.id==="P05-var")expect(c,UNDEFINED,"undefined");
 else if(trace.id==="P09-cross-realm-box"){check(c.type==="normal" && c.value.kind==="object" && c.value.object instanceof GuestNumber && c.value.object.numberData===3 && c.value.object.getPrototypeOf()===a.numberPrototype,"prefix cross box");}
 else if(trace.id==="P02-delete-binding" || trace.id==="P04-delete-property")expect(c,{kind:"boolean",value:trace.id==="P02-delete-binding"},"delete result");
 else expect(c,number(trace.id==="P04-failed-postfix"?1:7),"prefix value");
 if(trace.id==="P13-sloppy-call" || trace.id==="P14-strict-call"){check(record.inspectMaterializations().completed===(k>=5?1:0),"materialization threshold");check((r.globalObject.getOwnProperty("f")!==undefined)===(k>=6),"publication threshold");}
 if(trace.id==="P03-unresolved-write")check((r.globalObject.getOwnProperty("x")!==undefined)===(k>=3),"write threshold");
 if(trace.id==="P05-var")check((r.globalObject.getOwnProperty("x")!==undefined)===(k>=4),"var threshold");
 if(trace.id==="P02-delete-binding")check((r.globalObject.getOwnProperty("x")===undefined)===(k>=2),"delete threshold");
 if(trace.id==="P05-failed-property-write" || trace.id==="P04-failed-postfix"){const d=o.getOwnProperty("p");check(d!==undefined && d.kind==="data" && sameValue(d.value,number(1)),"failed write stable");}
 if(trace.id==="P04-delete-property")check(log.length===0,"delete getter suppressed");
 if(trace.id==="P06-key-set-abrupt")check(log.join(",")===(k<5?"":k<6?"R":"R,K,S"),"effect prefix");
 prefixes++;
}
check(prefixes===190,"prefix denominator");console.log("PASS 190 fresh/seven-seeded prefixes");
function sameFrame(a: ReturnType<ScriptSession["inspect"]>,b: ReturnType<ScriptSession["inspect"]>): void {
 const x=a.active,y=b.active;check(x!==null && y!==null && a.calls===b.calls && a.depth===b.depth,"active restoration");if(x===null || y===null)throw new Error("missing frame");check(x.realm===y.realm && x.record===y.record && x.scopeId===y.scopeId && x.lexical===y.lexical && x.variable===y.variable && x.strict===y.strict && x.thisValue===y.thisValue && x.function===y.function && x.phase===y.phase,"exact frame");
}
function hostFault(action: ()=>void,message: string): void {let caught=false;try{action();}catch(e){if(!(e instanceof Error))throw e;check(e.message===message,"host message "+e.message);caught=true;}check(caught,"host fault missing");}
function sentinel(): ThrowCompletion {return {type:"throw",origin:{kind:"guest"},value:obj(new GuestObject()),diagnostic:{phase:"runtime",name:"sentinel",message:"exact",loc:{line:900,column:9}}};}
// X01/X03: nested sessions restore a live sloppy callee's distinct body frame.
for(const fault of [false,true]){
 const a=fresh(),b=fresh(),sa=createScriptSession(),sb=createScriptSession(),error=new Error("X03 sentinel");let savedA: OperationContext|null=null,savedB: OperationContext|null=null,calls=0;
 const leaf=builtin(a,"leaf",(_t,_args,c,_l): ValueCompletion=>{check(c===savedA && c.realm===a,"authentic A permit");calls++;return normal(number(7));});
 define(b,"nested",builtin(b,"nested",(_t,_args,c,l): ValueCompletion=>{savedB=c;const beforeA=sa.inspect(),beforeB=sb.inspect();if(savedA===null)throw new Error("A");expect(savedA.call(leaf,UNDEFINED,[],l),number(7),"A reentry");sameFrame(beforeA,sa.inspect());sameFrame(beforeB,sb.inspect());if(fault)throw error;return normal(number(11));}));
 const br=prepare('"use strict";try{nested();}catch(e){this.caught=1;}',b,"B");
 define(a,"out",builtin(a,"out",(_t,args,c,l): ValueCompletion=>{savedA=c;const before=sa.inspect();const active=before.active;if(active===null)throw new Error("active");check(!active.strict && active.lexical!==active.variable && active.lexical instanceof ScriptDeclarativeEnvironment && active.lexical.outer===active.variable,"sloppy body environment");check(args[0].kind==="object" && args[0].object instanceof GuestNumber,"boxed receiver");const start=sb.inspect().steps;let caught=false;try{const result=evaluateScript(sb,br);expect(result.completion,number(11),"nested value");}catch(e){if(!(e instanceof Error) || e!==error)throw e;caught=true;}check(caught===fault,"host identity");check(b.globalObject.getOwnProperty("caught")===undefined,"host bypasses guest catch");idle(sb);sameFrame(before,sa.inspect());check(sb.inspect().steps>start && c.realm===a,"independent monotonic budget");expect(c.call(leaf,UNDEFINED,[],l),number(7),"permit restored");return normal();}));
 run('function f(){out(this);}f.call(3);',a,sa);check(calls===2,"only authentic callbacks");idle(sa);if(savedA===null || savedB===null)throw new Error("retained");const ac:OperationContext=savedA,bc:OperationContext=savedB;hostFault(()=>{ac.call(leaf,UNDEFINED,[],loc);},"inactive Script session");hostFault(()=>{bc.tick(loc);},"inactive Script session");
}
console.log("PASS X01 X03 nested sessions and host faults");
// X02/X07: consuming a guest throw must not erase history; reuse gives new origin.
for(const cross of [false,true]){
 const a=fresh(),b=cross?fresh():a,s=createScriptSession(),q=sentinel();let calls=0,ar:ExecutableScript|null=null;
 for(const r of cross?[a,b]:[a])define(r,"fail",builtin(r,"fail",(_t,_args,c,_l): ValueCompletion=>{check(c.realm===r,"throw Realm");if(calls++===1)check(s.inspect().lastAbrupt?.record===ar,"consumed history");return q;}));
 const br=prepare("function again(){return fail();}",b,"B");evaluateScript(createScriptSession(),br);if(cross)define(a,"again",own(b,"again"));ar=prepare('try{fail();}catch(e){}again();',a,"A");check(evaluateScript(s,ar).completion===q,"same completion");check(calls===2 && s.inspect().lastAbrupt?.record===br && s.inspect().lastAbrupt?.realm===b,"second provenance");idle(s);
}
console.log("PASS X02 X07 exact abrupt and consumed history");
// X04/X06: outer reference survives opposite-mode guest calls through key/get/set.
for(const strict of [false,true])for(const hook of ["key","get","set"]){
 const a=fresh(),b=fresh(),s=createScriptSession(),o=new GuestObject(a.objectPrototype),k=new GuestObject(a.objectPrototype);const values: Value[]=[];recorder(a,values);run((strict?'':'"use strict";')+'function g(){return this;}',b);const g=own(b,"g");let callbacks=0;
 const cb=builtin(a,"reenter",(_t,_args,c,l): ValueCompletion=>{const before=s.inspect();const result=c.call(g,UNDEFINED,[],l);sameFrame(before,s.inspect());check(c.realm===a,"outer Realm restored");expect(result,strict?b.globalThisValue:UNDEFINED,"callee mode");callbacks++;return normal(hook==="key"?{kind:"string",value:"p"}:number(1));});
 if(hook==="key"){property(a,k,wellKnownToPrimitive,{value:cb});frozen(o,"p",number(1));}else if(hook==="get")property(a,o,"p",{get:cb});else property(a,o,"p",{get:builtin(a,"get",(_t,_a,_c,_l): ValueCompletion=>normal(number(1))),set:cb});
 define(a,"o",obj(o));define(a,"k",obj(k));const result=run((strict?'"use strict";':'')+(hook==="key"?'out(o[k]=7);':'out(o.p++);'),a,s);if(strict && hook!=="set")throws(result,"TypeError");else check(result.type==="normal" && values.length===1 && scalar(values[0])===(hook==="key"?"7":"1"),"outer reference mode");check(callbacks===1,"single hook");
}
console.log("PASS X04 X06 cross-mode reference reentry");
for(const limit of [0,1,64,65]){const r=fresh();run("function f(){\nreturn f();\n}",r,createScriptSession(),"H");const s=createScriptSession({maxSteps:100000,maxCalls:limit}),c=run("f();",r,s);check(c.type==="throw" && c.origin.kind==="resource-limit" && c.origin.guardCode==="calls" && c.origin.count===limit && c.origin.limit===limit,"X08 call origin");check(s.inspect().steps===2+4*limit,"X08 call ticks");if(c.type==="throw")check(c.diagnostic.loc.line===(limit===0?1:2) && c.diagnostic.loc.column===(limit===0?1:8),"call coordinate");}
for(const source of ['function f(){try{while(true){}}catch(e){this.bad=1;}}f();','function f(){return f();}try{f();}catch(e){this.bad=1;}']){const r=fresh(),s=createScriptSession({maxSteps:30,maxCalls:64}),c=run(source,r,s);check(c.type==="throw" && c.origin.kind==="resource-limit" && r.globalObject.getOwnProperty("bad")===undefined,"resource bypass catch");}
{const r=fresh(),s=createScriptSession(),q=new Error("host");define(r,"fault",builtin(r,"fault",(_t,_a,_c,_l): ValueCompletion=>{throw q;}));let caught=false;try{run("fault();",r,s);}catch(e){if(!(e instanceof Error) || e!==q)throw e;caught=true;}check(caught && s.inspect().steps===2,"two tick host fault");idle(s);}
console.log("PASS X08 exact call budgets and cleanup");
// X05 capability failures happen before any guest effect, regardless of mode.
{
 const r=fresh(),s=createScriptSession(),legacy=new Realm((_l:string)=>{});let retained:OperationContext|null=null,effects=0;
 const leaf=builtin(r,"leaf",(_t,_a,_c,_l): ValueCompletion=>{effects++;return normal(number(7));});
 const foreign=obj(legacy.createBuiltin("foreign",0,(_t,_a,_c,_l): ValueCompletion=>{effects++;return normal();}));
 define(r,"guard",builtin(r,"guard",(_t,_a,c,l): ValueCompletion=>{retained=c;const before=s.inspect();if(leaf.kind!=="object" || leaf.object.callable?.kind!=="builtin")throw new Error("builtin");const fn=leaf.object.callable;hostFault(()=>{fn.invoke(UNDEFINED,[],c,l);},"Script execution unavailable");hostFault(()=>{c.call(foreign,UNDEFINED,[],l);},"cross-profile callable invocation");sameFrame(before,s.inspect());check(s.inspect().steps===before.steps && effects===0,"profile-first no effects");return normal();}));
 run("guard();",r,s);if(retained===null)throw new Error("retained");const c:OperationContext=retained;hostFault(()=>{c.call(leaf,UNDEFINED,[],loc);},"inactive Script session");check(effects===0,"idle no effects");check(prepareBoundedScript({id:"legacy",text:""},legacy).kind==="profile-rejected","profile admission");
}
// Captured object binding read after deletion, and private completion publication.
{
 const r=fresh(),c=context(r);define(r,"x",number(1));for(const strict of [false,true]){define(r,"x",number(1));const ref=resolveScriptBinding({kind:"global",record:r.globalEnvironment},"x",loc,strict);if(ref.type!=="normal")throw new Error("reference");r.globalObject.internalDelete("x");const result=getScriptBinding(ref.reference,c);if(strict)throws(result,"ReferenceError");else expect(result,UNDEFINED,"deleted sloppy read");}
 const rec=prepare("function f(){let x;return 7;}",r);evaluateScript(createScriptSession(),rec);const f=own(r,"f");if(f.kind!=="object" || f.object.callable?.kind!=="script-guest")throw new Error("f");const env=rec.createFunctionEnvironment(f.object.callable,UNDEFINED,c);if(env.type!=="normal")throw new Error("env");hostFault(()=>{rec.functionBodyEnvironment(env.environment);},"incomplete Script function activation");check(rec.instantiateFunction(env.environment,[],c).type==="normal","FDI complete");const body=rec.functionBodyEnvironment(env.environment);check(body instanceof ScriptDeclarativeEnvironment && body.outer===env.environment,"private distinct body");hostFault(()=>{rec.instantiateFunction(env.environment,[],c);},"invalid fresh Script activation");
}
console.log("PASS X05 guards and private completed body environment");
// Late accessor installation is reached through the captured unresolved base;
// adding a lexical name during RHS does not redirect that reference.
for(const strict of [false,true])for(const lexical of [false,true]){
 const r=fresh(),s=createScriptSession(),q=sentinel();let setters=0;
 define(r,"seed",builtin(r,"seed",(_t,_a,c,_l): ValueCompletion=>{if(lexical){check(r.globalEnvironment.createMutableBinding("ghost",loc, c.realm).type==="normal","late lexical create");check(r.globalEnvironment.initializeBinding("ghost",number(1),c,loc).type==="normal","late lexical initialize");}else property(r,r.globalObject,"ghost",{set:builtin(r,"set",(_t,_a,_c,_l): ValueCompletion=>{setters++;return q;}),configurable:true});return normal(number(7));}));
 const result=run((strict?'"use strict";':'')+'ghost=seed();',r,s);if(strict){throws(result,"ReferenceError");check(setters===0,"strict unresolved ignores late setter");}else if(lexical){expect(result,number(7),"late lexical bypass");expect(r.globalEnvironment.getBindingValue("ghost",context(r),loc),number(1),"late lexical untouched");check(scalar(own(r,"ghost"))==="7","late object created");}else check(result===q && setters===1,"late setter exact abrupt");
}
// FDI failure never publishes a lexical body environment and cannot be retried.
for(const strict of [false,true]){
 const r=fresh(),record=prepare((strict?'"use strict";':'')+'function f(){let x;}',r);evaluateScript(createScriptSession(),record);const f=own(r,"f");if(f.kind!=="object" || f.object.callable?.kind!=="script-guest")throw new Error("f");const c=context(r),created=record.createFunctionEnvironment(f.object.callable,UNDEFINED,c);if(created.type!=="normal")throw new Error("activation");const q=sentinel(),limited:OperationContext={realm:r,tick:(_l):ValueCompletion=>q,call:c.call};check(record.instantiateFunction(created.environment,[],limited)===q,"FDI exact failure");hostFault(()=>{record.functionBodyEnvironment(created.environment);},"incomplete Script function activation");hostFault(()=>{record.instantiateFunction(created.environment,[],c);},"invalid fresh Script activation");
 const other=prepare("",r);hostFault(()=>{other.functionBodyEnvironment(created.environment);},"incomplete Script function activation");
}
{
 const r=fresh();const p=prepareBoundedScript({id:"precedence",text:'"use strict";delete x;const tail=0;'},r),old=prepareStrictScript({id:"precedence",text:'"use strict";delete x;const tail=0;'},r);check(p.kind==="blocked" && p.rejection.kind==="unsupported-syntax" && p.rejection.capabilityCode==="parse.delete-identifier","const tail exposes strict delete rejection");check(old.kind==="blocked" && old.rejection.kind==="unsupported-syntax" && old.rejection.capabilityCode==="parse.delete-identifier","old precedence");
}
console.log("PASS late global effects failed FDI and rejection precedence");
for(const strict of [false,true])for(const hook of ["key","get","set"]){
 const a=fresh(),b=fresh(),s=createScriptSession(),q=sentinel(),o=new GuestObject(a.objectPrototype),k=new GuestObject(a.objectPrototype);let calls=0;
 define(b,"fail",builtin(b,"fail",(_t,_a,c,_l):ValueCompletion=>{check(c.realm===b,"nested abrupt Realm");return q;}));
 const br=prepare((strict?'':'"use strict";')+'function g(){return fail();}',b,"B");evaluateScript(createScriptSession(),br);const g=own(b,"g");
 const cb=builtin(a,"reenter",(_t,_a,c,l):ValueCompletion=>{const before=s.inspect();const result=c.call(g,UNDEFINED,[],l);sameFrame(before,s.inspect());check(result===q && c.realm===a,"nested abrupt identity/restore");calls++;return result;});
 if(hook==="key"){property(a,k,wellKnownToPrimitive,{value:cb});property(a,o,"p",{value:number(1),writable:true});}else if(hook==="get")property(a,o,"p",{get:cb});else property(a,o,"p",{set:cb});
 define(a,"o",obj(o));define(a,"k",obj(k));const result=run((strict?'"use strict";':'')+(hook==="key"?'o[k]=7;':hook==="get"?'o.p++;':'o.p=7;'),a,s);check(result===q && calls===1 && s.inspect().lastAbrupt?.record===br && s.inspect().lastAbrupt?.realm===b,"X06 inner abrupt provenance");
}
console.log("PASS X06 exact abrupt provenance through key get set");
logCase("local identifier deletion","function f(a){out(delete a);out(delete x);out(delete y);var x;let y;}f(7);","false,false,false");
for(const strict of [false,true]){
 const r=fresh(),o=new GuestObject(r.objectPrototype),sym=new GuestSymbol("numeric");property(r,o,"p",{value:{kind:"symbol",value:sym},writable:false});define(r,"o",obj(o));throws(run((strict?'"use strict";':'')+'o.p++;',r),"TypeError");
 const d=fresh();run((strict?'"use strict";':'')+'var x;',d);const x=d.globalObject.getOwnProperty("x");check(x!==undefined && x.kind==="data" && x.writable && x.enumerable && !x.configurable && x.value.kind==="undefined","fresh var flags");
}
console.log("PASS numeric abrupt and fresh var descriptors");
// Execute the frozen reference literals as well as the host-focused controls above.
for(const strict of [false,true])for(const id of ["R03","R04","R05","R06","R07","R08-get","R08-typeof","R08-tdz","R16","R17"]){
 const r=fresh(),out:Value[]=[];recorder(r,out);let source="",expected="",error="";
 if(id==="R03"){source="out(ghost=7);out(this.ghost);";expected="7,7";if(strict)error="ReferenceError";}
 if(id==="R04"){source="ghost=seed();";define(r,"seed",builtin(r,"seed",(_t,_a,_c,_l):ValueCompletion=>{frozen(r.globalObject,"ghost",number(1));return normal(number(7));}));if(strict)error="ReferenceError";}
 if(id==="R05"){source="x=zap();";define(r,"x",number(1));define(r,"zap",builtin(r,"zap",(_t,_a,_c,_l):ValueCompletion=>{r.globalObject.internalDelete("x");return normal(number(7));}));if(strict)error="ReferenceError";}
 if(id==="R06"){source="x=7;out(x);out(this.x);";run("let x=1;",r);define(r,"x",number(9));expected="7,9";}
 if(id==="R07"){source="out(ghost=7);";r.globalObject.preventExtensions();expected="7";if(strict)error="ReferenceError";}
 if(id==="R08-get"){source="out(missing);";error="ReferenceError";}
 if(id==="R08-typeof"){source="out(typeof missing);";expected="undefined";}
 if(id==="R08-tdz"){source="out(x);let x;";error="ReferenceError";}
 if(id==="R16"){source="out((3).x=7);";expected="7";if(strict)error="TypeError";}
 if(id==="R17"){source="var x=7;out(x);";frozen(r.globalObject,"x",number(1));expected="1";if(strict)error="TypeError";}
 const c=run((strict?'"use strict";':'')+source,r);if(error!==""){throws(c,error);check(out.length===0,"frozen strict before out");}else{check(c.type==="normal" && out.map(scalar).join(",")===expected,"frozen literal "+id);if(id==="R04" || id==="R05")expect(c,number(7),"literal assigned RHS");}
}
console.log("PASS frozen reference literals and strict twins");
