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
const cases:{source:string;before:string;after:string}[]=[
  {
    "source": "var o={x:7,async *g(){yield this.x;return 8}};var i=o.g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
    "before": "",
    "after": "78"
  },
  {
    "source": "class A{m(){return this.x}}class B extends A{constructor(){super();this.x=7}async *g(){yield await super.m()}}new B().g().next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  },
  {
    "source": "class A{static m(){return this.x}}class B extends A{static async *g(){yield super.m()}}B.x=7;B.g().next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var s=Symbol(\"g\");var o={async *[s](){yield 7}};out+=o[s].name; o[s]().next().then(r=>out+=r.value)",
    "before": "[g]",
    "after": "[g]7"
  },
  {
    "source": "class C{async *[Symbol.asyncIterator](){yield 1;yield await 2}}async function f(){for await(let x of new C())out+=x}f()",
    "before": "",
    "after": "12"
  },
  {
    "source": "var o={async *g(){yield this.x}};o.g.call({x:7}).next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var o={async *g(x=7){yield x}};out+=o.g.length+\":\"+o.g.hasOwnProperty(\"prototype\")+\":\"+Object.prototype.toString.call(o.g);try{new o.g()}catch(e){out+=\":\"+(e instanceof TypeError)}o.g().next().then(r=>out+=\":\"+r.value)",
    "before": "0:true:[object AsyncGeneratorFunction]:true",
    "after": "0:true:[object AsyncGeneratorFunction]:true:7"
  },
  {
    "source": "var p={m(){return this.x}},o={__proto__:p,x:7,async *g(){yield super.m()}};o.g().next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var o={async *g(){try{yield 1}finally{out+=\"f\";await 1;out+=\"g\"}}};var i=o.g();i.next().then(r=>out+=r.value);i.return(7).then(r=>out+=r.value)",
    "before": "",
    "after": "1fg7"
  },
  {
    "source": "var o={async *g(){}};out+=o.g.toString()===\"async *g(){}\"",
    "before": "true",
    "after": "true"
  },
  {
    "source": "class C{static async *constructor(){yield 7}}C.constructor().next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  }
];
for(const test of cases){const realm=fresh(),session=createScriptSession();check(run("var out='';"+test.source,realm,session).type==="normal","setup "+test.source);string("out",test.before,realm,session);const drained=drainScriptJobs(session);check(!drained.fatal&&drained.failures.length===0,"jobs "+test.source);string("out",test.after,realm,session);}
for(const text of ['class C{async *constructor(){}}','class C{static async *prototype(){}}','var o={async *get x(){}}','var o={async *g(a,a){}}','var o={async\n*g(){}}'])check(prepareBoundedScript({id:"boundary",text},fresh()).kind==="blocked","async generator method boundary "+text);
console.log("async generator methods passed");
