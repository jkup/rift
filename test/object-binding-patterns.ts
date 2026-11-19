import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "array-pattern", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "const {a,b}={a:1,b:2};a===1&&b===2",
    "let {a:x,b:y=7}={a:1};x===1&&y===7",
    "var {a,b=a+1}={a:3};a===3&&b===4",
    "const {a=7,b=8}={a:null};a===null&&b===8",
    "let {a:{b},c:[d,...e]}={a:{b:1},c:[2,3,4]};b===1&&d===2&&e.join(',')==='3,4'",
    "let [{a=3},...[{b}]]=[{}, {b:7}];a===3&&b===7",
    "const {a:{b}={b:7}}={};b===7",
    "let {a=()=>7,b:alias=function(){return 8}}={};a.name==='a'&&alias.name==='alias'",
    "const {0:a,'x-y':b,default:c}={0:1,'x-y':2,default:3};a===1&&b===2&&c===3",
    "const key='a';let {[key]:x}={a:7};x===7",
    "const {length:n,0:first}='abc';n===3&&first==='a'",
    "const {}=1;const {}=true;const {}='x';true",
    "var ok=false;try{let {}=null}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{let {a=b,b=1}={}}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{let {[a]:a}={}}catch(e){ok=e instanceof ReferenceError}ok",
    "var {a=b,b=1}={};a===undefined&&b===1",
    "var {a:x,b:x}={a:1,b:2};x===2",
    "var proto={a:7};var input=Object.create(proto);input.b=8;const {a,...rest}=input;a===7&&rest.b===8&&!Object.hasOwn(rest,'a')",
    "const {a,...rest}={a:1,b:2};rest.b===2&&!Object.hasOwn(rest,'a')&&Object.getPrototypeOf(rest)===Object.prototype",
    "var s=Symbol('s');var t=Symbol('t');var input={a:1};input[s]=2;input[t]=3;const {[s]:x,...rest}=input;x===2&&rest.a===1&&rest[t]===3&&!Object.hasOwn(rest,s)",
    "var input={a:1,b:2};Object.defineProperty(input,'hidden',{value:3});const {...rest}=input;Object.keys(rest).join(',')==='a,b'",
    "const {0:first,...rest}='abc';first==='a'&&rest[1]==='b'&&rest[2]==='c'&&!Object.hasOwn(rest,'length')",
    "var input={};Object.defineProperty(input,'__proto__',{value:7,enumerable:true});const {__proto__:x}=input;const {...rest}=input;x===7&&Object.hasOwn(rest,'__proto__')&&rest.__proto__===7&&Object.getPrototypeOf(rest)===Object.prototype",
    "var hits=0;Object.defineProperty(Object.prototype,'x',{set:function(v){hits++},configurable:true});const {...rest}={x:7};hits===0&&Object.hasOwn(rest,'x')&&rest.x===7",
    "var log='';var input={get a(){log+='a';return undefined},get b(){log+='b';return 8}};var key={toString(){log+='k';return 'a'}};function init(){log+='d';return 7}const {[key]:x=init(),...rest}=input;x===7&&rest.b===8&&log==='kadb'",
    "var input={get a(){delete input.b;input.c=3;return 1},b:2};const {...rest}=input;rest.a===1&&!Object.hasOwn(rest,'b')&&!Object.hasOwn(rest,'c')",
    "var input={get a(){input.c=3;return 1},b:2};const {a,...rest}=input;rest.b===2&&rest.c===3&&!Object.hasOwn(rest,'a')",
    "var input={get a(){Object.defineProperty(input,'b',{enumerable:false});return 1},b:2};const {...rest}=input;rest.a===1&&!Object.hasOwn(rest,'b')",
    "var hits=0;var input={get a(){hits++;return 7}};const {a:x,a:y,...rest}=input;x===7&&y===7&&hits===2&&Object.keys(rest).length===0",
    "function f(){let {[(()=>arguments[0])()]:x=()=>arguments[1]}={};return x()}f('a',7)===7",
    "function f(){let {a=()=>b,b=7}={};return a}f()()===7",
    "var ok=false;var input={get a(){throw 7}};try{let {a}=input}catch(e){ok=e===7}ok",
    "var closed=0;var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:null}},return(){closed++;return {}}}};var ok=false;try{const [{}]=xs}catch(e){ok=e instanceof TypeError}ok&&closed===1",
    "Object.defineProperty(Number.prototype,'x',{get:function(){'use strict';return typeof this}});const {x}=1;x==='number'",
]) {
    expect(text);
}
for (const text of [
    "let {a,a}={};",
    "const {a:x,b:x}={};",
    "const {a};",
    "var {a};",
    "let {...rest,}={};",
    "let {...rest,a}={};",
    "let {...rest=1}={};",
    "let {...[a]}={};",
    "let {...{a}}={};",
    "let {a:o.x}={};",
    "let {a:(x)}={};",
    "let {'a'}={};",
    "let {1}={};",
    "let {a(){}}={};",
    "let {get a(){}}={};",
    "let {[a,b]:x}={};",
    "'use strict';let {eval}={};",
    "if(true)let {a}={};",
    "while(false)const {a}={};",
    "({a=1});",
]) {
    const prepared = prepareBoundedScript(
        { id: "invalid-object-binding", text },
        new Realm((_line: string) => {}, "script"),
    );
    check(prepared.kind !== "ready", "must reject: " + text);
}
check(parse("let {a}={a:1};").error !== null, "legacy parser boundary");
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const foreign = run("function f(input){const {...rest}=input;return rest}f", 100000, owner);
if (foreign.type !== "normal") {
    throw new Error("foreign setup");
}
caller.defineScriptGlobal("foreign", { value: foreign.value });
const rest = run("foreign({a:1})", 100000, caller);
check(
    rest.type === "normal" &&
        rest.value.kind === "object" &&
        rest.value.object.getPrototypeOf() === owner.objectPrototype,
    "rest defining Realm",
);
const error = run("foreign(null)", 100000, caller);
check(
    error.type === "throw" &&
        error.value.kind === "object" &&
        error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
    "error defining Realm",
);
const limitedRealm = new Realm((_line: string) => {}, "script");
run("var input={};for(var i=0;i<100;i++){input[i]=i}var caught=false;", 100000, limitedRealm);
const limited = run("try{const {...rest}=input}catch(e){caught=true}", 100, limitedRealm);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "rest copy budget");
const caught = run("caught", 100000, limitedRealm);
check(
    caught.type === "normal" && caught.value.kind === "boolean" && !caught.value.value,
    "resource stop cannot enter catch",
);
const interrupted = new Realm((_line: string) => {}, "script");
const failed = run("var input={a:1,get b(){throw 7}};let {a,...rest}=input;", 100000, interrupted);
check(
    failed.type === "throw" && failed.value.kind === "number" && failed.value.value === 7,
    "rest getter throw",
);
const first = run("a", 100000, interrupted),
    pending = run("rest", 100000, interrupted);
check(
    first.type === "normal" && first.value.kind === "number" && first.value.value === 1,
    "earlier binding remains initialized",
);
check(
    pending.type === "throw" && pending.diagnostic.name === "ReferenceError",
    "rest remains in TDZ after failed copy",
);
expect(
    "var called=false;function key(){called=true;return 'a'}var ok=false;try{let {[key()]:x}=null}catch(e){ok=e instanceof TypeError}ok&&!called",
);
expect(
    "const {...rest}={get a(){return 7}};const d=Object.getOwnPropertyDescriptor(rest,'a');d.value===7&&d.writable&&d.enumerable&&d.configurable&&d.get===undefined",
);
console.log("Object binding patterns passed");
