import {Realm} from "../src/realm.js";
import {normal, sameValue, type GuestObject, type Value, type ValueCompletion} from "../src/runtime.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {wellKnownToPrimitive, wellKnownToStringTag, wellKnownSpecies} from "../src/symbols.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return {kind: "object", object}; }
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own math data property");
    return descriptor.value;
}
function math(realm: Realm): GuestObject {
    const value = own(realm.globalObject, "Math");
    if (value.kind !== "object") throw new Error("Math object");
    return value.object;
}
function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "math", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare Math");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "Math restores session");
    return completion;
}
const methods = ["abs", "ceil", "floor", "round", "sign", "trunc"];
const inputs = [-Infinity, -2.7, -1.5, -0.5, -0.1, -0, 0, 0.49999999999999994, 0.5, 2.7, Infinity, NaN];
const expected = [
    [Infinity, 2.7, 1.5, 0.5, 0.1, 0, 0, 0.49999999999999994, 0.5, 2.7, Infinity, NaN],
    [-Infinity, -2, -1, -0, -0, -0, 0, 1, 1, 3, Infinity, NaN],
    [-Infinity, -3, -2, -1, -1, -0, 0, 0, 0, 2, Infinity, NaN],
    [-Infinity, -3, -1, -0, -0, -0, 0, 0, 1, 3, Infinity, NaN],
    [-1, -1, -1, -1, -1, -0, 0, 1, 1, 1, 1, NaN],
    [-Infinity, -2, -1, -0, -0, -0, 0, 0, 0, 2, Infinity, NaN],
];
for (let m = 0; m < methods.length; m++) {
    const realm = fresh();
    for (let i = 0; i < inputs.length; i++) {
        realm.defineScriptGlobal("input", {value: {kind: "number", value: inputs[i]}, configurable: true});
        const actual = run(realm, "Math." + methods[m] + "(input);");
        check(actual.type === "normal" && sameValue(actual.value, {kind: "number", value: expected[m][i]}), "Math numeric edges " + methods[m]);
    }
}
{
    const owner = fresh(), caller = fresh(), left = math(owner), right = math(caller);
    check(left !== right && left.getPrototypeOf() === owner.objectPrototype && left.callable === null && left.constructorSlot === null, "Math Realm and nonconstructibility");
    const constants = ["E", "LN10", "LN2", "LOG10E", "LOG2E", "PI", "SQRT1_2", "SQRT2"];
    const values = [2.718281828459045, 2.302585092994046, 0.6931471805599453, 0.4342944819032518, 1.4426950408889634, 3.141592653589793, 0.7071067811865476, 1.4142135623730951];
    for (let i = 0; i < constants.length; i++) {
        const name = constants[i];
        const d = left.getOwnProperty(name);
        check(d !== undefined && d.kind === "data" && d.value.kind === "number" && d.value.value === values[i] && !d.writable && !d.enumerable && !d.configurable, "Math constant value and descriptor");
    }
    const tag = left.getOwnProperty(wellKnownToStringTag);
    check(tag !== undefined && tag.kind === "data" && tag.value.kind === "string" && tag.value.value === "Math" && !tag.writable && !tag.enumerable && tag.configurable, "Math tag");
    for (const name of methods) {
        const value = own(left, name), other = own(right, name);
        check(value.kind === "object" && other.kind === "object" && value.object !== other.object, "fresh Math methods");
        caller.defineScriptGlobal("method", {value, configurable: true});
        caller.defineScriptGlobal("symbol", {value: {kind: "symbol", value: wellKnownSpecies}, configurable: true});
        const bad = run(caller, "method(symbol);");
        check(bad.type === "throw" && bad.value.kind === "object" && bad.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "Math error Realm");
    }
}
for (const name of methods) {
    const realm = fresh(), input = realm.createObject();
    let calls = 0;
    input.bootstrapDefine(wellKnownToPrimitive, {value: obj(realm.createBuiltin("convert", 1, (receiver, args, context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === input && context.realm === realm && args[0].kind === "string" && args[0].value === "number", "Math numeric conversion");
        calls++; return normal({kind: "number", value: 2});
    }))});
    realm.defineScriptGlobal("input", {value: obj(input)});
    const actual = run(realm, "Math." + name + "(input,{valueOf:function(){throw 7;}});");
    check(actual.type === "normal" && calls === 1, "Math coerces first argument once");
    const absent = run(realm, "Math." + name + "();");
    check(absent.type === "normal" && sameValue(absent.value, {kind: "number", value: NaN}), "missing Math argument");
    const thrown = run(fresh(), "let marker={};let input={valueOf:function(){throw marker;}};try{Math." + name + "(input);}catch(e){e===marker;}");
    check(thrown.type === "normal" && thrown.value.kind === "boolean" && thrown.value.value, "Math exact conversion throw");
}
{
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 35; steps++) {
        const actual = run(fresh(), "Math.round({valueOf:function(){return -1.5;}});", steps);
        if (actual.type === "throw") { check(actual.origin.kind === "resource-limit", "Math budget"); interrupted = true; }
        else { check(actual.value.kind === "number" && actual.value.value === -1, "Math budget result"); completed = true; }
    }
    check(interrupted && completed, "Math budget boundary");
    check(new Realm((_line: string) => {}).global.bindings.has("Math") === false, "legacy globals unchanged");
}
for (const name of ["min", "max"]) {
    const minimum = name === "min";
    const expressions = ["", "0", "-0", "0,-0", "-0,0", "3,-2,7", "Infinity,-Infinity", "NaN,3", "3,NaN", "undefined", "null,true,'-4'"];
    const results = minimum
        ? [Infinity, 0, -0, -0, -0, -2, -Infinity, NaN, NaN, NaN, -4]
        : [-Infinity, 0, -0, 0, 0, 7, Infinity, NaN, NaN, NaN, 1];
    for (let i = 0; i < expressions.length; i++) {
        const actual = run(fresh(), "Math." + name + "(" + expressions[i] + ");");
        check(actual.type === "normal" && sameValue(actual.value, {kind: "number", value: results[i]}), "Math extrema edges " + name);
    }
    const owner = fresh(), caller = fresh(), method = own(math(owner), name);
    caller.defineScriptGlobal("method", {value: method});
    caller.defineScriptGlobal("symbol", {value: {kind: "symbol", value: wellKnownSpecies}});
    const bad = run(caller, "method(NaN,symbol);");
    check(bad.type === "throw" && bad.value.kind === "object" && bad.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "extrema convert after NaN in owner Realm");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 45; steps++) {
        const actual = run(fresh(), "Math." + name + "(3,1,2);", steps);
        if (actual.type === "throw") {
            check(actual.origin.kind === "resource-limit", "extrema budget");
            interrupted = true;
        } else {
            check(sameValue(actual.value, {kind: "number", value: minimum ? 1 : 3}), "extrema budget result");
            completed = true;
        }
    }
    check(interrupted && completed, "extrema budget boundary");
}
console.log("Math unary passed");
