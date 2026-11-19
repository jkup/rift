import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "private-fields", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("execute: " + text);
    }
}
for (const text of [
    "class C{#x=1;get(){return this.#x}set(v){return this.#x=v}}var c=new C();c.get()===1&&c.set(4)===4&&c.get()===4",
    "class C{#x=1;run(){return this.#x+++ ++this.#x}}new C().run()===4",
    "class C{#x=1;run(){this.#x+=2;this.#x*=3;return this.#x}}new C().run()===9",
    "class C{#x;run(){this.#x??=7;this.#x||=9;this.#x&&=3;return this.#x}}new C().run()===3",
    "class C{static #x=2;static get(){return this.#x}}class D extends C{}var bad=false;try{D.get()}catch(e){bad=e instanceof TypeError}C.get()===2&&bad",
    "class C{#x=1;inc(){return ++this.#x}}var c=Object.freeze(new C());c.inc()===2&&Object.getOwnPropertyNames(c).length===0&&Object.getOwnPropertySymbols(c).length===0",
    "function make(){return class{#x=1;get(o){return o.#x}}}var A=make(),B=make(),bad=false;try{new A().get(new B())}catch(e){bad=e instanceof TypeError}bad",
    "class A{#x=1;a(){return this.#x}}class B extends A{#x=2;b(){return this.#x}}var b=new B();b.a()===1&&b.b()===2",
    "class C{#f=function(){return this};call(){return this.#f()}optional(o){return o?.#f()}}var c=new C();c.call()===c&&c.optional(c)===c&&c.optional(null)===undefined",
    "var n=0;class B{constructor(o){return o}}class C extends B{#x=++n;static get(o){return o.#x}}var o=Object.freeze({}),bad=false;new C(o);try{new C(o)}catch(e){bad=e instanceof TypeError}n===2&&C.get(o)===1&&bad",
    "var saved;class C{#a=1;#b=(()=>{saved=this;throw 9})();static get(o){return o.#a}static later(o){return o.#b}}try{new C()}catch(e){}var bad=false;try{C.later(saved)}catch(e){bad=e instanceof TypeError}C.get(saved)===1&&bad",
    "var n=0;class C{#x;static set(o){return o.#x=++n}static add(o){return o.#x+=++n}}try{C.set(null)}catch(e){}try{C.add(null)}catch(e){}n===1",
    "class C{#x=0;run(){[this.#x]=[7];({x:this.#x}={x:9});return this.#x}}new C().run()===9",
    "class C{#x=1;*run(){return (yield this).#x}}var c=new C(),i=c.run();i.next();i.next(c).value===1",
    "class C{#x=1;*run(){(yield this).#x+=yield 2;return this.#x}}var c=new C(),i=c.run();i.next();i.next(c);i.next(4).value===5",
    "class C{#x=1;*run(){return ++(yield this).#x}}var c=new C(),i=c.run();i.next();i.next(c).value===2",
    "class C{#f=function(x){return this===x};*run(){return (yield this).#f(yield 2)}}var c=new C(),i=c.run();i.next();i.next(c);i.next(c).value===true",
    "class C{#f=function(x){return this===x};*run(){return (yield this)?.#f(yield 2)}}var c=new C(),i=c.run();i.next();i.next(c);i.next(c).value===true",
    'class C{#x=3;get(){return eval("this.#x")}closure(){return eval("()=>this.#x")}}var c=new C();c.get()===3&&c.closure()()===3',
    'class C{#x=3;get(){return eval("eval(\\"this.#x\\")")}}new C().get()===3',
    'class C{#x=3;#y=eval("this.#x+1");get(){return this.#y}}new C().get()===4',
    'class C{#x=3;get(){return eval("class D{#x=4;get(){return this.#x}};new D().get()")}}new C().get()===4',
    'class C{#x=3;get(){return eval("class D{get(o){return o.#x}};new D().get(this)")}}new C().get()===3',
    'class C{#x=3;get(){try{return (0,eval)("this.#x")}catch(e){return e instanceof SyntaxError}}}new C().get()===true',
    'class C{#x=3;get(){try{return Function("return this.#x")}catch(e){return e instanceof SyntaxError}}}new C().get()===true',
    "class C{#π=1;#𐐀=2;#\\u0078=3;get(){return this.#π+this.#𐐀+this.#x}}new C().get()===6",
    'class C{#x=function(){};get(){return this.#x.name}}new C().get()==="#x"',
    "class C{static #x=2;static y=this.#x;static{this.#x++}static get(){return this.#x}}C.y===2&&C.get()===3",
    "var bad=false;try{class C{static a=this.#x;static #x=2}}catch(e){bad=e instanceof TypeError}bad",
    'function* g(){class C{#x=4;[yield 1](){return this.#x}}return C}var i=g();i.next();var C=i.next("get").value;new C().get()===4',
    "class C{#x=1;*run(){var o=(yield this).#x;yield o;return this.#x}}var c=new C(),i=c.run();i.next();i.next(c).value===1&&i.return(9).value===9",
    "class C{#f=function(){this.ok=true};make(){return new this.#f()}}new C().make().ok===true",
]) {
    passes(text);
}
for (const text of [
    "class C{#x;#x}",
    "class C{#constructor}",
    "class C{m(o){return o.#x}}",
    "class C{#x;m(o){return delete o.#x}}",
]) {
    const prepared = prepareBoundedScript(
        { id: "private-invalid", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (
        prepared.kind !== "blocked" ||
        prepared.rejection.kind !== "syntax-error" ||
        prepared.rejection.ruleCode !== "private-name"
    ) {
        throw new Error("private syntax provenance: " + text);
    }
}
for (const text of [
    "class C{#x(){}}",
    "class C{get #x(){return 1}}",
    "class C{#x;m(o){return #x in o}}",
    "class C{#x;#x} @",
]) {
    const prepared = prepareBoundedScript(
        { id: "private-blocked", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (text !== "class C{#x;#x} @") {
        if (prepared.kind !== "ready") {
            throw new Error("original private class declaration: " + text);
        }
    } else if (prepared.kind !== "blocked" || prepared.rejection.kind !== "unsupported-syntax") {
        throw new Error("private unsupported boundary: " + text);
    }
}
for (const text of [
    "var result=false;class C{#x=1;async run(){(await this).#x+=await 4;return this.#x}}new C().run().then(x=>result=x===5)",
    "var result=false;class C{#x=1;async *run(){yield (await this).#x;return ++this.#x}}var i=new C().run();i.next().then(a=>i.next().then(b=>result=a.value===1&&!a.done&&b.value===2&&b.done))",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    const prepared = prepareBoundedScript({ id: "private-async", text }, realm);
    if (
        prepared.kind !== "ready" ||
        evaluateScript(session, prepared.record).completion.type !== "normal"
    ) {
        throw new Error("private async start");
    }
    const jobs = drainScriptJobs(session);
    if (jobs.fatal || jobs.failures.length !== 0) {
        throw new Error("private async jobs");
    }
    const probe = prepareBoundedScript({ id: "private-async-result", text: "result" }, realm);
    if (probe.kind !== "ready") {
        throw new Error("private async result prepare");
    }
    const result = evaluateScript(session, probe.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("private async result");
    }
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const owned = prepareBoundedScript(
    { id: "private-owner", text: "class C{#x=7;read(o){return o.#x}}new C()" },
    owner,
);
if (owned.kind !== "ready") {
    throw new Error("private owner prepare");
}
const instance = evaluateScript(createScriptSession(), owned.record).completion;
if (instance.type !== "normal") {
    throw new Error("private owner execute");
}
caller.defineScriptGlobal("instance", { value: instance.value });
const foreign = prepareBoundedScript({ id: "private-caller", text: "instance.read({})" }, caller);
if (foreign.kind !== "ready") {
    throw new Error("private caller prepare");
}
const session = createScriptSession(),
    error = evaluateScript(session, foreign.record).completion;
if (
    error.type !== "throw" ||
    error.value.kind !== "object" ||
    error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")
) {
    throw new Error("private error Realm");
}
if (session.inspect().active !== null || session.inspect().calls !== 0) {
    throw new Error("private caller restoration");
}
console.log("private field execution passed");
