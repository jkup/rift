import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own " + key);
    }
    return descriptor.value;
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "array-iterator", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
for (const source of [
    "let calls=0;let i=[1,2].values().flatMap((v,k)=>{calls++;return [v,k]});calls===0&&i.toArray().join(',')==='1,0,2,1'&&calls===2;",
    "let nested=[1];[0].values().flatMap(()=>[nested]).next().value===nested&&[0].values().flatMap(()=>new String('ab')).toArray().join(',')==='a,b';",
    "let log='';let inner={next(){return {value:2}},return(){log+='i';throw 1}};let outer={next(){return {value:1}},return(){log+='o';throw 2}};let i=Iterator.prototype.flatMap.call(outer,()=>inner);i.next();let ok=false;try{i.return()}catch(e){ok=e===1}ok&&log==='io'&&i.next().done&&i.return().done&&log==='io';",
    "let log='';let inner={next(){throw 1},return(){log+='i';return {}}};let outer={next(){return {value:1}},return(){log+='o';return {}}};let i=Iterator.prototype.flatMap.call(outer,()=>inner);let ok=false;try{i.next()}catch(e){ok=e===1}ok&&log==='o'&&i.next().done;",
    "let closed=0;let i=Iterator.prototype.flatMap.call({next(){throw 1},return(){closed++;return {}}},()=>{throw 2});i.return().done&&closed===1&&i.next().done;",
    "let closed=0;let i=Iterator.prototype.flatMap.call({next(){return {value:1}},return(){closed++;return {}}},()=> 'ab');let ok=false;try{i.next()}catch(e){ok=e instanceof TypeError}ok&&closed===1&&i.next().done;",
    "[1,2,3,4].values().drop(1.9).take('2.8').toArray().join(',')==='2,3'&&[1,2].values().take(Infinity).toArray().join(',')==='1,2'&&[1,2].values().drop(Infinity).next().done;",
    "let calls=0,closed=0;let i=Iterator.prototype.take.call({next(){calls++;return {value:1}},return(){closed++;return {}}},-0.5);calls===0&&closed===0&&i.next().done&&calls===0&&closed===1&&i.return().done&&closed===1;",
    "let n=0,closed=0;let i=Iterator.prototype.take.call({next(){return {value:++n}},return(){closed++;return {}}},1);i.next().value===1&&closed===0&&i.next().done&&n===1&&closed===1;",
    "let n=0,reads=0;let i=Iterator.prototype.drop.call({next(){n++;return {done:n>3,get value(){reads++;if(n<3)throw 1;return n}}}},2);n===0&&i.next().value===3&&reads===1&&i.next().done&&reads===1;",
    "let log='';let i=Iterator.prototype.drop.call({get next(){log+='n';return ()=>({value:7})}},{valueOf(){log+='v';return -0.5}});log==='vn'&&i.next().value===7;",
    "let log='';let ok=false;try{Iterator.prototype.take.call({get next(){log+='n';throw 1},return(){log+='r';throw 2}},{valueOf(){log+='v';throw 3}})}catch(e){ok=e===3}ok&&log==='vr';",
    "let closed=0,ok=0;let o={next(){throw 1},return(){closed++;return {}}};for(let method of ['take','drop']){for(let n of [NaN,-1,9007199254740992]){try{Iterator.prototype[method].call(o,n)}catch(e){if(e instanceof RangeError)ok++}}}ok===6&&closed===6;",
    "let i=Iterator.prototype.take.call({next(){return {value:1}},return(){return 0}},1);i.next();let ok=false;try{i.next()}catch(e){ok=e instanceof TypeError}ok&&i.next().done&&i.return().done;",
    "let log='';let i=[4,5,6].values().filter(function(v,k){'use strict';log+=k+':'+(this===undefined)+':'+arguments.length+';';return v===5});log===''&&i.next(9).value===5&&log==='0:true:2;1:true:2;'&&i.next().done&&log==='0:true:2;1:true:2;2:true:2;';",
    "let calls=0;let i=[1,2,3].values().map(x=>x*2).filter(x=>{calls++;return x>2}).map(x=>x+1);calls===0&&i.toArray().join(',')==='5,7'&&calls===3;",
    "let i=[1].values().filter(()=>({valueOf(){throw 1}}));i.next().value===1&&i.next().done;",
    "let i,seen=0;i=[1,2].values().filter(x=>{try{i.next()}catch(e){if(e instanceof TypeError)seen++}return true});i.toArray().join(',')==='1,2'&&seen===2;",
    "Object.getPrototypeOf([].values().map(x=>x))===Object.getPrototypeOf([].values().filter(x=>x));",
    "let calls=0;let i=[4,5].values().map(function(v,k){'use strict';calls++;return [v,k,this===undefined,arguments.length].join(':')});calls===0&&i.next(99).value==='4:0:true:2'&&i.next().value==='5:1:true:2'&&i.next().done&&calls===2;",
    "let reads=0,calls=0;let o={get next(){reads++;return function(){calls++;return {value:arguments.length}}}};let i=Iterator.prototype.map.call(o,x=>x);o.next=()=>{throw 1};reads===1&&calls===0&&i.next(9).value===0&&calls===1;",
    "let log='';let o={get next(){log+='n';throw 1},return(){log+='r';throw 2}};let ok=false;try{Iterator.prototype.map.call(o,null)}catch(e){ok=e instanceof TypeError}ok&&log==='r';",
    "let closed=0;let i=Iterator.prototype.map.call({next(){throw 1},return(){closed++;return {}}},x=>x);let ok=false;try{i.next()}catch(e){ok=e===1}ok&&i.next().done&&i.return().done&&closed===0;",
    "let closed=0;let i=Iterator.prototype.map.call({next(){return {value:1}},return(){closed++;throw 2}},()=>{throw 1});let ok=false;try{i.next()}catch(e){ok=e===1}ok&&closed===1&&i.next().done&&i.return().done&&closed===1;",
    "let i,closed=0;let o={next(){return {value:1}},return(){closed++;return {}}};i=Iterator.prototype.map.call(o,()=>i.next());let ok=false;try{i.next()}catch(e){ok=e instanceof TypeError}ok&&closed===1&&i.next().done;",
    "let i,seen=false;let o={next(){throw 1},return(){seen=i.next().done;return {}}};i=Iterator.prototype.map.call(o,x=>x);i.return(99).value===undefined&&seen&&i.next().done;",
    "let i,seen=false;let o={next(){return {value:1}},return(){try{i.next()}catch(e){seen=e instanceof TypeError}return {}}};i=Iterator.prototype.map.call(o,x=>x);i.next();i.return().done&&seen&&i.next().done;",
    "let i=Iterator.prototype.map.call({next(){return {done:true,get value(){throw 1}}},return(){throw 2}},()=>{throw 3});i.next().done&&i.return().done;",
    "let i=[1].values().map(x=>x);let p=Object.getPrototypeOf(i);let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);Object.getPrototypeOf(p)===Iterator.prototype&&Object.getOwnPropertyNames(p).join(',')==='next,return'&&Object.getOwnPropertyNames(i).length===0&&d.value==='Iterator Helper'&&!d.writable&&!d.enumerable&&d.configurable&&i[Symbol.iterator]()===i;",
    "let i=[1].values().map(x=>x);Object.freeze(i);i.next().value===1&&i.next().done;",
    "let d=Object.getOwnPropertyDescriptor(Iterator.prototype,Symbol.dispose);d.writable&&!d.enumerable&&d.configurable&&d.value.name==='[Symbol.dispose]'&&d.value.length===0;",
    "let log='';let i={get return(){log+='g';return function(){log+=this===i?'r':'x';log+=arguments.length;return 1}}};Iterator.prototype[Symbol.dispose].call(i)===undefined&&log==='gr0';",
    "let d=Iterator.prototype[Symbol.dispose];d.call({})===undefined&&d.call({return:null})===undefined&&d.call(1)===undefined;",
    "let marker={};let ok=false;try{Iterator.prototype[Symbol.dispose].call({get return(){throw marker}})}catch(e){ok=e===marker}ok;",
    "let marker={};let ok=false;try{Iterator.prototype[Symbol.dispose].call({return(){throw marker}})}catch(e){ok=e===marker}ok;",
    "let count=0;for(let x of [null,undefined,{return:1}]){try{Iterator.prototype[Symbol.dispose].call(x)}catch(e){if(e instanceof TypeError)count++}}count===3;",
    "let closed=0;function* g(){try{yield 1}finally{closed++}}let i=g();i.next();i[Symbol.dispose]()===undefined&&closed===1&&i.next().done;",
    "let log='';Object.defineProperty(Number.prototype,'return',{get(){'use strict';log+=typeof this;return function(){'use strict';log+=':'+this;return null}}});Iterator.prototype[Symbol.dispose].call(7);log==='number:7';",
    "let d=Iterator.prototype[Symbol.dispose];let ok=false;try{new d()}catch(e){ok=e instanceof TypeError}ok&&d.toString()==='function [Symbol.dispose]() { [native code] }';",
    "[1,null,undefined,'x',2n].values().join()==='1,,,x,2'&&[].values().join()===''&&[1,2].values().join('')==='12'&&[1,2].values().join(null)==='1null2';",
    "let log='';let sep={toString(){log+='s';return '-'}};let i={get next(){log+='n';return ()=>({done:true})}};Iterator.prototype.join.call(i,sep)===''&&log==='sn';",
    "let log='';let marker={};let i={get next(){log+='n';throw 1},return(){log+='r';throw 2}};let ok=false;try{Iterator.prototype.join.call(i,{toString(){log+='s';throw marker}})}catch(e){ok=e===marker}ok&&log==='sr';",
    "let closed=0;let marker={};function* g(){try{yield {toString(){throw marker}}}finally{closed++}}let ok=false;try{g().join()}catch(e){ok=e===marker}ok&&closed===1;",
    "let closed=0;let i={next(){return {value:Symbol()}},return(){closed++;throw 2}};let ok=false;try{Iterator.prototype.join.call(i)}catch(e){ok=e instanceof TypeError}ok&&closed===1;",
    "let closed=0;let i={next(){return {done:true}},return(){closed++;return {}}};Iterator.prototype.join.call(i)===''&&closed===0;",
    "let closed=0;let marker={};let i={next(){return {get value(){throw marker}}},return(){closed++;return {}}};let ok=false;try{Iterator.prototype.join.call(i)}catch(e){ok=e===marker}ok&&closed===0;",
    "let log='';let i={get next(){log+='n';throw 1},return(){log+='r';return {}}};let ok=false;try{Iterator.prototype.join.call(i)}catch(e){ok=e===1}ok&&log==='n';",
    "let log='';let a=[{toString(){log+='a';return 'A'}},{toString(){log+='b';return 'B'}}];a.values().join({toString(){log+='s';return ':'}})==='A:B'&&log==='sab';",
    "let d=Object.getOwnPropertyDescriptor(Iterator.prototype,'join');d.value.length===1&&d.value.name==='join'&&d.writable&&!d.enumerable&&d.configurable;",
    "[1,2,3].values().includes(2)&&![1,2,3].values().includes(2,2)&&[1,2,2].values().includes(2,2)&&![1].values().includes(1,Infinity);",
    "[NaN].values().includes(NaN)&&[-0].values().includes(0)&&[undefined].values().includes()&&![1].values().includes('1');",
    "let o={},s=Symbol();[o].values().includes(o)&&![o].values().includes({})&&[s].values().includes(s)&&![s].values().includes(Symbol());",
    "let closed=0;function* g(){try{yield 1;yield 2}finally{closed++}}g().includes(1)&&closed===1;",
    "let closed=0;let i={next(){return {done:true}},return(){closed++;return {}}};!Iterator.prototype.includes.call(i,1)&&closed===0;",
    "let log='';let marker={};let i={get next(){log+='n';throw marker},return(){log+='r';return {}}};let ok=false;try{Iterator.prototype.includes.call(i,1)}catch(e){ok=e===marker}ok&&log==='n';",
    "let log='';let i={get next(){log+='n';throw 1},return(){log+='r';throw 2}};let ok=false;try{Iterator.prototype.includes.call(i,1,{valueOf(){log+='v';return 0}})}catch(e){ok=e instanceof TypeError}ok&&log==='r';",
    "let marker={},closed=0;let i={next(){return {get value(){throw marker}}},return(){closed++;return {}}};let ok=false;try{Iterator.prototype.includes.call(i,1,2)}catch(e){ok=e===marker}ok&&closed===0;",
    "let marker={};let i={next(){return {value:1}},return(){throw marker}};let ok=false;try{Iterator.prototype.includes.call(i,1)}catch(e){ok=e===marker}ok;",
    "let i={next(){return {value:1}},return(){return 0}};let ok=false;try{Iterator.prototype.includes.call(i,1)}catch(e){ok=e instanceof TypeError}ok;",
    "Iterator.prototype.includes.length===1&&Iterator.prototype.includes.name==='includes'&&[1].values().includes(1,-0);",
    "let d=Object.getOwnPropertyDescriptor(Iterator.prototype,Symbol.toStringTag);d.get.name==='get [Symbol.toStringTag]'&&d.set.name==='set [Symbol.toStringTag]'&&Function.prototype.toString.call(d.get)==='function get [Symbol.toStringTag]() { [native code] }';",
    "class I extends Iterator{};let i=new I; i instanceof Iterator&&Object.getPrototypeOf(Iterator.prototype)===Object.prototype&&i[Symbol.iterator]()===i;",
    "let n=0;try{Iterator()}catch(e){if(e instanceof TypeError)n++}try{new Iterator}catch(e){if(e instanceof TypeError)n++}n===2;",
    "Iterator.from([1,2]).toArray().join(',')==='1,2'&&Iterator.from('ab').toArray().join(',')==='a,b';",
    "let i=[1].values();Iterator.from(i)===i;",
    "let calls=0;let i={next(){calls++;return {value:calls,done:calls>2}}};Iterator.from(i).reduce((a,b)=>a+b,10)===13;",
    "[1,2,3].values().reduce((a,b,i)=>a+b+i)===9&&[].values().reduce(()=>0,undefined)===undefined;",
    "let ok=false;try{[].values().reduce(()=>0)}catch(e){ok=e instanceof TypeError}ok;",
    "let log='';let r=[4,5].values().forEach(function(v,i){'use strict';log+=v+':'+i+':'+(this===undefined)+':'+arguments.length+';'});r===undefined&&log==='4:0:true:2;5:1:true:2;';",
    "[].values().every(()=>false)&&![].values().some(()=>true)&&[].values().find(()=>true)===undefined;",
    "[1,2,3].values().find(x=>x>1)===2&&[1,2].values().every(x=>x>0)&&[1,2].values().some(x=>x===2);",
    "let done=0;function* g(){try{yield 1;yield 2}finally{done++}}let i=g();i.some(x=>true)&&done===1&&i.next().done;",
    "let done=0;function* g(){try{yield 1;yield 2}finally{done++}}g().every(x=>false)===false&&done===1;",
    "let done=0;function* g(){try{yield 8;yield 9}finally{done++}}g().find(x=>true)===8&&done===1;",
    "let log='';let i={get next(){log+='n';throw 1},return(){log+='r';throw 2}};let ok=false;try{Iterator.prototype.some.call(i,null)}catch(e){ok=e instanceof TypeError}ok&&log==='r';",
    "let log='';let marker={};let i={get next(){log+='n';throw marker},return(){log+='r';return {}}};let ok=false;try{Iterator.prototype.some.call(i,()=>true)}catch(e){ok=e===marker}ok&&log==='n';",
    "let log='';let marker={};let i={next(){throw marker},return(){log+='r';return {}}};let ok=false;try{Iterator.prototype.forEach.call(i,()=>{})}catch(e){ok=e===marker}ok&&log==='';",
    "let closed=0;let marker={};let i={next(){return {value:1,done:false}},return(){closed++;throw 2}};let ok=false;try{Iterator.prototype.reduce.call(i,()=>{throw marker},0)}catch(e){ok=e===marker}ok&&closed===1;",
    "let marker={};let i={next(){return {value:1}},return(){throw marker}};let ok=false;try{Iterator.prototype.find.call(i,()=>true)}catch(e){ok=e===marker}ok;",
    "let i={next(){return {value:1}},return(){return 1}};let ok=false;try{Iterator.prototype.some.call(i,()=>true)}catch(e){ok=e instanceof TypeError}ok;",
    "let reads=0;let i={get next(){reads++;return function(){return {done:true}}}};Iterator.prototype.toArray.call(i).length===0&&reads===1;",
    "let obj={next(){return 7},return(){return 8}};let i=Iterator.from(obj);i.next(1)===7&&i.return(2)===8;",
    "let obj={next(){return arguments.length},return(){return arguments.length}};let i=Iterator.from(obj);i.next(1)===0&&i.return(2)===0;",
    "let i=Iterator.from({next(){return {done:true}}});let r=i.return();r.done&&r.value===undefined;",
    "let log='';let obj={get [Symbol.iterator](){log+='i';return undefined},get next(){log+='n';return ()=>({done:true})}};Iterator.from(obj);log==='in';",
    "let log='';let result={get done(){throw 1},get value(){throw 2}};let obj={get [Symbol.iterator](){log+='i'},get next(){log+='n'},get return(){log+='r';return function(){log+='c';return this===obj&&arguments.length===0?result:null}}};let i=Iterator.from(obj);let before=log;i.return(7)===result&&before==='in'&&log==='inrc';",
    "let reads=0;let obj={get return(){reads++;return function(){return reads}}};let i=Iterator.from(obj);reads===0&&i.return()===1&&i.return()===2&&reads===2;",
    "let obj={return(){return 1}};let i=Iterator.from(obj);let first=i.return();obj.return=function(){return 2};first===1&&i.return()===2;",
    "let marker={};let obj={get return(){throw marker}};let i=Iterator.from(obj);let caught=false;try{i.return()}catch(e){caught=e===marker}caught;",
    "let obj={return:7};let i=Iterator.from(obj);let caught=false;try{i.return()}catch(e){caught=e instanceof TypeError}caught;",
    "let i=Iterator.from({return:null});let a=i.return(7),b=i.return();a!==b&&a.done&&b.done&&a.value===undefined&&b.value===undefined;",
    "let reads=0;let obj={get return(){reads++;throw 1}};let method=Iterator.from({}).return;let caught=false;try{method.call(obj)}catch(e){caught=e instanceof TypeError}caught&&reads===0;",
    "let reads=0;let result={get done(){throw 1},get value(){throw 2}};let obj={get next(){reads++;return function(){return this===obj&&arguments.length===0?result:null}}};let i=Iterator.from(obj);Object.defineProperty(obj,'next',{get(){throw 3}});i.next(7)===result&&i.next()===result&&reads===1;",
    "let i=Object.create(Iterator.prototype);i.constructor=7;i[Symbol.toStringTag]='Custom';Object.keys(i).join(',')==='constructor'&&i.constructor===7&&Object.prototype.toString.call(i)==='[object Custom]';",
    "let d=Object.getOwnPropertyDescriptor(Iterator.prototype,'constructor');let n=0;try{d.set.call(Iterator.prototype,1)}catch(e){if(e instanceof TypeError)n++}try{d.set.call(null,1)}catch(e){if(e instanceof TypeError)n++}n===2&&d.get()===Iterator&&!d.enumerable&&d.configurable;",
    "let i=Object.create(Iterator.prototype);Object.preventExtensions(i);let ok=false;try{i.constructor=1}catch(e){ok=e instanceof TypeError}ok;",
    "Iterator.length===0&&Iterator.from.length===1&&Iterator.prototype.reduce.length===1&&Iterator.prototype.toArray.length===0&&Object.prototype.toString.call(Iterator.prototype)==='[object Iterator]';",
    "let i=[7,8].values();let a=i.next();let b=i.next();let c=i.next();a.value===7&&!a.done&&b.value===8&&!b.done&&c.value===undefined&&c.done;",
    "let i=[7,8].keys();i.next().value===0&&i.next().value===1&&i.next().done;",
    "let i=[7,8].entries();let a=i.next();let b=i.next();Array.isArray(a.value)&&a.value.join(',')==='0,7'&&b.value.join(',')==='1,8'&&a.value!==b.value&&i.next().done;",
    "Array.prototype.values===Array.prototype[Symbol.iterator]&&[7][Symbol.iterator]().next().value===7;",
    "let i=[].values();i[Symbol.iterator]()===i&&Object.getOwnPropertyNames(i).length===0&&Object.getOwnPropertySymbols(i).length===0;",
    "let i=[].values();Object.prototype.toString.call(i)==='[object Array Iterator]';",
    "let i=[].values();let a=i.next();let b=i.next();a!==b&&a.done&&b.done&&a.value===undefined&&Object.keys(a).join(',')==='value,done';",
    "let r=[7].values().next();let a=Object.getOwnPropertyDescriptor(r,'value');let b=Object.getOwnPropertyDescriptor(r,'done');a.writable&&a.enumerable&&a.configurable&&b.writable&&b.enumerable&&b.configurable;",
    "let a=[7];let i=a.values();let first=i.next();a.push(8);first.value===7&&i.next().value===8&&i.next().done;",
    "let a=[7,8];let i=a.values();i.next();a.length=0;let end=i.next();a.push(9,10);end.done&&i.next().done;",
    "let a=[];a.length=2;let i=a.values();let x=i.next();let y=i.next();!x.done&&!y.done&&x.value===undefined&&y.value===undefined&&i.next().done;",
    "let a=[];a.length=1;Object.setPrototypeOf(a,{0:7});Array.prototype.values.call(a).next().value===7;",
    "let o={length:2,0:7,1:8};let i=Array.prototype.values.call(o);delete o[0];let a=i.next();o[1]=9;a.value===undefined&&i.next().value===9;",
    "Array.prototype.values.call('ab').next().value==='a'&&Array.prototype.keys.call('ab').next().value===0;",
    "Array.prototype.values.call(7).next().done&&Array.prototype.values.call(Symbol()).next().done;",
    "let calls=0;let o={};Object.defineProperty(o,'length',{get:function(){calls++;return 1;}});let i=Array.prototype.values.call(o);calls===0&&!i.next().done&&calls===1&&i.next().done&&calls===2&&i.next().done&&calls===2;",
    "let count=0;let o={length:1};Object.defineProperty(o,'0',{get:function(){count++;return 7;}});let i=Array.prototype.keys.call(o);i.next().value===0&&i.next().done&&count===0;",
    "let marker={};let o={length:2,1:8};Object.defineProperty(o,'0',{get:function(){throw marker;}});let i=Array.prototype.values.call(o);let caught=false;try{i.next();}catch(e){caught=e===marker;}caught&&i.next().value===8&&i.next().done;",
    "let calls=0;let marker={};let o={0:7};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1)throw marker;return 1;}});let i=Array.prototype.values.call(o);let caught=false;try{i.next();}catch(e){caught=e===marker;}caught&&i.next().value===7;",
    "let calls=0;let o={0:7,length:{valueOf:function(){calls++;return 1.9;}}};let i=Array.prototype.values.call(o);i.next().value===7&&i.next().done&&calls===2;",
    "let calls=0;let inner;let i;let o={0:7,1:8};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1)inner=i.next();return 2;}});i=Array.prototype.values.call(o);let outer=i.next();inner.value===7&&outer.value===7&&i.next().value===8&&i.next().done;",
    "let calls=0;let inner;let i;let o={0:7};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1){inner=i.next();return 1;}return 0;}});i=Array.prototype.values.call(o);let outer=i.next();inner.done&&outer.value===7&&!outer.done&&i.next().done&&calls===2;",
    "let inner;let i;let o={length:2,1:8};Object.defineProperty(o,'0',{get:function(){inner=i.next();return 7;}});i=Array.prototype.values.call(o);let outer=i.next();inner.value===8&&outer.value===7&&i.next().done;",
    "let i=[7].values();let next=i.next;Object.setPrototypeOf(i,null);next.call(i).value===7&&next.call(i).done;",
    "let i=Object.freeze([7].values());i.next().value===7&&i.next().done;",
    "let i=[7].values();let identity=i[Symbol.iterator];identity.call(7)===7&&identity.call(null)===null&&identity.name==='[Symbol.iterator]'&&identity.length===0;",
    "Array.prototype.keys.name==='keys'&&Array.prototype.keys.length===0&&Array.prototype.values.name==='values'&&Array.prototype.values.length===0&&Array.prototype.entries.name==='entries'&&Array.prototype.entries.length===0;",
    "let i=[].values();let p=Object.getPrototypeOf(i);let root=Object.getPrototypeOf(p);Object.getPrototypeOf(root)===Object.prototype&&p.next.name==='next'&&p.next.length===0;",
    "let p=Object.getPrototypeOf([].values());let root=Object.getPrototypeOf(p);let d=Object.getOwnPropertyDescriptor(root,Symbol.iterator);Object.getOwnPropertyNames(p).join(',')==='next'&&Object.getOwnPropertySymbols(p)[0]===Symbol.toStringTag&&Object.getOwnPropertyNames(root).join(',')==='constructor,forEach,some,every,find,reduce,toArray,includes,join,map,filter,flatMap,take,drop'&&Object.getOwnPropertySymbols(root).length===3&&Object.getOwnPropertySymbols(root)[0]===Symbol.toStringTag&&Object.getOwnPropertySymbols(root)[1]===Symbol.iterator&&Object.getOwnPropertySymbols(root)[2]===Symbol.dispose&&d.writable&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator);d.value===Array.prototype.values&&d.writable&&!d.enumerable&&d.configurable;",
    "let p=Object.getPrototypeOf([].values());let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);d.value==='Array Iterator'&&!d.writable&&!d.enumerable&&d.configurable;",
]) {
    const result = run(source);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        source,
    );
}
for (const source of [
    "let i=[].values().map(x=>x);i.next.call({});",
    "let i=[].values().map(x=>x);i.return.call({});",
    "new Iterator.prototype.map(x=>x);",
    "Array.prototype.values.call(null);",
    "Array.prototype.keys.call(undefined);",
    "Array.prototype.entries.call(null);",
    "[].values().next.call({});",
    "[].values().next.call(null);",
    "let i=[].values();i.next.call(Object.create(Object.getPrototypeOf(i)));",
    "new Array.prototype.values();",
    "new Array.prototype.keys();",
    "new Array.prototype.entries();",
    "Array.prototype.values.call({length:Symbol()}).next();",
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
{
    const owner = fresh(),
        caller = fresh();
    seed(caller, "values", own(owner.arrayPrototype, "values"));
    seed(caller, "entries", own(owner.arrayPrototype, "entries"));
    seed(caller, "foreignNext", own(owner.arrayIteratorPrototype, "next"));
    const iterator = run("values.call([7]);", caller);
    check(
        iterator.type === "normal" &&
            iterator.value.kind === "object" &&
            iterator.value.object.getPrototypeOf() === owner.arrayIteratorPrototype,
        "iterator allocation Realm",
    );
    const result = run("foreignNext.call([7].entries());", caller);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === owner.objectPrototype,
        "result allocation Realm",
    );
    if (result.type !== "normal" || result.value.kind !== "object") {
        throw new Error("entry result");
    }
    const pair = own(result.value.object, "value");
    check(
        pair.kind === "object" && pair.object.getPrototypeOf() === owner.arrayPrototype,
        "entry pair Realm",
    );
    for (const source of ["values.call(null);", "foreignNext.call({});"]) {
        const failure = run(source, caller);
        check(
            failure.type === "throw" &&
                failure.value.kind === "object" &&
                failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
            "iterator error Realm",
        );
    }
    check(
        owner.iteratorPrototype !== caller.iteratorPrototype &&
            owner.arrayIteratorPrototype !== caller.arrayIteratorPrototype,
        "fresh iterator prototypes",
    );
    const tag = owner.arrayIteratorPrototype.getOwnProperty(wellKnownToStringTag);
    check(
        tag !== undefined &&
            tag.kind === "data" &&
            sameValue(tag.value, { kind: "string", value: "Array Iterator" }),
        "iterator tag",
    );
}
{
    const result = run(
        "let i=Array.prototype.values.call({length:Infinity});while(true){i.next();}",
        fresh(),
        100,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "large live iterator budget",
    );
}
const legacy = new Realm((_line: string) => {});
{
    const realm = fresh();
    seed(realm, "large", { kind: "string", value: "x".repeat(10000) });
    const result = run(
        "let closed=0;let i={next(){return {value:null}},return(){closed++;return {}}};Iterator.prototype.join.call(i,large)",
        realm,
        1000,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded repeated join separator",
    );
    const closed = run("closed", realm);
    check(
        closed.type === "normal" && closed.value.kind === "number" && closed.value.value === 0,
        "join budget does not resume cleanup",
    );
}
for (const argument of [
    "NaN",
    "1.5",
    "null",
    "'0'",
    "0n",
    "true",
    "Symbol()",
    "-1",
    "-Infinity",
    "9007199254740992",
]) {
    const errorName =
        argument === "-1" || argument === "-Infinity" || argument === "9007199254740992"
            ? "RangeError"
            : "TypeError";
    const result = run(
        "let closed=0;let i={get next(){throw 7},return(){closed++;return {}}};let ok=false;try{Iterator.prototype.includes.call(i,0," +
            argument +
            ")}catch(e){ok=e instanceof " +
            errorName +
            "}ok&&closed===1;",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "includes validates " + argument,
    );
}
{
    const result = run(
        "Iterator.prototype.includes.call({next(){return {value:1}}},2,Infinity)",
        fresh(),
        1000,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded includes with infinite skip",
    );
}
{
    const result = run(
        "Iterator.prototype.toArray.call({next(){return {value:1}}})",
        fresh(),
        1000,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded eager iterator",
    );
}
{
    const owner = fresh(),
        caller = fresh();
    seed(caller, "foreignIterator", own(owner.globalObject, "Iterator"));
    seed(caller, "foreignArrayPrototype", { kind: "object", object: owner.arrayPrototype });
    const result = run(
        "let i=[1,2].values();let w=foreignIterator.from(i);w!==i&&Object.getPrototypeOf(w.toArray())===foreignArrayPrototype;",
        caller,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "foreign iterator wrapping and result Realm",
    );
}
{
    const owner = fresh(),
        caller = fresh();
    const mapped = run(
        "[7].values().map(x=>x).filter(x=>x).flatMap(x=>[x]).drop(0).take(2)",
        owner,
    );
    const invalid = run("Iterator.prototype.map.call({next(){return 0}},x=>x)", owner);
    check(mapped.type === "normal" && invalid.type === "normal", "foreign map creation");
    seed(caller, "mapped", mapped.value);
    seed(caller, "invalid", invalid.value);
    seed(caller, "ownerObjectPrototype", { kind: "object", object: owner.objectPrototype });
    seed(caller, "ownerTypeError", own(owner.globalObject, "TypeError"));
    const result = run(
        "let next=[].values().map(x=>x).next;let a=next.call(mapped),b=next.call(mapped),c=next.call(mapped);let ok=false;try{next.call(invalid)}catch(e){ok=e instanceof ownerTypeError}a.value===7&&Object.getPrototypeOf(a)===ownerObjectPrototype&&b.done&&Object.getPrototypeOf(b)===ownerObjectPrototype&&c.done&&Object.getPrototypeOf(c)===Object.prototype&&ok;",
        caller,
    );
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        "helper closure Realm",
    );
}
{
    const result = run(
        "let closed=false;let i=Iterator.prototype.filter.call({next(){return {value:1}},return(){closed=true;return {}}},()=>false);try{i.next()}catch(e){'caught'}",
        fresh(),
        1000,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded lazy filter",
    );
}
check(
    legacy.arrayPrototype.getOwnProperty("values") === undefined &&
        legacy.arrayPrototype.getOwnProperty(wellKnownIterator) === undefined,
    "legacy iterator absent",
);
console.log("Array iterators passed");
