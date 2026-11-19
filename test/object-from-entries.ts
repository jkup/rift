import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
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
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "object-from-entries", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string): void {
    const result = run(text);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own " + key);
    }
    return descriptor.value;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") {
        throw new Error("object value");
    }
    return value.object;
}

for (const source of [
    "let o=Object.fromEntries([['a',1],['b',2],['a',3]]);o.a===3&&o.b===2&&Object.keys(o).join(',')==='a,b';",
    "let s=Symbol('s');let o=Object.fromEntries([[s,1],['__proto__',7]]);o[s]===1&&o.__proto__===7&&Object.getPrototypeOf(o)===Object.prototype&&Object.getOwnPropertySymbols(o)[0]===s;",
    "let o=Object.fromEntries([['x',1]]);let d=Object.getOwnPropertyDescriptor(o,'x');d.value===1&&d.writable&&d.enumerable&&d.configurable;",
    "let n=0;Object.defineProperty(Object.prototype,'x',{set:function(v){n++;}});let o=Object.fromEntries([['x',2]]);n===0&&o.x===2;",
    "let p={0:'x',1:3};let o=Object.fromEntries([Object.create(p),{}]);o.x===3&&Object.hasOwn(o,'undefined')&&o.undefined===undefined;",
    "Object.keys(Object.fromEntries('')).length===0&&Object.keys(Object.fromEntries([])).length===0;",
    "let a=[['bad',0]];a[Symbol.iterator]=function(){let n=0;return {next:function(){n++;return {done:n>1,value:['ok',1]};}};};let o=Object.fromEntries(a);o.ok===1&&!Object.hasOwn(o,'bad');",
    "let d=Object.getOwnPropertyDescriptor(Object,'fromEntries');d.writable&&!d.enumerable&&d.configurable&&d.value.length===1&&d.value.name==='fromEntries'&&!Object.hasOwn(d.value,'prototype');",
    "let o=Object.fromEntries.call(null,[['x',1]]);o.x===1;",
    "let caught=false;try{new Object.fromEntries([]);}catch(e){caught=e instanceof TypeError;}caught;",
]) {
    passes(source);
}

passes(
    "let trace='';let key={toString:function(){trace+='k';entry[1]=9;return 'x';}};let entry={};Object.defineProperty(entry,'0',{get:function(){trace+='0';return key;}});Object.defineProperty(entry,'1',{get:function(){trace+='1';return 7;},set:function(v){trace+='s';}});let n=0;let iterator={};Object.defineProperty(iterator,'next',{get:function(){trace+='n';return function(){trace+='N';n++;let r={};Object.defineProperty(r,'done',{get:function(){trace+='d';return n>1;}});Object.defineProperty(r,'value',{get:function(){trace+='v';return entry;}});return r;};}});let input={};Object.defineProperty(input,Symbol.iterator,{get:function(){trace+='i';return function(){trace+='I';return iterator;};}});let o=Object.fromEntries(input);o.x===7&&trace==='iInNdv01ksNd';",
);
passes(
    "let n=0;let i={next:function(){i.next=function(){throw 9;};n++;return {done:n>1,value:['x',4]};}};let a={};a[Symbol.iterator]=function(){return i;};Object.fromEntries(a).x===4&&n===2;",
);
passes(
    "let touched=false;let i={next:function(){let r={done:{}};Object.defineProperty(r,'value',{get:function(){touched=true;throw 1;}});return r;}};let a={};a[Symbol.iterator]=function(){return i;};Object.keys(Object.fromEntries(a)).length===0&&!touched;",
);
passes(
    "let seen='';Object.defineProperty(Number.prototype,Symbol.iterator,{get:function(){'use strict';seen+=typeof this;return function(){'use strict';seen+=':'+typeof this+':'+this;return {next:function(){return {done:true};}};};}});Object.fromEntries(7);seen==='number:number:7';",
);

// Iterator protocol failures do not enter entry-processing cleanup.
for (const setup of [
    "Object.defineProperty(a,Symbol.iterator,{get:function(){throw marker;}});",
    "a[Symbol.iterator]=function(){throw marker;};",
    "a[Symbol.iterator]=function(){return 3;};",
    "Object.defineProperty(i,'next',{get:function(){throw marker;}});",
    "i.next=7;",
    "i.next=function(){throw marker;};",
    "i.next=function(){return 3;};",
    "i.next=function(){let r={};Object.defineProperty(r,'done',{get:function(){throw marker;}});return r;};",
    "i.next=function(){let r={done:false};Object.defineProperty(r,'value',{get:function(){throw marker;}});return r;};",
]) {
    passes(
        "let marker={};let closed=0;let i={};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};" +
            setup +
            "let caught=false;try{Object.fromEntries(a);}catch(e){caught=e===marker||e instanceof TypeError;}caught&&closed===0;",
    );
}

