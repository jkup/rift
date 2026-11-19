import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseBoundedScriptDeclarationPlan } from "../src/parser.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "static-blocks", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const text of [
    "class C{static{this.x=42}}C.x===42",
    'var order=[];class C{static [order.push("key")]=order.push("field");static{order.push("block");this.x=this.m()}[order.push("instance-key")];static after=order.push("after");static m(){return 42}}order.join()==="key,instance-key,field,block,after"&&C.x===42',
    'var x="outer";class C{static{this.before=x;var x=1;this.first=()=>x}static{this.second=x;var onlyHere=2}static{this.third=typeof onlyHere}}C.before===undefined&&C.first()===1&&C.second==="outer"&&C.third==="undefined"&&x==="outer"',
    "class C{static{this.value=f();function f(){return 1}function f(){return 42}}static{try{this.value=x}catch(e){this.tdz=e instanceof ReferenceError}let x}}C.value===42&&C.tdz",
    'class C{static{if(true){var x=42}this.x=x}static{this.x+=typeof x==="undefined"?1:0}}C.x===43',
    "class B{static get value(){return this.tag}}class C extends B{static tag=42;static{this.read=()=>[this,new.target,super.value]}}var out=C.read.call({});out[0]===C&&out[1]===undefined&&out[2]===42",
    'class B{static value(){return this}}class C extends B{static{this.receiver=eval("super.value()");this.target=eval("new.target");try{eval("arguments")}catch(e){this.rejected=e instanceof SyntaxError}eval("var hidden=1");this.hidden=typeof hidden}}C.receiver===C&&C.target===undefined&&C.rejected&&C.hidden==="undefined"',
    'var captured,caught;try{class C{static a=1;static{captured=this;throw 42}static b=2}}catch(e){caught=e}caught===42&&captured.a===1&&!Object.hasOwn(captured,"b")',
    "class C{static{this.f=function(){return arguments[0]}}}C.f(42)===42",
    'var C=class Inner{static{this.self=Inner;this.nameSeen=this.name}};C.self===C&&C.nameSeen==="Inner"',
    "var n=0;class C{static{n++}}new C();new C();n===1",
    "class C{static{var x=1;{let x=2;this.inner=()=>x}this.outer=()=>x}}C.inner()===2&&C.outer()===1",
    "class C{static{var x;try{throw 42}catch(e){x=e}finally{x++}this.x=x}}C.x===43",
    "class C{static{var total=0;for(var i=0;i<3;i++){if(i===1)continue;total+=i}this.total=total;this.i=i}}C.total===2&&C.i===3",
    "class C{static{outer:for(var i=0;i<3;i++){break outer}this.i=i}}C.i===0",
    'function* g(){class C{static{this.x=42}[yield "key"]=this;}return C}var i=g();i.next();var C=i.next("self").value,c=new C();C.x===42&&c.self===c',
    "function f(){return class{static{this.target=new.target}}}f().target===undefined",
    'class C{static{this.read=()=>{try{eval("()=>arguments")}catch(e){return e instanceof SyntaxError}}}}C.read()',
    "class C{static{this.D=class{static{this.x=42}}}}C.D.x===42",
    "class C{static{var x=1;this.f=()=>++x}static{var x=10;this.g=()=>++x}}C.f()===2&&C.g()===11&&C.f()===3",
    "var n=0;try{class C{static{n++;missing}static{n++}}}catch(e){}n===1",
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "class C{static{return}}",
    "function f(){class C{static{return 1}}}",
    "outer:while(false){class C{static{break outer}}}",
    "while(false){class C{static{continue}}}",
    "class C{static{arguments}}",
    "class C{static{()=>arguments}}",
    "class C{static{super()}}",
    "class C{static{await 1}}",
    "class C{static{for await(var x of []){}}}",
    "class C{static{let x;var x}}",
    "class C{static{let x;let x}}",
    "class C{static{delete x}}",
    "class C{static{var eval}}",
    "class C{#x}",
]) {
    const prepared = prepareBoundedScript(
        { id: "invalid-static-block", text },
        new Realm((_line: string) => {}, "script"),
    );
    check(text === "class C{#x}" ? prepared.kind === "ready" : prepared.kind !== "ready", text);
}
const plan = parseBoundedScriptDeclarationPlan({
    id: "static-block-scopes",
    text: "class C{static{var x;this.f=()=>x}static{var x;}}",
});
check(
    plan.kind === "complete" &&
        plan.scopes.map((scope) => scope.kind).join() ===
            "script,class,static-block,function,static-block" &&
        plan.scopes[0].varNames.length === 0 &&
        plan.scopes[1].varNames.length === 0,
    "independent preorder scopes",
);
const realm = new Realm((_line: string) => {}, "script"),
    session = createScriptSession();
const asyncSource = prepareBoundedScript(
    {
        id: "async-static-key",
        text: 'var result=false;async function f(){return class{static{this.x=42}[await "self"]=this}}f().then(C=>{var c=new C();result=C.x===42&&c.self===c})',
    },
    realm,
);
if (asyncSource.kind !== "ready") {
    throw new Error("async prepare");
}
check(evaluateScript(session, asyncSource.record).completion.type === "normal", "async definition");
const jobs = drainScriptJobs(session);
check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
const result = run("result", realm);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "awaited outer key",
);
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const factory = prepareBoundedScript(
    {
        id: "static-block-owner",
        text: 'function factory(){return class{static{throw new TypeError("block")}}}factory',
    },
    owner,
);
if (factory.kind !== "ready") {
    throw new Error("factory prepare");
}
const fn = evaluateScript(createScriptSession(), factory.record).completion;
if (fn.type !== "normal") {
    throw new Error("factory definition");
}
caller.defineScriptGlobal("factory", { value: fn.value });
const calling = prepareBoundedScript({ id: "static-block-caller", text: "factory()" }, caller);
if (calling.kind !== "ready") {
    throw new Error("caller prepare");
}
const crossing = createScriptSession(),
    failure = evaluateScript(crossing, calling.record).completion;
check(
    failure.type === "throw" &&
        failure.value.kind === "object" &&
        failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
    "defining Realm error",
);
check(
    crossing.inspect().active === null &&
        crossing.inspect().calls === 0 &&
        crossing.inspect().lastAbrupt?.record === factory.record,
    "static block error source and restoration",
);
const limitRealm = new Realm((_line: string) => {}, "script");
const limit = prepareBoundedScript(
    {
        id: "static-block-limit",
        text: "var caught=false;try{class C{static{while(true){}}}}catch(e){caught=true}",
    },
    limitRealm,
);
if (limit.kind !== "ready") {
    throw new Error("limit prepare");
}
const limited = createScriptSession({ maxSteps: 80, maxCalls: 16 }),
    stopped = evaluateScript(limited, limit.record).completion;
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "static block resource budget",
);
const caught = limitRealm.globalObject.getOwnProperty("caught");
check(
    caught !== undefined &&
        caught.kind === "data" &&
        caught.value.kind === "boolean" &&
        !caught.value.value,
    "budget stop cannot be caught",
);
check(
    limited.inspect().active === null &&
        limited.inspect().calls === 0 &&
        limited.inspect().lastAbrupt?.record === limit.record,
    "static block budget restoration",
);
console.log("class static blocks passed");
