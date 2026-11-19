import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "number-format", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function formatted(source: string, expected: string): void {
    const result = run(source + ";");
    if (result.type !== "normal" || !sameValue(result.value, { kind: "string", value: expected })) throw new Error(source);
}
const expressions = [
    "(2.5).toFixed()", "(-2.5).toFixed(0)", "(1.25).toFixed(1)", "(1.005).toFixed(2)",
    "(-0).toFixed(2)", "(-0.0001).toFixed(2)", "(1000000000000000100).toFixed(0)", "(1e21).toFixed(2)",
    "(5e-324).toExponential()", "(5e-324).toExponential(2)", "(2.5).toExponential(0)", "(9.99).toExponential(0)",
    "(-0).toExponential(2)", "(12.34).toExponential(undefined)", "(12.34).toExponential(null)",
    "(0.000001234).toPrecision(3)", "(0.0000001234).toPrecision(3)", "(9.99).toPrecision(1)",
    "(1.7976931348623157e308).toPrecision(1)", "(0.1).toPrecision()", "(-0).toPrecision(3)",
    "new Number(2.5).toFixed(0)", "Number.prototype.toFixed(2)", "(1.25).toFixed(1.9)",
    "(NaN).toExponential(101)", "(Infinity).toPrecision(-1)", "(-Infinity).toFixed(0)"
];
const expected = ["3","-3","1.3","1.00","0.00","-0.00","1000000000000000128","1e+21",
    "5e-324","4.94e-324","3e+0","1e+1","0.00e+0","1.234e+1","1e+1","0.00000123","1.23e-7","1e+1",
    "2e+308","0.1","0.00","3","0.00","1.3","NaN","Infinity","-Infinity"];
for (let i = 0; i < expressions.length; i++) formatted(expressions[i], expected[i]);
formatted("(0.1).toFixed(100)", "0.1000000000000000055511151231257827021181583404541015625000000000000000000000000000000000000000000000");
formatted("(0.1).toExponential(100)", "1.0000000000000000555111512312578270211815834045410156250000000000000000000000000000000000000000000000e-1");
for (let digits = 0; digits <= 100; digits++) {
    const zeros = digits === 0 ? "0" : "0." + "0".repeat(digits);
    formatted("(0).toFixed(" + digits + ")", zeros);
    formatted("(0).toExponential(" + digits + ")", zeros + "e+0");
    if (digits > 0) formatted("(0).toPrecision(" + digits + ")", digits === 1 ? "0" : "0." + "0".repeat(digits - 1));
}
for (const name of ["toFixed", "toExponential", "toPrecision"]) {
    for (const count of ["-1", "101", "Infinity", "-Infinity"]) {
        const result = run("(1)." + name + "(" + count + ");");
        if (result.type !== "throw" || result.diagnostic.name !== "RangeError") throw new Error("digit range " + name);
    }
    const owner = fresh(), caller = fresh(), d = owner.numberPrototype.getOwnProperty(name);
    if (d === undefined || d.kind !== "data" || !d.writable || d.enumerable || !d.configurable || d.value.kind !== "object" || d.value.object.constructorSlot !== null) throw new Error("format descriptor");
    caller.defineScriptGlobal("method", { value: d.value });
    caller.defineScriptGlobal("symbol", { value: { kind: "symbol", value: wellKnownToPrimitive } });
    for (const source of ["method.call({},2);", "method.call(NaN,symbol);"]) {
        const result = run(source, caller);
        if (result.type !== "throw" || result.value.kind !== "object" || result.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("format error Realm");
    }
    for (const source of [
        "let touched=false;try{Number.prototype." + name + ".call({},{valueOf:function(){touched=true;return 2;}});}catch(e){e instanceof TypeError&&!touched;}",
        "let marker={};try{(NaN)." + name + "({valueOf:function(){throw marker;}});}catch(e){e===marker;}",
        "let order='';(1)." + name + "({valueOf:function(){order+='V';return {};},toString:function(){order+='S';return '2';}});order==='VS';",
        "Number.prototype." + name + ".length===1&&Number.prototype." + name + ".name==='" + name + "';"
    ]) {
        const result = run(source);
        if (result.type !== "normal" || !sameValue(result.value, { kind: "boolean", value: true })) throw new Error(source);
    }
    let limited = false, completed = false;
    for (let steps = 0; steps < 35; steps++) {
        const result = run("(1)." + name + "(2);", fresh(), steps);
        if (result.type === "throw") {
            if (result.origin.kind !== "resource-limit") throw new Error("format budget");
            limited = true;
        } else completed = true;
    }
    if (!limited || !completed || new Realm((_line: string) => {}).numberPrototype.getOwnProperty(name) !== undefined) throw new Error("format bounds or legacy");
}
for (const source of ["(NaN).toFixed(101);", "(1).toPrecision(0);", "(1).toPrecision(NaN);"]) {
    const result = run(source);
    if (result.type !== "throw" || result.diagnostic.name !== "RangeError") throw new Error(source);
}
console.log("Number formatting passed");
