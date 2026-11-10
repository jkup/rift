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
const cases: string[] = [
  "function id(x){return x}function* f(){return id(yield 1)}var g=f();g.next().value===1&&g.next(7).value===7",
  "function add(a,b){return a+b}function* f(){return add(yield 1,yield 2)}var g=f();g.next();g.next(3).value===2&&g.next(4).value===7",
  "var log=\"\",o={x:3,get f(){log+=\"g\";return function(a,b){log+=\"c\";return this.x+a+b}}};function a(){log+=\"a\";return 2}function* f(){return o.f(a(),yield 1)}var g=f();g.next();var before=log;g.next(2).value===7&&before===\"ga\"&&log===\"gac\"",
  "var o={x:3,f(a){return this.x+a}};function* f(){return o.f(yield 1)}var g=f();g.next();o.f=function(){return 99};o={x:99};g.next(4).value===7",
  "var log=\"\";function n(){log+=\"a\";return 2}function* f(){try{return 7(yield 1,n())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(3).value===true&&log===\"a\"",
  "var log=\"\";function* f(){try{return missing(yield 1)}catch(e){return e instanceof ReferenceError}}var r=f().next();r.done&&r.value===true",
  "function add(...x){return x.join(\":\")}function* f(){return add(1,...(yield 2),4)}var g=f();g.next();g.next([2,3]).value===\"1:2:3:4\"",
  "function add(...x){return x.join(\":\")}function* f(){return add(...[1,2],yield 3,...[4,5])}var g=f();g.next();g.next(3).value===\"1:2:3:4:5\"",
  "var log=\"\",o={[Symbol.iterator](){log+=\"i\";var n=0;return {next(){log+=\"n\";return {value:++n,done:n>1}}}}};function add(a,b){return a+b}function* f(){return add(...o,yield 1)}var g=f();g.next();var before=log;g.next(6).value===7&&before===\"inn\"",
  "var n=0,o={[Symbol.iterator](){return {next(){throw 8},return(){n++;return {}}}}};function id(x){return x}function* f(){try{return id(...(yield 1))}catch(e){return e}}var g=f();g.next();g.next(o).value===8&&n===0",
  "var n=0;function id(x){n++;return x}function* f(){try{return id(yield 1)}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
  "var n=0;function id(x){n++;return x}function* f(){try{return id(yield 1)}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
  "function id(x){return x}function* f(){return id(id(yield 1)+1)}var g=f();g.next();g.next(6).value===7",
  "function* f(){let x=7;return eval(yield 1)}var g=f();g.next();g.next(\"x\").value===7",
  "var x=3;function* f(){let x=7;return (0,eval)(yield 1)}var g=f();g.next();g.next(\"x\").value===3",
  "function* f(){let x=7;return eval(yield 1)}var g=f();g.next();eval=function(){return 99};g.next(\"x\").value===7",
  "function* f(){let x=7;eval(yield 1);return x}var g=f();g.next();g.next(\"x=8\").value===8",
  "var o={x:3,f(a){return this.x+a}},p={__proto__:o,*g(){return super.f(yield 1)}};var i=p.g();i.next();i.next(4).value===7",
  "Object.defineProperty(Number.prototype,\"f\",{value:function(x){\"use strict\";return this+x}});function* f(){return (3).f(yield 1)}var g=f();g.next();g.next(4).value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"call case "+i);}
for(const source of ['function* f(){(yield 1)()}', 'function* f(){(yield 1).x(2)}', 'function* f(){o?.f(yield 1)}'])check(prepareBoundedScript({id:'boundary',text:source},new Realm((_line:string)=>{},'script')).kind==='blocked','call boundary '+source);
for(const source of ['async function f(){return Math.max(1,await Promise.resolve(7))}f().then(x=>out=x)', 'async function f(){return Math.max(...(await Promise.resolve([1,7])))}f().then(x=>out=x)', 'async function* f(){yield Math.max(1,await Promise.resolve(7))}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async call result');
}
{
 const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();
 run('var o={x:3,f(a){return this.x+a}};function* f(){return o.f(yield 1)}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));const steps=creator.inspect().steps,session=createScriptSession();
 const result=run('g.next(4).value===7',B,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'foreign receiver');check(creator.inspect().steps===steps,'current call session');
}
{
 const realm=new Realm((_line:string)=>{},'script'),creator=createScriptSession();
 run('var cleaned=false;function costly(){while(true){}}function* f(){try{return costly(yield 1)}finally{cleaned=true}}var g=f();g.next();',realm,creator);
 const result=run('g.next(7)',realm,createScriptSession({maxSteps:100,maxCalls:16}));check(result.type==='throw'&&result.origin.kind==='resource-limit','current call budget');const clean=run('cleaned',realm);check(clean.type==='normal'&&clean.value.kind==='boolean'&&!clean.value.value,'fatal skips cleanup');
}
{
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession(),sentinel=new Error('host call fault');
 const fault=realm.createBuiltin('hostFault',0,(_receiver:Value,_args:Value[],_context:OperationContext,_loc:Location):ValueCompletion=>{throw sentinel});define(realm,'hostFault',{kind:'object',object:fault});
 run('function* f(){return hostFault(yield 1)}var g=f();g.next();',realm,session);let caught=false;try{run('g.next(7)',realm,session)}catch(error){if(error instanceof Error)caught=error===sentinel}const state=session.inspect();check(caught&&state.active===null&&state.calls===0&&state.depth===0,'host call fault restored');
}
{
 const source='function* f(){new F(yield 1)}',realm=new Realm((_line:string)=>{},'script');check(prepareBoundedScript({id:'historical-new',text:source},realm).kind==='ready','historical new admitted');const result=run('var out=0;function F(x){out=x}'+source+'var g=f();g.next();g.next(7).done&&out===7',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'historical new resumes');
}
console.log('generator call passed');
