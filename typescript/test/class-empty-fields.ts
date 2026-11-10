import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "class-empty-fields", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession();
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
passes("class C{x;y;}var c=new C();Object.keys(c).join(\",\")===\"x,y\"&&c.x===undefined&&!Object.hasOwn(C.prototype,\"x\")");
passes("class C{x;}var d=Object.getOwnPropertyDescriptor(new C(),\"x\");d.value===undefined&&d.writable&&d.enumerable&&d.configurable");
passes("var hits=0;class B{set x(v){hits++}}class C extends B{x;}var c=new C();hits===0&&Object.hasOwn(c,\"x\")");
passes("class C{x;constructor(ok=Object.hasOwn(this,\"x\")){this.ok=ok}}new C().ok");
passes("var o={};class B{x;constructor(){return o}}class C extends B{y;}var c=new C();c===o&&!Object.hasOwn(o,\"x\")&&Object.hasOwn(o,\"y\")");
passes("class B{x;constructor(){this.x=1}}class C extends B{x;constructor(){super();this.after=this.x}}var c=new C();c.x===undefined&&c.after===undefined");
passes("class B{x;}class C extends B{y;constructor(){var call=()=>super();call()}}Object.keys(new C()).join(\",\")===\"x,y\"");
passes("class C extends null{x;constructor(){return {}}}Object.keys(new C()).length===0");
passes("var saved={},ok=false;class B{constructor(){return Object.freeze(saved)}}class C extends B{x;constructor(){try{super()}catch(e){ok=e instanceof TypeError}return this}}new C()===saved&&ok&&!Object.hasOwn(saved,\"x\")");
passes("var count=0;class C{[++count];}var a=new C(),b=new C();count===1&&Object.hasOwn(a,\"1\")&&Object.hasOwn(b,\"1\")");
passes("var key=Symbol(\"x\");class C{[key];static [key];}Object.getOwnPropertySymbols(new C())[0]===key&&Object.hasOwn(C,key)");
passes("class C{static x;static y;}Object.keys(C).join(\",\")===\"x,y\"&&!Object.hasOwn(new C(),\"x\")");
passes("class C{static m;static m(){return 1}}C.m===undefined&&Object.getOwnPropertyDescriptor(C,\"m\").enumerable");
passes("class C{static m(){return 1}static m;}C.m===undefined");
passes("class C{m;m(){return 1}}new C().m===undefined&&C.prototype.m()===1");
passes("class C{x;x;}Object.keys(new C()).join(\",\")===\"x\"");
passes("class C{[\"constructor\"];static [\"constructor\"];}new C().constructor===undefined&&C.constructor===undefined");
passes("var ok=false;try{class C{static [\"prototype\"];}}catch(e){ok=e instanceof TypeError}ok");
passes("class C{static name;static length;}C.name===undefined&&C.length===undefined&&Object.keys(C).join(\",\")===\"length,name\"");
passes("class C{static;get;set;async;}Object.keys(new C()).join(\",\")===\"static,get,set,async\"");
passes("class C{static\nx;}Object.hasOwn(C,\"x\")&&!Object.hasOwn(new C(),\"static\")");
passes("class C{get\nx;set\ny;}Object.keys(new C()).join(\",\")===\"get,x,set,y\"");
passes("class C{get\n[\"x\"];static get\n[\"y\"];}Object.keys(new C()).join(\",\")===\"get,x,y\"&&Object.hasOwn(C,\"get\")");
passes("class C{get\n[\"x\"](){return 7}static\nm(){return 8}}new C().x===7&&C.m()===8");
passes("class C{async\nx;}Object.keys(new C()).join(\",\")===\"async,x\"");
passes("class C{x\ny}Object.keys(new C()).join(\",\")===\"x,y\"");
passes("var ok=false;try{class C{[C];}}catch(e){ok=e instanceof ReferenceError}ok");
passes("function* f(){return class{[yield \"a\"];static [yield \"b\"];}}var g=f();g.next().value===\"a\"&&g.next(\"x\").value===\"b\"&&((C)=>Object.hasOwn(new C(),\"x\")&&Object.hasOwn(C,\"y\"))(g.next(\"y\").value)");
passes("function* f(){return class extends (yield 1){x;static y;}}var g=f();g.next();class B{b;}var C=g.next(B).value;Object.keys(new C()).join(\",\")===\"b,x\"&&Object.hasOwn(C,\"y\")");
passes("class C{x;}String(C)===\"class C{x;}\"");
passes("class B{constructor(){return []}}class C extends B{x;}Array.isArray(new C())&&Object.hasOwn(new C(),\"x\")");
passes("class B{constructor(){return []}}class C extends B{length;}var ok=false;try{new C()}catch(e){ok=e instanceof RangeError}ok");
check(prepareBoundedScript({id:"rejected",text:"class C{x=1}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{x=1}");
check(prepareBoundedScript({id:"rejected",text:"class C{#x;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{#x;}");
check(prepareBoundedScript({id:"rejected",text:"class C{static {}}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{static {}}");
check(prepareBoundedScript({id:"rejected",text:"class C{constructor;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{constructor;}");
check(prepareBoundedScript({id:"rejected",text:"class C{static constructor;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{static constructor;}");
check(prepareBoundedScript({id:"rejected",text:"class C{static prototype;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{static prototype;}");
check(prepareBoundedScript({id:"rejected",text:"class C{x y;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{x y;}");
check(prepareBoundedScript({id:"rejected",text:"class C{get x;}"},new Realm((_line:string)=>{},"script")).kind!=="ready","class C{get x;}");
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const cls=run('class C{x;}C',defining);if(cls.type!=="normal")throw new Error("class lookup");calling.defineScriptGlobal("C",{value:cls.value});
const result=run('new C()',calling);check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getOwnProperty("x")!==undefined,"cross-Realm fields");
const owner = prepareBoundedScript({id:"field-owner",text:'class FrozenBase{constructor(){return Object.freeze({})}}class FailingClass extends FrozenBase{x;}FailingClass'},defining);
if(owner.kind!=="ready")throw new Error("owner preparation");
const owned = evaluateScript(createScriptSession(),owner.record).completion;
if(owned.type!=="normal")throw new Error("owner class");calling.defineScriptGlobal("Failing",{value:owned.value});
const caller = prepareBoundedScript({id:"field-caller",text:'new Failing()'},calling);
if(caller.kind!=="ready")throw new Error("caller preparation");
const session=createScriptSession(),failure=evaluateScript(session,caller.record).completion;
check(failure.type==="throw"&&failure.value.kind==="object"&&failure.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"field error Realm");
check(session.inspect().lastAbrupt?.record===owner.record&&session.inspect().lastAbrupt?.unitId==="field-owner", "field error source");
check(session.inspect().active===null&&session.inspect().calls===0,"field failure restores caller");
{
for (const text of [
 'async function f(){return class{[await "x"];static [await "y"];}}f().then(C=>out=Object.hasOwn(new C(),"x")&&Object.hasOwn(C,"y"))',
 'class B{b;}class C extends B{x;constructor(){return (async()=>super(await 1))()}}new C().then(v=>out=Object.keys(v).join(",")==="b,x")',
 'class B{constructor(){return {b:1}}}class C extends B{x;constructor(){return (async()=>super(await 1))()}}new C().then(v=>out=v.b===1&&Object.hasOwn(v,"x"))',
 'class B{constructor(){return Object.freeze({})}}class C extends B{x;constructor(){return (async()=>{try{super(await 1)}catch(e){return this}})()}}new C().then(v=>out=Object.isFrozen(v)&&!Object.hasOwn(v,"x"))'
]) {
 const realm=new Realm((_line:string)=>{},"script"),session=createScriptSession();
 const prepared=prepareBoundedScript({id:"async-fields",text:"var out=false;"+text},realm);
 if(prepared.kind!=="ready")throw new Error("async preparation");
 check(evaluateScript(session,prepared.record).completion.type==="normal","async setup");
 const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,"async jobs");
 const value=realm.globalObject.getOwnProperty("out");check(value!==undefined&&value.kind==="data"&&value.value.kind==="boolean"&&value.value.value,"async result: "+text);
 check(session.inspect().active===null&&session.inspect().calls===0,"async caller restored");
}
const realm=new Realm((_line:string)=>{},"script");
const definition=prepareBoundedScript({id:"many-fields",text:"class Many{"+"x;".repeat(120)+"}"},realm);
if(definition.kind!=="ready")throw new Error("many fields preparation");
check(evaluateScript(createScriptSession(),definition.record).completion.type==="normal","many fields setup");
const limitedSource=prepareBoundedScript({id:"limited-caller",text:"var caught=false;try{new Many()}catch(e){caught=true}"},realm);
if(limitedSource.kind!=="ready")throw new Error("limited preparation");
const limited=createScriptSession({maxSteps:40,maxCalls:16}),result=evaluateScript(limited,limitedSource.record).completion;
check(result.type==="throw"&&result.origin.kind==="resource-limit","current field budget");
const caught=realm.globalObject.getOwnProperty("caught");check(caught!==undefined&&caught.kind==="data"&&caught.value.kind==="boolean"&&!caught.value.value,"resource stop cannot be caught");
check(limited.inspect().active===null&&limited.inspect().calls===0&&limited.inspect().lastAbrupt?.record===definition.record,"budget source and caller restored");
}
console.log("class empty fields passed");
