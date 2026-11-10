import type { Value, OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
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
    "source": "async function* g(){out+=\"b\";yield 1;yield Promise.resolve(2);return 3}var i=g();out+=\"c\";i.next().then(r=>out+=r.value+\":\"+r.done+\";\");i.next().then(r=>out+=r.value+\":\"+r.done+\";\");i.next().then(r=>out+=r.value+\":\"+r.done+\";\");i.next().then(r=>out+=r.value+\":\"+r.done+\";\");out+=\"s\"",
    "before": "cbs",
    "after": "cbs1:false;2:false;3:true;undefined:true;"
  },
  {
    "source": "async function* g(x=(out+=\"p\")){out+=\"b\";yield x}var i=g();out+=\"s\"",
    "before": "ps",
    "after": "ps"
  },
  {
    "source": "async function* g(x=missing){}try{g()}catch(e){out+=e instanceof ReferenceError}",
    "before": "true",
    "after": "true"
  },
  {
    "source": "async function* g(){try{yield Promise.reject(7)}catch(e){yield e+1}}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.done)",
    "before": "",
    "after": "8true"
  },
  {
    "source": "async function* g(){try{return {then(r){out+=\"a\";r(7)}}}finally{out+=\"f\"}}g().next().then(r=>out+=r.value+\":\"+r.done);out+=\"s\"",
    "before": "s",
    "after": "saf7:true"
  },
  {
    "source": "async function* g(){try{return Promise.reject(7)}catch(e){yield e+1}return 9}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
    "before": "",
    "after": "89"
  },
  {
    "source": "async function* g(){out+=\"bad\";yield 1}var i=g();i.return(Promise.resolve(7)).then(r=>out+=r.value+\":\"+r.done);i.next().then(r=>out+=\":\"+r.done);out+=\"s\"",
    "before": "s",
    "after": "s7:true:true"
  },
  {
    "source": "async function* g(){out+=\"bad\"}var i=g();i.throw(7).catch(e=>out+=e);i.next().then(r=>out+=r.done);out+=\"s\"",
    "before": "s",
    "after": "s7true"
  },
  {
    "source": "async function* g(){}var i=g();var p=i.next.call({});out+=p instanceof Promise;p.catch(e=>out+=\":\"+(e instanceof TypeError))",
    "before": "true",
    "after": "true:true"
  },
  {
    "source": "var c=Promise.withResolvers();async function* g(){yield await c.promise;yield 8}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.done);out+=\"s\";c.resolve(7)",
    "before": "s",
    "after": "s78true"
  },
  {
    "source": "var i;async function* g(){yield {then(r){out+=\"t\";i.next().then(x=>out+=x.value);r(7)}};yield 8}i=g();i.next().then(r=>out+=r.value)",
    "before": "",
    "after": "t78"
  },
  {
    "source": "async function* g(){try{yield 1;yield 2}finally{out+=\"f\";await 1;out+=\"g\"}}async function f(){for await(let x of g()){out+=x;break}out+=\"e\"}f()",
    "before": "",
    "after": "1fge"
  },
  {
    "source": "async function* g(){try{yield 1}catch(e){yield e}return 9}var i=g();i.next().then(r=>out+=r.value);i.return(Promise.reject(7)).then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
    "before": "",
    "after": "179"
  },
  {
    "source": "async function* g(){}var i=g();i.next().then(r=>out+=r.done);i.return(Promise.resolve(7)).then(r=>out+=r.value);i.throw(8).catch(e=>out+=e)",
    "before": "",
    "after": "true78"
  },
  {
    "source": "var C=(async function*(){}).constructor;var g=C(\"x\",\"yield x;return 8\");var i=g(7);i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value);out+=g instanceof C",
    "before": "true",
    "after": "true78"
  },
  {
    "source": "async function* g(){}var i=g();out+=(i[Symbol.asyncIterator]()===i)+\":\"+(i[Symbol.iterator]===undefined)+\":\"+Object.prototype.toString.call(i)+\":\"+Object.prototype.toString.call(g)+\":\"+g.length;try{new g()}catch(e){out+=\":\"+(e instanceof TypeError)}",
    "before": "true:true:[object AsyncGenerator]:[object AsyncGeneratorFunction]:0:true",
    "after": "true:true:[object AsyncGenerator]:[object AsyncGeneratorFunction]:0:true"
  },
  {
    "source": "var i;async function* g(){out+=\"b\";i.next().then(r=>out+=r.value);yield 7;yield 8}i=g();i.next().then(r=>out+=r.value)",
    "before": "b",
    "after": "b78"
  },
  {
    "source": "async function* g(){var x=yield 1;yield x}var i=g();i.next(99).then(r=>out+=r.value);i.next(7).then(r=>out+=r.value)",
    "before": "",
    "after": "17"
  },
  {
    "source": "var p=Promise.resolve(7);Object.defineProperty(p,\"constructor\",{get(){throw 8}});async function* g(){var n=0;while(n<2000){try{yield p}catch(e){n++}}return n}g().next().then(r=>out+=r.value)",
    "before": "",
    "after": "2000"
  },
  {
    "source": "var c=Promise.withResolvers(),p=Promise.resolve(7),n=0;Object.defineProperty(p,\"constructor\",{get(){throw 8}});var i=(async function*(){})();i.next();i.return(c.promise);for(var k=0;k<2000;k++)i.return(p).catch(e=>{if(e===8)n++});c.resolve(1);Promise.resolve().then(()=>{}).then(()=>out+=n)",
    "before": "",
    "after": "2000"
  }
];
cases.push({source:'async function* g(){try{return;}finally{out+="f"}}g().next().then(r=>out+=r.done);out+="s"',before:'fs',after:'fstrue'});
cases.push({source:'async function* g(){try{return undefined;}finally{out+="f"}}g().next().then(r=>out+=r.done);out+="s"',before:'s',after:'sftrue'});
cases.push({source:"var o={async *g(){}};o.g().next().then(r=>out+=r.done);class C{async *g(){}}new C().g().next().then(r=>out+=r.done);",before:"",after:"truetrue"});
for(const test of cases){const realm=fresh(),session=createScriptSession({maxSteps:1000000,maxCalls:64});check(run("var out='';"+test.source,realm,session).type==="normal","setup "+test.source);string("out",test.before,realm,session);const drained=drainScriptJobs(session);check(!drained.fatal&&drained.failures.length===0,"jobs "+test.source);string("out",test.after,realm,session);}
for(const text of ['async function* g(){yield* []}'])check(prepareBoundedScript({id:"boundary",text},fresh()).kind==="blocked","async generator boundary "+text);
{
 const owner=fresh(),caller=fresh(),creator=createScriptSession();
 check(run('var c=Promise.withResolvers(),out="";async function* g(){yield await c.promise;yield 8}var i=g(),p=i.next();',owner,creator).type==="normal","pending generator");
 for(const name of ['c','i','p']){const property=owner.globalObject.getOwnProperty(name);if(property===undefined||property.kind!=="data")throw new Error(name);caller.defineScriptGlobal(name,{value:property.value});}
 caller.defineScriptGlobal('ownerPrototype',{value:{kind:"object",object:owner.objectPrototype}});
 const session=createScriptSession();check(run('var out="";p.then(r=>out+=r.value+":"+(Object.getPrototypeOf(r)===ownerPrototype));i.next().then(r=>out+=":"+r.value);c.resolve(7);',caller,session).type==="normal","foreign resolution");
 const steps=creator.inspect().steps,drained=drainScriptJobs(session);check(!drained.fatal&&drained.failures.length===0&&creator.inspect().steps===steps,"generator current session");string('out','7:true:8',caller,session);
 check(run('var next=(async function*(){})().next;next.call(i).then(r=>out+=":"+(Object.getPrototypeOf(r)===Object.prototype));',caller,session).type==="normal","foreign completion");check(!drainScriptJobs(session).fatal,"completion checkpoint");
 string('out','7:true:8:true',caller,session);
 const state=session.inspect();check(state.active===null&&state.calls===0&&state.depth===0,"caller restored");
}
{
 const realm=fresh(),session=createScriptSession({maxSteps:200,maxCalls:16});
 check(run('var out="";async function* g(){try{yield 1;while(true){}}finally{out+="bad"}}var i=g();i.next();i.next().catch(()=>out+="bad");',realm,session).type==="normal","fatal setup");
 const drained=drainScriptJobs(session);check(drained.fatal&&drained.failures.length===1&&drained.failures[0].completion.origin.kind==="resource-limit","generator fatal budget");string('out','',realm,createScriptSession());
}
for(const body of ['hostFault();','var p=Promise.resolve(1);Object.defineProperty(p,"constructor",{get(){hostFault()}});yield p;']){
 const realm=fresh(),session=createScriptSession(),sentinel=new Error("host fault");
 const fault=realm.createBuiltin('hostFault',0,(_receiver:Value,_args:Value[],_context:OperationContext,_loc:Location):ValueCompletion=>{throw sentinel});realm.defineScriptGlobal('hostFault',{value:{kind:"object",object:fault}});
 check(run('var out="";async function* g(){'+body+'}var i=g();',realm,session).type==="normal","host fault setup");let caught=false;
 try{run('i.next();',realm,session)}catch(error){if(error instanceof Error)caught=error===sentinel}
 const state=session.inspect();check(caught&&state.active===null&&state.calls===0&&state.depth===0,"host fault identity/restoration");
 const next=createScriptSession();check(run('i.next().then(r=>out+=r.done);',realm,next).type==="normal","host fault completion");check(!drainScriptJobs(next).fatal,"completed generator job");string('out','true',realm,next);
}
console.log("async generator passed");
