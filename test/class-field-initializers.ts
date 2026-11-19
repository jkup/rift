import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseBoundedScriptDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "field-initializers", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "class C{x=true?function(){}:function(){};y=null??function(){};}new C().x.name===\"\"&&new C().y.name===\"\"",
    "class C{x=(function(){});}new C().x.name===\"x\"",
    "class C{x=class{static label=this.name};}new C().x.label===\"x\"",
    "class C{get=1;set=2;async=3;static=4;}var c=new C();c.get===1&&c.set===2&&c.async===3&&c.static===4",
    "class C{x=1;f=()=>++this.x;}var a=new C(),b=new C();a.f()===2&&b.x===1&&b.f()===2&&a.f()===3",
    "var n=0;class B{constructor(){return Object.freeze({})}}class C extends B{x=++n;constructor(){try{super()}catch(e){if(!(e instanceof TypeError))throw e}return this}}var c=new C();n===1&&!Object.hasOwn(c,\"x\")&&Object.isFrozen(c)",
    "var captured;try{class C{static a=(captured=this,1);static b=(()=>{throw 42})();static c=3;}}catch(e){}captured.a===1&&!Object.hasOwn(captured,\"b\")&&!Object.hasOwn(captured,\"c\")",
    "class C{static x=this.m();static m(){return 42}}C.x===42",
    "class C{x=()=>{try{eval(\"()=>arguments\")}catch(e){return e instanceof SyntaxError}}}new C().x()===true",
    "class C{x=eval(\"(function(){return arguments[0]})\");}new C().x(42)===42",
    "function f(){class C{x=()=>this;}return new C()}var a=f.call({});a.x()===a",
    "class C{x=1\ny=2\n}new C().x===1&&new C().y===2",
    'class C{x=1;y=this.x+1;static x=3;static y=this.x+1;}var c=new C();c.x===1&&c.y===2&&C.y===4',
    'function outer(){return class{x=this;t=new.target;f=()=>[this,new.target]}}var C=outer.call({}),c=new C();c.x===c&&c.t===undefined&&c.f()[0]===c&&c.f()[1]===undefined',
    'class B{get value(){return this.tag}static get value(){return this.tag}}class C extends B{tag="instance";x=super.value;f=()=>super.value;static tag="static";static x=super.value;}var c=new C();c.x==="instance"&&c.f()==="instance"&&C.x==="static"',
    'var order=[];class C{[order.push("k1")]=order.push("i");static [order.push("k2")]=order.push("s");[order.push("k3")];}new C();order.join(",")==="k1,k2,k3,s,i"',
    'class C{f=function(){};g=()=>{};static h=class{};}new C().f.name==="f"&&new C().g.name==="g"&&C.h.name==="h"',
    'var k=Symbol("field");class C{[k]=function(){};}new C()[k].name==="[field]"',
    'class C{x=(0,function(){});}new C().x.name===""',
    'var n=0;class C{x=++n;constructor(value=this.x){this.value=value}}new C().value===1&&new C().value===2',
    'class B{constructor(){return {}}}class C extends B{x=this;}var c=new C();c.x===c',
    'var caught;class B{}class C extends B{x=(()=>{throw 42})();constructor(){try{super()}catch(e){caught=[e,this]}return this}}var c=new C();caught[0]===42&&caught[1]===c&&!Object.hasOwn(c,"x")',
    'class B{set x(v){throw 1}}class C extends B{x=2;}var d=Object.getOwnPropertyDescriptor(new C(),"x");d.value===2&&d.writable&&d.enumerable&&d.configurable',
    'var C=class Inner{static self=Inner;self=Inner;};C.self===C&&new C().self===C',
    'class C{x=1;x=this.x+1;}new C().x===2',
    'class C{x=eval("this");t=eval("new.target");}var c=new C();c.x===c&&c.t===undefined',
    'class B{x(){return this}}class C extends B{x=eval("super.x()");}var c=new C();c.x===c',
    'class C{x=(()=>{try{eval("arguments")}catch(e){return e instanceof SyntaxError}})();}new C().x===true',
    'class C{x=function(){return arguments[0]};}new C().x(42)===42',
    'class C{x=(function(){return eval("arguments[0]")})(42);}new C().x===42',
    'class C{x=(()=>{eval("var hidden=1");return typeof hidden})();}new C().x==="undefined"',
    'function* g(){class C{[yield "key"]=this;}return C;}var i=g();i.next();var C=i.next("x").value,c=new C();c.x===c',
]) passes(text);
for (const text of ['class C{x=arguments}', 'class C{x=()=>arguments}', 'class C{x=({arguments})}', 'class C{x=super()}', 'class C{x=yield 1}', 'async function f(){class C{x=await 1}}', 'class C{#x=1}', 'class C{static{}}']) {
    if (text === 'class C{#x=1}') check(run(text).type === "normal", "original private initializer declaration executes");
    else if (text === 'class C{static{}}') check(run(text).type === "normal", "original static block executes");
    else check(prepareBoundedScript({ id: "invalid-fields", text }, new Realm((_line: string) => {}, "script")).kind !== "ready", text);
}
const planned = parseBoundedScriptDeclarationPlan({ id: "field-scope-order", text: "class C{a=()=>1;b=()=>2;}" });
check(planned.kind === "complete" && planned.scopes.map(scope => scope.kind).join(",") === "script,class,field-initializer,function,field-initializer,function", "initializer scopes follow syntax preorder");
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const owner = prepareBoundedScript({ id: "field-owner", text: 'var seed=41;class C{x=seed+1;f=()=>this.x;}C' }, defining);
if (owner.kind !== "ready") throw new Error("owner");
const constructor = evaluateScript(createScriptSession(), owner.record).completion;
if (constructor.type !== "normal") throw new Error("constructor");
calling.defineScriptGlobal("C", { value: constructor.value });
const cross = run('var c=new C();c.x===42&&c.f()===42', calling);
check(cross.type === "normal" && cross.value.kind === "boolean" && cross.value.value, "defining Realm and captured field environment");
const asyncRealm = new Realm((_line: string) => {}, "script"), session = createScriptSession();
const asyncSource = prepareBoundedScript({ id: "async-fields", text: 'var out=false;async function f(){return class{[await "x"]=this;}}f().then(C=>{var c=new C();out=c.x===c})' }, asyncRealm);
if (asyncSource.kind !== "ready") throw new Error("async source");
check(evaluateScript(session, asyncSource.record).completion.type === "normal", "async setup");
const jobs = drainScriptJobs(session);
check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
const out = asyncRealm.globalObject.getOwnProperty("out");
check(out !== undefined && out.kind === "data" && out.value.kind === "boolean" && out.value.value, "resumed computed key and initializer");
const failing = prepareBoundedScript({ id: "field-error-owner", text: 'class F{x=(()=>{throw new TypeError("field")})()}F' }, defining);
if (failing.kind !== "ready") throw new Error("failure owner");
const failedConstructor = evaluateScript(createScriptSession(), failing.record).completion;
if (failedConstructor.type !== "normal") throw new Error("failure constructor");
calling.defineScriptGlobal("F", { value: failedConstructor.value });
const caller = prepareBoundedScript({ id: "field-error-caller", text: "new F()" }, calling);
if (caller.kind !== "ready") throw new Error("failure caller");
const failureSession = createScriptSession(), failure = evaluateScript(failureSession, caller.record).completion;
check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "initializer error Realm");
check(failureSession.inspect().lastAbrupt?.record === failing.record && failureSession.inspect().active === null && failureSession.inspect().calls === 0, "initializer error source and caller restoration");
const limitRealm = new Realm((_line: string) => {}, "script");
const limitOwner = prepareBoundedScript({ id: "field-limit-owner", text: "class Limited{x=(()=>{while(true){}})()}" }, limitRealm);
if (limitOwner.kind !== "ready") throw new Error("limit owner");
check(evaluateScript(createScriptSession(), limitOwner.record).completion.type === "normal", "limit definition");
const limitCaller = prepareBoundedScript({ id: "field-limit-caller", text: "var caught=false;try{new Limited()}catch(e){caught=true}" }, limitRealm);
if (limitCaller.kind !== "ready") throw new Error("limit caller");
const limited = createScriptSession({ maxSteps: 80, maxCalls: 16 }), stopped = evaluateScript(limited, limitCaller.record).completion;
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "initializer uses current execution budget");
const caught = limitRealm.globalObject.getOwnProperty("caught");
check(caught !== undefined && caught.kind === "data" && caught.value.kind === "boolean" && !caught.value.value, "initializer resource stop cannot be caught");
check(limited.inspect().lastAbrupt?.record === limitOwner.record && limited.inspect().active === null && limited.inspect().calls === 0, "initializer budget source and restoration");
console.log("class field initializers passed");
