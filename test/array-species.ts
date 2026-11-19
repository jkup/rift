import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";

const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "map-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.map(function(x){return x*2}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:3"],"error":"","same":true,"value":{"0":2,"2":6}}\n',
    },
    {
        id: "map-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.map(function(x){return x*2}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:3"],"error":"","same":true,"value":{"0":2,"2":6}}\n',
    },
    {
        id: "map-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.map(function(x){return x*2}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:3"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "filter-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.filter(function(){return true}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":3}}\n',
    },
    {
        id: "filter-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.filter(function(){return true}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":3}}\n',
    },
    {
        id: "filter-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.filter(function(){return true}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "slice-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.slice(0))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:3"],"error":"","same":true,"value":{"0":1,"2":3,"length":3}}\n',
    },
    {
        id: "slice-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.slice(0))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:3","length:3:1||3"],"error":"","same":true,"value":{"0":1,"2":3}}\n',
    },
    {
        id: "slice-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.slice(0))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:3"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "concat-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.concat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"2":3,"length":3}}\n',
    },
    {
        id: "concat-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.concat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:0","length:3:1||3"],"error":"","same":true,"value":{"0":1,"2":3}}\n',
    },
    {
        id: "concat-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.concat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "splice-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.splice(0,2))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:2"],"error":"","same":true,"value":{"0":1,"length":2}}\n',
    },
    {
        id: "splice-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.splice(0,2))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:2","length:2:1||3"],"error":"","same":true,"value":{"0":1}}\n',
    },
    {
        id: "splice-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.splice(0,2))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:2"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "flat-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":3}}\n',
    },
    {
        id: "flat-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":3}}\n',
    },
    {
        id: "flat-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flat())===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "flatMap-plain",
        text: 'var a=[1,,3],log=[],target={};\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flatMap(function(x){return [x,x]}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":1,"2":3,"3":3}}\n',
    },
    {
        id: "flatMap-setter",
        text: 'var a=[1,,3],log=[],target={};\nObject.defineProperty(target,"length",{set:function(n){log.push("length:"+n+":"+a.join("|"))},configurable:true});\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flatMap(function(x){return [x,x]}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected:
            '{"log":["construct:0"],"error":"","same":true,"value":{"0":1,"1":1,"2":3,"3":3}}\n',
    },
    {
        id: "flatMap-nonextensible",
        text: 'var a=[1,,3],log=[],target={};\nObject.preventExtensions(target);\nfunction C(n){if(new.target!==C)throw new Error("new.target");log.push("construct:"+n);return target;}\na.constructor={};a.constructor[Symbol.species]=C;var error="",same=false;try{same=(a.flatMap(function(x){return [x,x]}))===target;}catch(e){error=e instanceof TypeError?"TypeError":"other";}\nconsole.log(JSON.stringify({log:log,error:error,same:same,value:target}));\n',
        expected: '{"log":["construct:0"],"error":"TypeError","same":false,"value":{}}\n',
    },
    {
        id: "getter",
        text: "var d=Object.getOwnPropertyDescriptor(Array,Symbol.species);console.log(d.get.call(7),d.set,d.enumerable,d.configurable,d.get.name,d.get.length);",
        expected: "7 undefined false true get [Symbol.species] 0\n",
    },
    {
        id: "subclass",
        text: "class A extends Array{} var a=new A(1,2),b=a.map(x=>x+1);console.log(b instanceof A,b.length,b[0],b[1]);",
        expected: "true 2 2 3\n",
    },
    {
        id: "null-species",
        text: "var a=[1];a.constructor={[Symbol.species]:null};var b=a.map(x=>x);console.log(Object.getPrototypeOf(b)===Array.prototype,b[0]);",
        expected: "true 1\n",
    },
    {
        id: "undefined-constructor",
        text: "var a=[1];a.constructor=undefined;console.log(a.slice()[0]);",
        expected: "1\n",
    },
    {
        id: "generic-ignore",
        text: 'var a={0:4,length:1};Object.defineProperty(a,"constructor",{get(){throw 7}});console.log(Array.prototype.map.call(a,x=>x+1)[0]);',
        expected: "5\n",
    },
    {
        id: "constructor-getter-throw",
        text: 'var a=[1],n=0;Object.defineProperty(a,"constructor",{get(){throw 7}});try{a.map(x=>{n++;return x})}catch(e){console.log(e,n)}',
        expected: "7 0\n",
    },
    {
        id: "species-getter-throw",
        text: "var a=[1],n=0;a.constructor={get [Symbol.species](){throw 8}};try{a.map(x=>{n++;return x})}catch(e){console.log(e,n)}",
        expected: "8 0\n",
    },
    {
        id: "construct-throw",
        text: "var a=[1],n=0;a.constructor={[Symbol.species]:function(){throw 9}};try{a.map(x=>{n++;return x})}catch(e){console.log(e,n)}",
        expected: "9 0\n",
    },
    {
        id: "invalid-arrow",
        text: "var a=[1];a.constructor={[Symbol.species]:()=>({})};try{a.slice()}catch(e){console.log(e instanceof TypeError)}",
        expected: "true\n",
    },
    {
        id: "invalid-constructor",
        text: "var a=[1];a.constructor=7;try{a.slice()}catch(e){console.log(e instanceof TypeError)}",
        expected: "true\n",
    },
    {
        id: "primitive-return",
        text: "function C(n){this.n=n;return 7}var a=[4];a.constructor={[Symbol.species]:C};var b=a.map(x=>x+1);console.log(b instanceof C,b.n,b[0],b.length);",
        expected: "true 1 5 undefined\n",
    },
    {
        id: "bound-constructor",
        text: "function C(n){this.n=n;this.same=new.target===C}var a=[4];a.constructor={[Symbol.species]:C.bind(null)};var b=a.map(x=>x);console.log(b instanceof C,b.same,b.n,b[0]);",
        expected: "true true 1 4\n",
    },
    {
        id: "protected-index",
        text: 'var t={};Object.defineProperty(t,"0",{value:9});var a=[1,2],n=0;a.constructor={[Symbol.species]:function(){return t}};try{a.map(x=>{n++;return x})}catch(e){console.log(e instanceof TypeError,n,t[0])}',
        expected: "true 1 9\n",
    },
    {
        id: "replace-setter",
        text: 'var t={},n=0;Object.defineProperty(t,"0",{set(v){n++},configurable:true});var a=[4];a.constructor={[Symbol.species]:function(){return t}};var b=a.map(x=>x);var d=Object.getOwnPropertyDescriptor(b,"0");console.log(n,d.value,d.writable,d.enumerable,d.configurable);',
        expected: "0 4 true true true\n",
    },
    {
        id: "splice-protected-length",
        text: 'var t={};Object.defineProperty(t,"length",{value:0});var a=[1,2,3];a.constructor={[Symbol.species]:function(){return t}};try{a.splice(0,1)}catch(e){console.log(e instanceof TypeError,a.join(","),t[0],t.length)}',
        expected: "true 1,2,3 1 0\n",
    },
    {
        id: "filter-protected-length",
        text: 'var t={};Object.defineProperty(t,"length",{value:9});var a=[1,2];a.constructor={[Symbol.species]:function(){return t}};console.log(a.filter(x=>x>1)===t,t[0],t.length);',
        expected: "true 2 9\n",
    },
    {
        id: "alias-filter",
        text: 'var a=[1,2,3];a.constructor={[Symbol.species]:function(){return a}};var b=a.filter(x=>x>1);console.log(b===a,a.join(","),a.length);',
        expected: "true 2,3,3 3\n",
    },
    {
        id: "alias-splice",
        text: "var a=[1,2,3];a.constructor={[Symbol.species]:function(){return a}};var b=a.splice(0,1);console.log(b===a,a.length,0 in a,1 in a);",
        expected: "true 2 false false\n",
    },
    {
        id: "callback-before-species",
        text: 'var a=[1];Object.defineProperty(a,"constructor",{get(){throw 7}});try{a.map(null)}catch(e){console.log(e instanceof TypeError)}',
        expected: "true\n",
    },
    {
        id: "slice-coercion-order",
        text: 'var log=[],a=[1,2];Object.defineProperty(a,"constructor",{get(){log.push("constructor");return {[Symbol.species]:function(n){log.push("construct:"+n);return {}}}}});var b=a.slice({valueOf(){log.push("start");return 0}},{valueOf(){log.push("end");return 1}});console.log(log.join(","),b.length,b[0]);',
        expected: "start,end,constructor,construct:1 1 1\n",
    },
    {
        id: "construct-mutation",
        text: "var a=[1,2];a.constructor={[Symbol.species]:function(n){a[0]=7;return {n:n}}};var b=a.map(x=>x);console.log(b.n,b[0],b[1]);",
        expected: "2 7 2\n",
    },
];
for (const item of cases) {
    let output = "";
    const realm = new Realm((line: string) => {
        output += line + "\n";
    }, "script");
    const prepared = prepareBoundedScript({ id: item.id, text: item.text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + item.id);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("execute " + item.id);
    }
    if (output !== item.expected) {
        throw new Error("output " + item.id + ": " + output);
    }
}
function scriptValue(realm: Realm, text: string): Value {
    const prepared = prepareBoundedScript({ id: "species-realm", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare realm control");
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("execute realm control");
    }
    return result.value;
}
const foreign = new Realm((_line: string) => {}, "script");
const local = new Realm((_line: string) => {}, "script");
if (foreign.arrayConstructor === null) {
    throw new Error("foreign Array missing");
}
local.defineScriptGlobal("foreignArray", {
    value: { kind: "object", object: foreign.arrayConstructor },
});
const subclass = scriptValue(
    foreign,
    "class Foreign extends Array { static get [Symbol.species]() { return this; } } Foreign;",
);
local.defineScriptGlobal("Foreign", { value: subclass });
scriptValue(
    foreign,
    "Object.defineProperty(Array, Symbol.species, {get(){throw 77}, configurable:true});",
);
for (const text of [
    "var a=[1];a.constructor=foreignArray;var b=a.map(x=>x);Object.getPrototypeOf(b)===Array.prototype && b[0]===1;",
    "var a=[2];a.constructor={[Symbol.species]:foreignArray};var b=a.slice();Object.getPrototypeOf(b)===foreignArray.prototype && b[0]===2;",
    "var a=[3];a.constructor=Foreign;var b=a.filter(x=>true);Object.getPrototypeOf(b)===Foreign.prototype && Array.isArray(b) && b[0]===3;",
]) {
    const result = scriptValue(local, text);
    if (result.kind !== "boolean" || !result.value) {
        throw new Error("species Realm selection");
    }
}
console.log("array species passed");
