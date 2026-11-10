import { Realm } from "../src/realm.js";
import { getAsyncIterator } from "../src/async-iterator.js";
import { normal, UNDEFINED, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
function check(ok:boolean,label:string):void {if(!ok)throw new Error(label)}
function fresh():Realm {
 const realm=new Realm((_line:string)=>{},"script");
 const adapt=realm.createBuiltin("adapt",1,(_receiver,args,context,loc):ValueCompletion=>{
  const result=getAsyncIterator(args.length===0?UNDEFINED:args[0],context,loc);
  return result.type==="throw"?result:normal({kind:"object",object:result.value.iterator});
 });
 realm.defineScriptGlobal("adapt",{value:{kind:"object",object:adapt}});return realm;
}
function run(text:string,realm:Realm,session:ScriptSession):ValueCompletion {
 const p=prepareBoundedScript({id:"async-iterator",text},realm);if(p.kind!=="ready")throw new Error("prepare "+text);
 return evaluateScript(session,p.record).completion;
}
function string(expected:string,realm:Realm,session:ScriptSession):void {
 const r=run("out",realm,session);check(r.type==="normal"&&r.value.kind==="string"&&r.value.value===expected,"expected "+expected+" got "+JSON.stringify(r));
}
const cases:{source:string;before:string;after:string}[]=[
  {
    "source": "var i=adapt([Promise.resolve(7)]);out+=i[Symbol.asyncIterator]()===i;i.next().then(r=>out+=':'+r.value+':'+r.done);i.next().then(r=>out+=':'+r.value+':'+r.done)",
    "before": "true",
    "after": "true:7:false:undefined:true"
  },
  {
    "source": "var o={[Symbol.asyncIterator](){out+='a';return this},get next(){out+='n';return 7},get [Symbol.iterator](){throw 9}};var a=adapt(o);out+=a===o",
    "before": "antrue",
    "after": "antrue"
  },
  {
    "source": "var o={[Symbol.asyncIterator]:null,[Symbol.iterator](){out+='s';return {next(){return {value:8,done:false}}}}};adapt(o).next().then(r=>out+=r.value)",
    "before": "s",
    "after": "s8"
  },
  {
    "source": "var o={[Symbol.asyncIterator]:3,get [Symbol.iterator](){out+='bad'}};try{adapt(o)}catch(e){out+=e instanceof TypeError}",
    "before": "true",
    "after": "true"
  },
  {
    "source": "try{adapt({[Symbol.asyncIterator](){return 3}})}catch(e){out+=e instanceof TypeError}",
    "before": "true",
    "after": "true"
  },
  {
    "source": "var s={next(){return {value:4,done:false}}};var i=adapt({[Symbol.iterator](){return s}});s.next=()=>{throw 9};i.next().then(r=>out+=r.value)",
    "before": "",
    "after": "4"
  },
  {
    "source": "var s={next(){out+=arguments.length+':'+arguments[0]+';';return {done:true}}};var i=adapt({[Symbol.iterator](){return s}});i.next();i.next(undefined);i.next(7,8)",
    "before": "0:undefined;1:undefined;1:7;",
    "after": "0:undefined;1:undefined;1:7;"
  },
  {
    "source": "var i=adapt({[Symbol.iterator](){return {next(){throw 7}}}});i.next().catch(e=>out+=e);out+='s'",
    "before": "s",
    "after": "s7"
  },
  {
    "source": "adapt({[Symbol.iterator](){return {next(){return 7}}}}).next().catch(e=>out+=e instanceof TypeError)",
    "before": "",
    "after": "true"
  },
  {
    "source": "var s={next(){return {get done(){out+='d';return false},get value(){out+='v';return {then(r){out+='t';r(7)}}}}}};adapt({[Symbol.iterator](){return s}}).next().then(r=>out+=r.value)",
    "before": "dv",
    "after": "dvt7"
  },
  {
    "source": "var s={next(){return {get done(){throw 7},get value(){out+='bad'}}},return(){out+='bad'}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+=e)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var s={next(){return {get value(){throw 7}}},return(){out+='bad'}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+=e)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var s={next(){return {value:Promise.reject(7)}},return(){out+='c';throw 8}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+=e)",
    "before": "",
    "after": "c7"
  },
  {
    "source": "var s={next(){return {done:true,value:Promise.reject(7)}},return(){out+='bad'}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+=e)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var p=Promise.resolve(7);Object.defineProperty(p,'constructor',{get(){throw 8}});var s={next(){return {value:p}},return(){out+='c';return {}}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+=e)",
    "before": "c",
    "after": "c8"
  },
  {
    "source": "var p=Promise.resolve(7);var i=adapt([]);i.return(p).then(r=>out+=(r.value===p)+':'+r.done)",
    "before": "",
    "after": "true:true"
  },
  {
    "source": "var s={next(){},return(){out+=arguments.length;return {value:Promise.resolve(7),done:false}}};var i=adapt({[Symbol.iterator](){return s}});i.return().then(r=>out+=':'+r.value+':'+r.done)",
    "before": "0",
    "after": "0:7:false"
  },
  {
    "source": "var s={next(){},return(){out+='r';return {value:Promise.reject(7),done:false}}};adapt({[Symbol.iterator](){return s}}).return().catch(e=>out+=e)",
    "before": "r",
    "after": "r7"
  },
  {
    "source": "var s={next(){},return(){out+='c';return {}}};adapt({[Symbol.iterator](){return s}}).throw(7).catch(e=>out+=e instanceof TypeError)",
    "before": "c",
    "after": "ctrue"
  },
  {
    "source": "var s={next(){},return(){throw 8}};adapt({[Symbol.iterator](){return s}}).throw(7).catch(e=>out+=e)",
    "before": "",
    "after": "8"
  },
  {
    "source": "var s={next(){},throw(x){out+=x;return {value:Promise.reject(8),done:false}},return(){out+='c';return {}}};adapt({[Symbol.iterator](){return s}}).throw(7).catch(e=>out+=e)",
    "before": "7",
    "after": "7c8"
  },
  {
    "source": "var p=Promise.resolve(7);p.then=()=>{throw 8};var q=adapt([p]).next();q.then(r=>out+=r.value);Object.defineProperty(Promise,Symbol.species,{get(){throw 9}})",
    "before": "",
    "after": "7"
  },
  {
    "source": "var P=Promise;Promise=function(){throw 9};adapt([7]).next().then(r=>out+=r.value)",
    "before": "",
    "after": "7"
  }
];
for(const test of cases){
 const realm=fresh(),session=createScriptSession();
 check(run("var out='';"+test.source,realm,session).type==="normal","setup "+test.source);
 string(test.before,realm,session);const drained=drainScriptJobs(session);
 check(!drained.fatal&&drained.failures.length===0,"jobs "+test.source);string(test.after,realm,session);
}
{
 const owner=fresh(),caller=fresh(),creator=createScriptSession();
 check(run('var c=Promise.withResolvers();var p=adapt([c.promise]).next();',owner,creator).type==="normal","pending iterator setup");
 for(const name of ['c','p']){const property=owner.globalObject.getOwnProperty(name);if(property===undefined||property.kind!=="data")throw new Error(name);caller.defineScriptGlobal(name,{value:property.value});}
 caller.defineScriptGlobal('ownerPrototype',{value:{kind:"object",object:owner.objectPrototype}});
 const session=createScriptSession();
 check(run('var out="";p.then(r=>out+=r.value+":"+(Object.getPrototypeOf(r)===ownerPrototype));c.resolve(7);',caller,session).type==="normal","foreign resolution");
 const steps=creator.inspect().steps,drained=drainScriptJobs(session);
 check(!drained.fatal&&drained.failures.length===0&&creator.inspect().steps===steps,"current session reactions");
 string('7:true',caller,session);
}
{
 const realm=fresh(),session=createScriptSession({maxSteps:200,maxCalls:16});
 check(run('var out="";var s={next(){return {value:Promise.reject(7)}},return(){while(true){}}};adapt({[Symbol.iterator](){return s}}).next().catch(e=>out+="bad");',realm,session).type==="normal","fatal close setup");
 const drained=drainScriptJobs(session);
 check(drained.fatal&&drained.failures.length===1&&drained.failures[0].completion.origin.kind==="resource-limit","close budget bypasses rejection");
 string('',realm,createScriptSession());
}
console.log("async iterator passed");
