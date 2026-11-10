import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(source: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + ": " + source);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases=[
  "function* f(){return class{[yield 1](){return 7}}}var g=f();g.next().value===1&&new(g.next(\"m\").value)().m()===7",
  "function* f(){class C{[yield 1](){return C}}return C}var g=f();g.next();var C=g.next(\"m\").value;C.name===\"C\"&&new C().m()===C",
  "function* f(){let C=class{[yield 1](){}};return C.name}var g=f();g.next();g.next(\"m\").value===\"C\"",
  "class A{m(){return 7}}function* f(){return class extends(yield 1){[yield 2](){return super.m()}}}var g=f();g.next().value===1&&g.next(A).value===2&&new(g.next(\"m\").value)().m()===7",
  "var order=\"\",key={[Symbol.toPrimitive](hint){order+=hint;return \"m\"}};function* f(){return class{[(order+=\"a\",yield 1)](){return 7}[(order+=\"b\",\"n\")](){}}}var g=f();g.next();var C=g.next(key).value;order===\"astringb\"&&new C().m()===7",
  "function* f(){return class{get [yield 1](){return 7}set [yield 2](v){this.value=v}static [yield 3](){return this}}}var g=f();g.next();g.next(\"m\").value===2&&g.next(\"m\").value===3;var C=g.next(\"s\").value,o=new C();o.m=8;o.m===7&&o.value===8&&C.s()===C",
  "var s=Symbol(\"key\");function* f(){return class{[yield 1](){}}}var g=f();g.next();var C=g.next(s).value;C.prototype[s].name===\"[key]\"&&!Object.getOwnPropertyDescriptor(C.prototype,s).enumerable",
  "var read;function* f(){return class Inner{[(read=()=>Inner,yield 1)](){return Inner}}}var g=f();g.next();var tdz=false;try{read()}catch(e){tdz=e instanceof ReferenceError}var C=g.next(\"m\").value;tdz&&read()===C&&new C().m()===C&&typeof Inner===\"undefined\"",
  "var Inner=7;function* f(){try{return class Inner{[((yield 1),Inner)](){}}}catch(e){return e instanceof ReferenceError&&Inner===7}}var g=f();g.next();g.next().value===true",
  "function* f(){try{return class{[((yield 1),missing=7)](){}}}catch(e){afterKey=8;return e instanceof ReferenceError}}var g=f();g.next();g.next().value===true&&afterKey===8&&typeof missing===\"undefined\"",
  "var read;function* f(){try{return class Inner{[(read=()=>Inner,yield 1)](){}}}finally{yield 2}}var g=f();g.next();var a=g.return(8),tdz=false;try{read()}catch(e){tdz=e instanceof ReferenceError}a.value===2&&g.next().value===8&&tdz",
  "var Inner=7;function* f(){try{return class Inner{[yield 1](){}}}catch(e){return e===8&&Inner===7}}var g=f();g.next();g.throw(8).value===true",
  "function* keys(){yield 1;return \"m\"}function* f(){return class{[yield* keys()](){return 7}}}var g=f();g.next().value===1&&new(g.next().value)().m()===7",
  "var closed=0,it={next(){return {value:1,done:false}},return(v){closed++;return {value:v,done:true}},[Symbol.iterator](){return this}};function* f(){return class{[yield* it](){}}}var g=f();g.next();g.return(8).value===8&&closed===1",
  "var reads=[];function* f(i){return class Inner{[(reads[i]=()=>Inner,yield i)](){return Inner}}}var a=f(0),b=f(1);a.next();b.next();var X=a.next(\"x\").value,Y=b.next(\"y\").value;reads[0]()===X&&reads[1]()===Y&&new X().x()===X&&new Y().y()===Y",
  "function* f(){var C;return(C||=class{[yield 1](){}}).name}var g=f();g.next();g.next(\"m\").value===\"C\"",
  "function* f(){return {C:class{[yield 1](){}}}.C.name}var g=f();g.next();g.next(\"m\").value===\"C\"",
  "function* f(){return class{[yield 1](){return 1}[yield 2](){return 2}}}var g=f();g.next();g.next(\"m\");var C=g.next(\"m\").value;new C().m()===2",
  "var key={[Symbol.toPrimitive](){throw 8}};function* f(){try{return class{[yield 1](){}}}catch(e){afterFailure=7;return e===8}}var g=f();g.next();g.next(key).value===true&&afterFailure===7",
  "function* f(){return class Outer{[(yield class Inner{[yield 1](){return Inner}})](){return Outer}}}var g=f();g.next();var Inner=g.next(\"m\").value;var C=g.next(\"n\").value;new Inner().m()===Inner&&new C().n()===C"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},'script'));check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'class key case '+i);}
for(const source of ['async function f(){return class{[await 1](){return 7}}}f().then(C=>out=new C()[1]())','async function* f(){yield class{[await 1](){return 7}}}f().next().then(r=>out=new r.value()[1]())','var f=async()=>class{[await 1](){return 7}};f().then(C=>out=new C()[1]())']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async class key');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){return class{[yield 1](){}}}function* h(){return class{[((yield 1),(function(){while(true){}})())](){}}}var g=f(),slow=h();g.next();slow.next();',A,creator);define(B,'g',own(A,'g'));define(B,'slow',own(A,'slow'));const steps=creator.inspect().steps,result=run('g.next({toString(){return {}},valueOf(){return {}}})',B);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype('TypeError'),'key error Realm');const stopped=run('slow.next()',B,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','class key current budget');check(creator.inspect().steps===steps,'creator session untouched');
console.log('generator class key passed');
