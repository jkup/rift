import { Realm } from "../src/realm.js";
import {
    getPrototypeFromConstructor,
    type ConstructorPrototype,
} from "../src/constructor-prototype.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { normal, type GuestObject, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "constructor-prototype", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 32 }), prepared.record)
        .completion;
}
function truth(text: string, realm: Realm): void {
    const result = run(text, realm);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const foreign = run("function F(){}F.prototype=0;F", owner);
if (foreign.type !== "normal") {
    throw new Error("foreign constructor setup");
}
caller.defineScriptGlobal("F", { value: foreign.value });
const prototypes: [ConstructorPrototype, GuestObject][] = [
    ["Object", owner.objectPrototype],
    ["Function", owner.functionPrototype],
    ["Array", owner.arrayPrototype],
    ["Boolean", owner.booleanPrototype],
    ["Number", owner.numberPrototype],
    ["String", owner.stringPrototype],
    ["Map", owner.mapPrototype],
    ["Set", owner.setPrototype],
    ["Error", owner.getErrorPrototype("Error")],
    ["TypeError", owner.getErrorPrototype("TypeError")],
    ["ReferenceError", owner.getErrorPrototype("ReferenceError")],
    ["RangeError", owner.getErrorPrototype("RangeError")],
    ["SyntaxError", owner.getErrorPrototype("SyntaxError")],
    ["EvalError", owner.getErrorPrototype("EvalError")],
    ["URIError", owner.getErrorPrototype("URIError")],
];
for (const [intrinsic, expected] of prototypes) {
    const pick = caller.createBuiltin(
        "pick",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            if (args.length === 0 || args[0].kind !== "object") {
                throw new Error("test constructor required");
            }
            const result = getPrototypeFromConstructor(args[0].object, intrinsic, context, loc);
            return result.type === "throw"
                ? result
                : normal({ kind: "object", object: result.value });
        },
    );
    caller.defineScriptGlobal("pick", {
        value: { kind: "object", object: pick },
        writable: true,
        configurable: true,
    });
    caller.defineScriptGlobal("expected", {
        value: { kind: "object", object: expected },
        writable: true,
        configurable: true,
    });
    truth("pick(F)===expected", caller);
    truth("var B=F.bind(null).bind(null);pick(B)===expected", caller);
    truth(
        "var count=0,custom={};Object.defineProperty(B,'prototype',{configurable:true,get(){count++;if(this!==B)throw 1;return custom}});pick(B)===custom&&count===1",
        caller,
    );
    truth(
        "Object.defineProperty(B,'prototype',{configurable:true,get(){count++;return null}});pick(B)===expected&&count===2",
        caller,
    );
    truth(
        "var token={};Object.defineProperty(B,'prototype',{configurable:true,get(){throw token}});var caught=false;try{pick(B)}catch(e){caught=e===token}caught",
        caller,
    );
}
const limited = run("Object.defineProperty(B,'prototype',{get(){while(true){}}});pick(B)", caller);
check(
    limited.type === "throw" && limited.origin.kind === "resource-limit",
    "getter budget is fatal",
);
console.log("Constructor prototype selection passed");