for (const entry of [
    "let entry=3;",
    "let entry={};Object.defineProperty(entry,'0',{get:function(){throw marker;}});",
    "let entry={0:'x'};Object.defineProperty(entry,'1',{get:function(){throw marker;}});",
    "let entry=[{toString:function(){throw marker;}},1];",
]) {
    for (const cleanup of [
        "i['return']=function(){closed++;return {};};",
        "i['return']=function(){closed++;throw other;};",
        "i['return']=function(){closed++;return 3;};",
        "Object.defineProperty(i,'return',{get:function(){closed++;throw other;}});",
        "Object.defineProperty(i,'return',{get:function(){closed++;return 7;}});",
        "Object.defineProperty(i,'return',{get:function(){closed++;return null;}});",
    ]) {
        passes(
            "let marker={};let other={};let closed=0;" +
                entry +
                "let i={next:function(){return {done:false,value:entry};}};" +
                cleanup +
                "let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{Object.fromEntries(a);}catch(e){caught=" +
                (entry === "let entry=3;" ? "e instanceof TypeError" : "e===marker") +
                ";}caught&&closed===1;",
        );
    }
}

for (const input of ["undefined", "null", "1", "true", "Symbol()", "{}", "'x'"]) {
    passes(
        "let caught=false;try{Object.fromEntries(" +
            input +
            ");}catch(e){caught=e instanceof TypeError;}caught;",
    );
}
{
    const owner = fresh(),
        caller = fresh();
    const method = own(object(own(owner.globalObject, "Object")), "fromEntries");
    caller.defineScriptGlobal("foreign", { value: method });
    const result = run("foreign([['x',1]]);", caller);
    check(
        result.type === "normal" && object(result.value).getPrototypeOf() === owner.objectPrototype,
        "result Realm",
    );
    for (const text of ["foreign(null);", "foreign([3]);", "foreign({});"]) {
        const error = run(text, caller);
        check(
            error.type === "throw" &&
                object(error.value).getPrototypeOf() === owner.getErrorPrototype("TypeError"),
            "error Realm",
        );
    }
}
const prefix =
    "let i={next:function(){return {done:false,value:3};}};let a={};a[Symbol.iterator]=function(){return i;};";
{
    const result = run(
        prefix + "i['return']=function(){while(true){}};try{Object.fromEntries(a);}catch(e){true;}",
        fresh(),
        300,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "cleanup resource limit remains fatal",
    );
}
const species =
    "let x=[1];x.constructor={};x.constructor[Symbol.species]=function(){};x.map(function(v){return v;});";
const unsupported = 'new RegExp("a","v");';
for (const body of [species, unsupported]) {
    const result = run(
        prefix + "i['return']=function(){" + body + "};try{Object.fromEntries(a);}catch(e){true;}",
    );
    if (body === species) {
        check(
            result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
            "successful cleanup preserves original entry TypeError",
        );
    } else {
        check(
            result.type === "throw" &&
                result.origin.kind === "unsupported-operation" &&
                result.origin.capabilityCode === "runtime.regexp-pattern",
            "cleanup unsupported operation remains fatal",
        );
    }
}
for (const body of [species, unsupported]) {
    const realm = fresh();
    const result = run(
        "var closed=0;let key={toString:function(){" +
            body +
            "}};let i={next:function(){return {done:false,value:[key,1]};}};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};Object.fromEntries(a);",
        realm,
    );
    check(
        result.type === "throw" &&
            (body === species
                ? result.origin.kind === "resource-limit"
                : result.origin.kind === "unsupported-operation" &&
                  result.origin.capabilityCode === "runtime.regexp-pattern"),
        "infinite supported entries bounded; unsupported key conversion fatal",
    );
    check(
        sameValue(own(realm.globalObject, "closed"), { kind: "number", value: 0 }),
        "no cleanup after engine stop",
    );
}
{
    const result = run(
        "let a={};a[Symbol.iterator]=function(){return {next:function(){return {done:false,value:['x',1]};}};};Object.fromEntries(a);",
        fresh(),
        300,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "infinite iterable bounded",
    );
}
console.log("Object fromEntries passed");
