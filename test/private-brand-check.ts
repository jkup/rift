import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "private-brand", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("execute: " + text);
    }
}
for (const text of [
    "(()=>{class C{#x;static has(o){return #x in o}}return C.has(new C())&&!C.has({})})()",
    "(()=>{class C{#x;static has(o){return #x in o}}var c=new C();return !C.has(Object.create(c))})()",
    "(()=>{class C{#x;static has(o){return #x in o}}return C.has(Object.freeze(new C()))})()",
    "(()=>{class C{static #x;static has(o){return #x in o}}class D extends C{}return C.has(C)&&!C.has(D)})()",
    "(()=>{class C{#m(){}static has(o){return #m in o}}return C.has(new C())&&!C.has({})})()",
    "(()=>{class C{get #p(){throw 1}static has(o){return #p in o}}return C.has(new C())})()",
    "(()=>{class C{set #p(v){throw 1}static has(o){return #p in o}}return C.has(new C())})()",
    "(()=>{class C{before=#x in this;#x;after=#x in this}var c=new C();return !c.before&&c.after})()",
    "(()=>{class C{before=#m in this;#m(){}}return new C().before})()",
    "(()=>{var saved;class C{#a=1;#b=(()=>{saved=this;throw 1})();static has(o){return (#a in o)&&!(#b in o)}}try{new C()}catch(e){}return C.has(saved)})()",
    "(()=>{class B{constructor(o){return o}}class C extends B{#x;static has(o){return #x in o}}var o=Object.freeze({});new C(o);return C.has(o)})()",
    "(()=>{function make(){return class{#x;static has(o){return #x in o}}}var A=make(),B=make();return A.has(new A())&&!A.has(new B())})()",
    "(()=>{class C{#x;static nested(){return class{static has(o){return #x in o}}}}return C.nested().has(new C())})()",
    "(()=>{class C{#x;static nested(){return class{#x;static has(o){return #x in o}}}}var D=C.nested();return !D.has(new C())&&D.has(new D())})()",
    '(()=>{class C{#x;has(o){return eval("#x in o")}}var c=new C();return c.has(c)&&!c.has({})})()',
    '(()=>{var log="";class C{#x;static has(){return #x in (log+="r",null)}}try{C.has()}catch(e){return e instanceof TypeError&&log==="r"}return false})()',
    '(()=>{class C{#x;static has(o){return #x in o}}var values=[undefined,null,true,1,1n,"x",Symbol()];return values.every(v=>{try{C.has(v)}catch(e){return e instanceof TypeError}return false})})()',
    "(()=>{var n=0;class C{#x;static has(o){return #x in o}}var o={get x(){n++;throw 1},valueOf(){n++;throw 2}};return !C.has(o)&&n===0})()",
    "(()=>{class C{#x;*has(){return #x in (yield 1)}}var c=new C(),i=c.has();return i.next().value===1&&i.next(c).value===true})()",
    "(()=>{class C{#x;static has(o){return #x in o===true}}return C.has(new C())&&!C.has({})})()",
    "(()=>{class C{#x;static has(o){return (#x in o)?1:2}}return C.has(new C())===1&&C.has({})===2})()",
    "(()=>{class C{#x;static has(o){return #x in o in {true:1}}}return C.has(new C())})()",
    "class C{#x;*run(){try{return #x in (yield 1)}finally{this.done=true}}}var c=new C(),i=c.run();i.next();var r=i.return(9);r.done&&r.value===9&&c.done",
    "class C{#x;*run(){try{return #x in (yield 1)}catch(e){return e===7}}}var i=new C().run();i.next();i.throw(7).value===true",
    "class C{#π;static has(o){return #π in o}}C.has(new C())",
]) {
    passes(text);
}

for (const text of [
    "var result=false;class C{#x;async has(o){return #x in await o}}var c=new C();c.has(c).then(v=>result=v)",
    "var result=false;class C{#x;async *has(){return #x in (yield 1)}}var c=new C(),i=c.has();i.next().then(a=>i.next(c).then(b=>result=a.value===1&&!a.done&&b.value===true&&b.done))",
    "var result=false;class C{#x;async has(){return #x in await null}}new C().has().catch(e=>result=e instanceof TypeError)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    const prepared = prepareBoundedScript({ id: "private-brand-async", text }, realm);
    if (
        prepared.kind !== "ready" ||
        evaluateScript(session, prepared.record).completion.type !== "normal"
    ) {
        throw new Error("private brand async start");
    }
    const jobs = drainScriptJobs(session);
    if (jobs.fatal || jobs.failures.length !== 0) {
        throw new Error("private brand async jobs");
    }
    const probe = prepareBoundedScript({ id: "private-brand-result", text: "result" }, realm);
    if (probe.kind !== "ready") {
        throw new Error("private brand async result prepare");
    }
    const result = evaluateScript(session, probe.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("private brand async result");
    }
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const owned = prepareBoundedScript(
    { id: "private-brand-owner", text: "class C{#x;static has(o){return #x in o}}C.has" },
    owner,
);
if (owned.kind !== "ready") {
    throw new Error("private brand owner prepare");
}
const method = evaluateScript(createScriptSession(), owned.record).completion;
if (method.type !== "normal") {
    throw new Error("private brand owner execute");
}
caller.defineScriptGlobal("has", { value: method.value });
const foreign = prepareBoundedScript({ id: "private-brand-caller", text: "has(null)" }, caller);
if (foreign.kind !== "ready") {
    throw new Error("private brand caller prepare");
}
const crossing = createScriptSession(),
    error = evaluateScript(crossing, foreign.record).completion;
if (
    error.type !== "throw" ||
    error.value.kind !== "object" ||
    error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")
) {
    throw new Error("private brand error Realm");
}
if (crossing.inspect().active !== null || crossing.inspect().calls !== 0) {
    throw new Error("private brand caller restoration");
}

const budgetRealm = new Realm((_line: string) => {}, "script");
const loop = prepareBoundedScript(
    { id: "private-brand-budget", text: "class C{#x;run(){while(#x in this){}}}new C().run()" },
    budgetRealm,
);
if (loop.kind !== "ready") {
    throw new Error("private brand budget prepare");
}
const limited = createScriptSession({ maxSteps: 150, maxCalls: 64 });
const cutoff = evaluateScript(limited, loop.record).completion;
if (
    cutoff.type !== "throw" ||
    cutoff.origin.kind !== "resource-limit" ||
    cutoff.origin.guardCode !== "steps"
) {
    throw new Error("private brand budget cutoff");
}
if (limited.inspect().active !== null || limited.inspect().calls !== 0) {
    throw new Error("private brand budget restoration");
}
console.log("private brand check passed");
