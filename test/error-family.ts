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
    const prepared = prepareBoundedScript({ id: "error-family", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string, realm = fresh()): void {
    const result = run(text, realm);
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
function resultObject(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object") {
        throw new Error("object completion");
    }
    return result.value.object;
}

for (const name of [
    "Error",
    "TypeError",
    "ReferenceError",
    "RangeError",
    "SyntaxError",
    "EvalError",
    "URIError",
]) {
    passes(
        "Error.isError(new " +
            name +
            "())&&Error.isError(" +
            name +
            "())&&!Error.isError(" +
            name +
            ".prototype)&&!Error.isError(Object.create(" +
            name +
            ".prototype));",
    );
    passes(
        name +
            ".isError===Error.isError&&Object.hasOwn(" +
            name +
            ",'isError')===" +
            (name === "Error" ? "true" : "false") +
            ";",
    );
}
for (const expression of [
    "undefined",
    "null",
    "true",
    "1",
    "NaN",
    "'Error'",
    "Symbol()",
    "{}",
    "[]",
    "function(){}",
    "new Map()",
    "new Set()",
    "Object(1)",
]) {
    passes("!Error.isError(" + expression + ");");
}
for (const source of [
    "!Error.isError()&&Error.isError.call(null,new Error())&&Error.isError.call({},new Error());",
    "let e=new Error();Object.setPrototypeOf(e,null);Object.freeze(e);Error.isError(e)&&Object.prototype.toString.call(e)==='[object Error]';",
    "let e={name:'Error',message:'x'};e[Symbol.toStringTag]='Error';!Error.isError(e)&&Object.prototype.toString.call(e)==='[object Error]';",
    "let e=new Error();Object.defineProperty(e,'constructor',{get:function(){throw 1;}});Object.defineProperty(e,'name',{get:function(){throw 2;}});e[Symbol.toStringTag]='Plain';Error.isError(e);",
    "let e={};Object.defineProperty(e,'constructor',{get:function(){throw 1;}});Object.defineProperty(e,Symbol.toStringTag,{get:function(){throw 2;}});e[Symbol.toPrimitive]=function(){throw 3;};!Error.isError(e);",
    "Object.defineProperty(Error,Symbol.hasInstance,{value:function(){throw 1;}});Error.isError(new Error())&&!Error.isError({});",
    "let ok=false;try{null.x;}catch(e){ok=Error.isError(e);}ok;",
    "let d=Object.getOwnPropertyDescriptor(Error,'isError');d.value.name==='isError'&&d.value.length===1&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;",
    "let caught=false;try{new Error.isError();}catch(e){caught=e instanceof TypeError;}caught;",
]) {
    passes(source);
}

for (const name of ["EvalError", "URIError"] as const) {
    passes(
        "let marker={};let e=" +
            name +
            "('message',{cause:marker});Error.isError(e)&&e instanceof " +
            name +
            "&&e instanceof Error&&e.name==='" +
            name +
            "'&&e.message==='message'&&e.cause===marker&&e.toString()==='" +
            name +
            ": message'&&Object.getOwnPropertyNames(e).join(',')==='message,cause'&&Object.keys(e).length===0;",
    );
    passes(
        "let e=new " +
            name +
            "();!Object.hasOwn(e,'message')&&e.message===''&&e.toString()==='" +
            name +
            "'&&!Object.hasOwn(e,'cause');",
    );
    passes(
        "let e=new " +
            name +
            "(undefined,{cause:undefined});!Object.hasOwn(e,'message')&&Object.hasOwn(e,'cause')&&e.cause===undefined;",
    );
    passes("let e=new " + name + "(null);e.message==='null';");
    passes(
        "let e=new " +
            name +
            "('x',{cause:7});let m=Object.getOwnPropertyDescriptor(e,'message');let c=Object.getOwnPropertyDescriptor(e,'cause');m.writable&&!m.enumerable&&m.configurable&&c.writable&&!c.enumerable&&c.configurable;",
    );
    passes(
        "let trace='';let message={};message[Symbol.toPrimitive]=function(h){trace+='M'+h;return 'x';};let options={};Object.defineProperty(options,'cause',{get:function(){trace+='C';return 7;}});let e=new " +
            name +
            "(message,options);trace==='MstringC'&&e.message==='x'&&e.cause===7;",
    );
    passes(
        "let touched=0;let o={};Object.defineProperty(o,'cause',{get:function(){touched++;return 1;}});let caught=false;try{new " +
            name +
            "(Symbol(),o);}catch(e){caught=e instanceof TypeError;}caught&&touched===0;",
    );
    passes(
        "let marker={};let o={};Object.defineProperty(o,'cause',{get:function(){throw marker;}});let caught=false;try{new " +
            name +
            "('x',o);}catch(e){caught=e===marker;}caught;",
    );
    passes(
        "let p={cause:7};let e=new " +
            name +
            "('x',Object.create(p));e.cause===7&&Object.hasOwn(e,'cause');",
    );
    passes(
        name +
            ".name==='" +
            name +
            "'&&" +
            name +
            ".length===1&&Object.getPrototypeOf(" +
            name +
            ")===Error&&Object.getPrototypeOf(" +
            name +
            ".prototype)===Error.prototype&&" +
            name +
            ".prototype.constructor===" +
            name +
            ";",
    );
    passes(
        "let d=Object.getOwnPropertyDescriptor(" +
            name +
            ",'prototype');let n=Object.getOwnPropertyDescriptor(" +
            name +
            ".prototype,'name');let m=Object.getOwnPropertyDescriptor(" +
            name +
            ".prototype,'message');!d.writable&&!d.enumerable&&!d.configurable&&n.value==='" +
            name +
            "'&&n.writable&&!n.enumerable&&n.configurable&&m.value===''&&m.writable&&!m.enumerable&&m.configurable;",
    );
    const owner = fresh(),
        caller = fresh();
    caller.defineScriptGlobal("ForeignError", { value: own(owner.globalObject, name) });
    caller.defineScriptGlobal("foreignIsError", {
        value: own(owner.getErrorConstructor("Error"), "isError"),
    });
    const e = resultObject(run("var foreignError=new ForeignError('x');foreignError;", caller));
    check(e.getPrototypeOf() === owner.getErrorPrototype(name), "error allocation Realm");
    passes(
        "Error.isError(foreignError)&&foreignIsError(new Error())&&!foreignIsError(Object.create(Error.prototype));",
        caller,
    );
    const failure = run("new ForeignError(Symbol());", caller);
    check(
        failure.type === "throw" &&
            failure.value.kind === "object" &&
            failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
        "coercion error Realm",
    );
    const bounded = run(
        "let m={toString:function(){while(true){}}};new " + name + "(m);",
        fresh(),
        150,
    );
    check(
        bounded.type === "throw" && bounded.origin.kind === "resource-limit",
        "error coercion budget",
    );
    check(
        new Realm((_line: string) => {}).global.bindings.get(name) === undefined,
        "legacy constructor absent",
    );
}
const bounded = run("while(true){Error.isError({});}", fresh(), 150);
check(
    bounded.type === "throw" && bounded.origin.kind === "resource-limit",
    "predicate call budget",
);
console.log("Error family and brand predicate passed");
