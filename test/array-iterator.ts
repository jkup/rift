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
    "let p=Object.getPrototypeOf([].values());let root=Object.getPrototypeOf(p);let d=Object.getOwnPropertyDescriptor(root,Symbol.iterator);Object.getOwnPropertyNames(p).join(',')==='next'&&Object.getOwnPropertySymbols(p)[0]===Symbol.toStringTag&&Object.getOwnPropertyNames(root).join(',')==='constructor,forEach,some,every,find,reduce,toArray'&&Object.getOwnPropertySymbols(root).length===2&&Object.getOwnPropertySymbols(root)[0]===Symbol.toStringTag&&Object.getOwnPropertySymbols(root)[1]===Symbol.iterator&&d.writable&&!d.enumerable&&d.configurable;",
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
check(
    legacy.arrayPrototype.getOwnProperty("values") === undefined &&
        legacy.arrayPrototype.getOwnProperty(wellKnownIterator) === undefined,
    "legacy iterator absent",
);
console.log("Array iterators passed");
