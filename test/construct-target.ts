import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { normal, type OperationContext, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const p = prepareBoundedScript({ id: "construct-target", text }, realm);
    if (p.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: 20000, maxCalls: 32 }), p.record).completion;
}
function truth(text: string, realm = new Realm((_line: string) => {}, "script")): void {
    const r = run(text, realm);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
for (const text of [
    "typeof Reflect==='object'&&Reflect.construct.length===2&&Reflect.construct.name==='construct'&&Object.prototype.toString.call(Reflect)==='[object Reflect]'",
    "function F(a){this.a=a;this.nt=new.target}var x=Reflect.construct(F,[7]);x.a===7&&x.nt===F&&x instanceof F",
    "function F(){this.nt=new.target}function N(){}var x=Reflect.construct(F,[],N);x.nt===N&&x instanceof N&&!(x instanceof F)",
    "function F(){return new.target}function N(){}Reflect.construct(F,[],N)===N",
    "function F(){return 7}function N(){}Reflect.construct(F,[],N) instanceof N",
    "class F{constructor(){this.nt=new.target}}function N(){}var x=Reflect.construct(F,[],N);x.nt===N&&x instanceof N",
    "class F{}function N(){}Reflect.construct(F,[],N) instanceof N",
    "function F(a,b){this.sum=a+b;this.nt=new.target}var B=F.bind(null,3);function N(){}var x=Reflect.construct(B,[4],N);x.sum===7&&x.nt===N&&x instanceof N",
    "function F(){return new.target}var B=F.bind(null).bind(null);Reflect.construct(B,[])===F",
    "function F(){return new.target}var B=F.bind(null),N=F.bind(null);Reflect.construct(B,[],N)===N",
    "function F(){this.nt=new.target}function N(){}N.prototype=0;var x=Reflect.construct(F,[],N);Object.getPrototypeOf(x)===Object.prototype&&x.nt===N",
    "function F(){return ()=>new.target}function N(){}Reflect.construct(F,[],N)()===N",
    "function F(){return eval('new.target')}function N(){}Reflect.construct(F,[],N)===N",
    "function F(){}var trace='';var N=F.bind(null);Object.defineProperty(N,'prototype',{get(){trace+='P';return {}}});var a={get length(){trace+='L';return 2},get 0(){trace+='A';return 1},get 1(){trace+='B';return 2}};Reflect.construct(F,a,N);trace==='LABP'",
    "function F(){this.a=arguments.length;this.b=arguments[1]}var x=Reflect.construct(F,{length:2,0:7});x.a===2&&x.b===undefined",
    "function F(){this.a=arguments.length}Reflect.construct(F,{length:2.9}).a===2&&Reflect.construct(F,{length:-1}).a===0",
    "function F(){}var n=0,a={get length(){n++;return 0}};var caught=0;try{Reflect.construct(()=>{},a)}catch(e){if(e instanceof TypeError)caught++}try{Reflect.construct(F,a,undefined)}catch(e){if(e instanceof TypeError)caught++}n===0&&caught===2",
    "function F(){}var caught=0;for(var a of [undefined,null,7,'abc']){try{Reflect.construct(F,a)}catch(e){if(e instanceof TypeError)caught++}}caught===4",
    "function F(){}var token={},caught=false;try{Reflect.construct(F,{get length(){throw token}})}catch(e){caught=e===token}caught",
    "function F(){}var token={},caught=false,N=F.bind(null);Object.defineProperty(N,'prototype',{get(){throw token}});try{Reflect.construct(F,[],N)}catch(e){caught=e===token}caught",
    "function N(){}var x=Reflect.construct(Array,[1,2],N);Array.isArray(x)&&x.length===2&&x[1]===2&&x instanceof N",
    "function N(){}var x=Reflect.construct(Boolean,[1],N);Boolean.prototype.valueOf.call(x)===true&&x instanceof N",
    "function N(){}var x=Reflect.construct(Number,['7'],N);Number.prototype.valueOf.call(x)===7&&x instanceof N",
    "function N(){}var x=Reflect.construct(String,['ab'],N);String.prototype.valueOf.call(x)==='ab'&&x[1]==='b'&&x.length===2&&x instanceof N",
    "function N(){}var old={x:7},x=Reflect.construct(Object,[old],N);x!==old&&x.x===undefined&&x instanceof N&&Reflect.construct(Object,[old])===old",
    "function N(){}var x=Reflect.construct(Error,['message',{cause:7}],N);x.message==='message'&&x.cause===7&&x instanceof N",
    "function N(){}N.prototype=Map.prototype;var x=Reflect.construct(Map,[[[1,7]]],N);x.get(1)===7&&x.size===1",
    "function N(){}N.prototype=Set.prototype;var x=Reflect.construct(Set,[[1,2]],N);x.has(2)&&x.size===2",
    "function N(){}var f=Reflect.construct(Function,['x','return x+1'],N);f(6)===7&&Object.getPrototypeOf(f)===N.prototype",
    "function N(){}var f=Reflect.construct(Function,['return new.target'],N);f()===undefined&&new f()===f",
    "function F(){}var N=F.bind(null),trace='';Object.defineProperty(N,'prototype',{get(){trace+='P';return {}}});Reflect.construct(Number,[{valueOf(){trace+='V';return 7}}],N);trace==='VP'",
    "function F(){}var N=F.bind(null),trace='';Object.defineProperty(N,'prototype',{get(){trace+='P';return {}}});Reflect.construct(Error,[{toString(){trace+='V';return 'x'}}],N);trace==='PV'",
    "function F(){}var N=F.bind(null),n=0;Object.defineProperty(N,'prototype',{get(){n++;return {}}});var caught=false;try{Reflect.construct(Function,['return 1_;'],N)}catch(e){caught=e instanceof SyntaxError}caught&&n===0",
    "var n=0,caught=false;try{Reflect.construct(Symbol,{get length(){n++;return 0}})}catch(e){caught=e instanceof TypeError}caught&&n===1",
    "var x=Reflect.construct(Array,[],Symbol);Array.isArray(x)&&Object.getPrototypeOf(x)===Symbol.prototype"
]) truth(text);
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
for (const [name, source] of [["N", "function N(){}N.prototype=0;N"], ["foreignPrototype", "Object.prototype"], ["foreignArrayPrototype", "Array.prototype"], ["ForeignError", "TypeError"], ["bad", "function bad(){throw new TypeError('bad')}bad"]]) {
    const value = run(source, owner);
    if (value.type !== "normal") throw new Error("foreign setup");
    caller.defineScriptGlobal(name, { value: value.value });
}
truth("function F(){this.nt=new.target}var x=Reflect.construct(F,[],N);x.nt===N&&Object.getPrototypeOf(x)===foreignPrototype", caller);
truth("var x=Reflect.construct(Array,[],N);Array.isArray(x)&&Object.getPrototypeOf(x)===foreignArrayPrototype", caller);
truth("var B=N.bind(null);function F(){}Object.getPrototypeOf(Reflect.construct(F,[],B))===foreignPrototype", caller);
truth("var caught=false;try{Reflect.construct(bad,[],N)}catch(e){caught=e instanceof ForeignError&&!(e instanceof TypeError)}caught", caller);
const limited = run("function F(){}Reflect.construct(F,{length:Infinity})");
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "array-like argument budget");
const captured: OperationContext[] = [];
const retainedRealm = new Realm((_line: string) => {}, "script");
const capture = retainedRealm.createBuiltin("capture", 0, (_receiver, _args, context, _loc): ValueCompletion => {
    captured.push(context);
    return normal();
});
retainedRealm.defineScriptGlobal("capture", { value: { kind: "object", object: capture } });
const retainedTarget = run("capture();function F(){}F", retainedRealm);
if (retainedTarget.type !== "normal") throw new Error("retained target setup");
const construct = captured[0].construct;
if (construct === undefined) throw new Error("missing construction callback");
let denied = false;
try { construct(retainedTarget.value, [], retainedTarget.value, { line: 1, column: 1 }); }
catch (error) { denied = error instanceof Error && error.message === "inactive Script session"; }
check(denied, "retained construction requires an active Script session");
truth("new F() instanceof F", retainedRealm);
console.log("Distinct constructor targets passed");
