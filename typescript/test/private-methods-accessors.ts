import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "private-methods", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("execute: " + text);
}
for (const text of [
    'class C{x=this.#m();#m(){return 7}}new C().x===7',
    'class C{static x=this.#m();static{this.y=this.#m()}static #m(){return 7}}C.x===7&&C.y===7',
    'class C{#v=1;x=++this.#p;get #p(){return this.#v}set #p(v){this.#v=v}get(){return this.#p}}var c=new C();c.x===2&&c.get()===2',
    'class C{#v=1;set #p(v){this.#v=v}get #p(){return this.#v}run(){return ++this.#p}}new C().run()===2',
    'class C{static #v=1;static get #p(){return this.#v}static set #p(v){this.#v=v}static x=++this.#p}C.x===2',
    'class C{get #p(){return 1}run(){try{this.#p=2}catch(e){return e instanceof TypeError}}}new C().run()',
    'class C{set #p(v){}run(){try{return this.#p}catch(e){return e instanceof TypeError}}}new C().run()',
    'var n=0;class C{#m(){}run(){this.#m=++n}}var bad=false;try{new C().run()}catch(e){bad=e instanceof TypeError}bad&&n===1',
    'var n=0;class B{constructor(o){return o}}class C extends B{#m(){}#x=++n;static read(o){return o.#x}}var o=Object.freeze({}),bad=false;new C(o);try{new C(o)}catch(e){bad=e instanceof TypeError}bad&&n===1&&C.read(o)===1',
    'var saved;class C{#m(){return 3}x=(()=>{saved=this;throw 9})();static read(o){return o.#m()}}try{new C()}catch(e){}C.read(saved)===3',
    'class C{#v=1;get #p(){return this.#v}set #p(v){this.#v=v}run(){return ++this.#p}}var c=Object.freeze(new C());c.run()===2&&Object.getOwnPropertyNames(c).length===0&&Object.getOwnPropertySymbols(c).length===0',
    'class C{static #m(){return 1}static run(){return this.#m()}}class D extends C{}var bad=false;try{D.run()}catch(e){bad=e instanceof TypeError}C.run()===1&&bad',
    'class C{#m(){}static #s(){}names(){return this.#m.name+","+C.#s.name}}new C().names()==="#m,#s"',
    'class B{get x(){return this.value}}class C extends B{value=5;#m(){return super.x}run(){return this.#m()}}new C().run()===5',
    'class C{#m(){return this}run(){return this.#m()}optional(o){return o?.#m()}}var c=new C();c.run()===c&&c.optional(c)===c&&c.optional(null)===undefined',
    'class C{#m(){return 4}run(){return eval("this.#m()")}closure(){return eval("()=>this.#m()")}}var c=new C();c.run()===4&&c.closure()()===4',
    'class C{*#g(){yield 3;return 4}run(){return this.#g()}}var i=new C().run();i.next().value===3&&i.next().value===4',
    'class C{#m(x){return this===x}*run(){return (yield this).#m(yield 1)}}var c=new C(),i=c.run();i.next();i.next(c);i.next(c).value===true',
    'class C{#v=1;get #p(){return this.#v}set #p(v){this.#v=v}*run(){(yield this).#p+=yield 1;return this.#p}}var c=new C(),i=c.run();i.next();i.next(c);i.next(4).value===5',
    'function make(){return class{#m(){return 1}read(o){return o.#m()}}}var A=make(),B=make(),bad=false;try{new A().read(new B())}catch(e){bad=e instanceof TypeError}bad',
    'class C{#m(){return this}get(){return this.#m}}new C().get()()===undefined',
    'class C{#m(){}run(){try{return new this.#m()}catch(e){return e instanceof TypeError}}}new C().run()',
]) passes(text);
const realm = new Realm((_line: string) => {}, "script"), session = createScriptSession();
const prepared = prepareBoundedScript({ id: "private-async-method", text: 'var result=false;class C{async #m(){return 4}async run(){return await this.#m()}}new C().run().then(x=>result=x===4)' }, realm);
if (prepared.kind !== "ready" || evaluateScript(session, prepared.record).completion.type !== "normal") throw new Error("async private method start");
const jobs = drainScriptJobs(session);
if (jobs.fatal || jobs.failures.length !== 0) throw new Error("async private method jobs");
const probe = prepareBoundedScript({ id: "private-async-result", text: "result" }, realm);
if (probe.kind !== "ready") throw new Error("async private method result prepare");
const result = evaluateScript(session, probe.record).completion;
if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("async private method result");
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const owned = prepareBoundedScript({ id: "private-accessor-owner", text: 'class C{get #p(){throw new TypeError("private")}read(){return this.#p}}new C()' }, owner);
if (owned.kind !== "ready") throw new Error("private accessor owner prepare");
const instance = evaluateScript(createScriptSession(), owned.record).completion;
if (instance.type !== "normal") throw new Error("private accessor owner execute");
caller.defineScriptGlobal("instance", { value: instance.value });
const foreign = prepareBoundedScript({ id: "private-accessor-caller", text: "instance.read()" }, caller);
if (foreign.kind !== "ready") throw new Error("private accessor caller prepare");
const crossing = createScriptSession(), error = evaluateScript(crossing, foreign.record).completion;
if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("private accessor error Realm");
if (crossing.inspect().active !== null || crossing.inspect().calls !== 0) throw new Error("private accessor caller restoration");
console.log("private methods accessors passed");
