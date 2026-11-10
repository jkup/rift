import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-helpers", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: {source:string;before:string;after:string}[] = [
    {
        "source": "var o={async f(){return 7;}};o.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var o={x:7,async f(){return await this.x;}};o.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var o={async f(){return await this.x;}};o.f.call({x:8}).then(v=>out+=v);",
        "before": "",
        "after": "8"
    },
    {
        "source": "var base={f(){return this.x;}};var o={__proto__:base,x:7,async f(){return await super.f();}};o.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "class C{async f(){return await 7;}}new C().f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "class C{static async f(){return await 7;}}C.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "class A{f(){return this.x;}}class B extends A{async f(){return await super.f();}}var b=new B();b.x=7;b.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "class A{static f(){return this.x;}}class B extends A{static async f(){return await super.f();}}B.x=7;B.f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var n=0,key={toString(){n++;return \"f\";}};var o={async [key](){return await 7;}};out+=n+\":\"+o.f.name+\":\";o.f().then(v=>out+=v);",
        "before": "1:f:",
        "after": "1:f:7"
    },
    {
        "source": "class C{async [\"f\"](){return await 7;}}new C().f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var key=Symbol(\"f\"),o={async [key](){return await 7;}};out+=o[key].name+\":\";o[key]().then(v=>out+=v);",
        "before": "[f]:",
        "after": "[f]:7"
    },
    {
        "source": "var o={async f(a,b=1){return await (a+b);}};out+=o.f.length+\":\"+Object.hasOwn(o.f,\"prototype\")+\":\";o.f(6).then(v=>out+=v);",
        "before": "1:false:",
        "after": "1:false:7"
    },
    {
        "source": "var o={async f(){}};try{new o.f();}catch(e){out+=e instanceof TypeError;}out+=\":\"+Object.prototype.toString.call(o.f);",
        "before": "true:[object AsyncFunction]",
        "after": "true:[object AsyncFunction]"
    },
    {
        "source": "var o={async f(){throw 7;}};o.f().catch(v=>out+=v);out+=\"s\";",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "var o={async f([x]){return x;}};o.f(null).catch(e=>out+=e instanceof TypeError);",
        "before": "",
        "after": "true"
    },
    {
        "source": "var o={async f(){try{return await 7;}finally{await 1;out+=\"f\";}}};o.f().then(v=>out+=v);",
        "before": "",
        "after": "f7"
    },
    {
        "source": "var o={async(){return 7;},get asyncValue(){return 8;}};out+=o.async()+\":\"+o.asyncValue+\":\"+Object.prototype.toString.call(o.async);",
        "before": "7:8:[object Function]",
        "after": "7:8:[object Function]"
    },
    {
        "source": "class C{async(){return 7;}static async(){return 8;}}out+=new C().async()+\":\"+C.async();",
        "before": "7:8",
        "after": "7:8"
    },
    {
        "source": "var o={async:7};out+=o.async;",
        "before": "7",
        "after": "7"
    },
    {
        "source": "var o={async get(){return await 7;},async set(){return await 8;}};o.get().then(v=>out+=v);o.set().then(v=>out+=v);",
        "before": "",
        "after": "78"
    },
    {
        "source": "class C{static async constructor(){return await 7;}}C.constructor().then(v=>out+=v);",
        "before": "",
        "after": "7"
    }
];
for(const test of cases){
 const realm=fresh(),session=createScriptSession();
 check(run("var out='';"+test.source,realm,session).type === "normal","setup: "+test.source);
 string("out",test.before,realm,session);const drained=drainScriptJobs(session);
 check(!drained.fatal&&drained.failures.length===0,"checkpoint: "+test.source);string("out",test.after,realm,session);
}
for(const text of ['class C{async constructor(){}}','var o={async *f(){}}','class C{async *f(){}}','var o={async get f(){}}','class C{async set f(x){}}','var o={async f(a,a){}}','var o={async\nf(){}}','var o={async(){await 1;}}','class C{static async prototype(){}}'])
 check(prepareBoundedScript({id:"boundary",text},fresh()).kind === "blocked","async method boundary "+text);
console.log("async methods passed");
