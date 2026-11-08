import {Realm} from "../src/realm.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {normal, sameValue, UNDEFINED, type Value, type ValueCompletion} from "../src/runtime.js";
import {wellKnownToPrimitive} from "../src/symbols.js";

function check(condition: boolean, message: string): void { if (!condition) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(r: Realm, name: string, value: Value): void { r.defineScriptGlobal(name, {value, writable: true, configurable: true}); }
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "own-property", text}, r);
    if (prepared.kind !== "ready") throw new Error("prepare own-property");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "session restored");
    return result;
}
function boolean(result: ValueCompletion, expected: boolean): void {
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value === expected, "own property result");
}

const r = fresh(), object = r.createObject();
const poison: Value = {kind: "object", object: r.createBuiltin("poison", 0,
    (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("own-property check invoked getter"); })};
object.bootstrapDefine("hidden", {value: UNDEFINED});
object.bootstrapDefine("accessor", {get: poison});
object.bootstrapDefine(wellKnownToPrimitive, {value: UNDEFINED});
seed(r, "input", {kind: "object", object});
seed(r, "symbol", {kind: "symbol", value: wellKnownToPrimitive});
for (const method of ["Object.hasOwn(input,", "Object.prototype.hasOwnProperty.call(input,"]) {
    for (const key of ["'hidden'", "'accessor'", "symbol"]) boolean(run(r, method + key + ");"), true);
    for (const key of ["'missing'", "'toString'", "'@@toPrimitive'"]) boolean(run(r, method + key + ");"), false);
}
let conversions = 0;
const key = r.createObject();
key.bootstrapDefine(wellKnownToPrimitive, {value: {kind: "object", object: r.createBuiltin("key", 1,
    (receiver, args, context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === key && context.realm === r &&
            args.length === 1 && sameValue(args[0], {kind: "string", value: "string"}), "key conversion tuple");
        conversions++;
        object.bootstrapDefine("converted", {value: UNDEFINED});
        return normal({kind: "string", value: "converted"});
    })}});
seed(r, "key", {kind: "object", object: key});
boolean(run(r, "Object.hasOwn(input,key);"), true);
boolean(run(r, "input.hasOwnProperty(key);"), true);
check(conversions === 2, "one conversion before lookup per call");
const nullStatic = run(r, "Object.hasOwn(null,key);");
check(nullStatic.type === "throw" && nullStatic.diagnostic.name === "TypeError" && conversions === 2, "static method boxes before key conversion");
const nullMethod = run(r, "Object.prototype.hasOwnProperty.call(null,key);");
check(nullMethod.type === "throw" && nullMethod.diagnostic.name === "TypeError" && conversions === 3, "prototype method converts key before boxing");
for (const expression of ["Object.hasOwn(input,{toString:function(){throw input;}});", "Object.prototype.hasOwnProperty.call(null,{toString:function(){throw input;}});"]) {
    const result = run(r, expression);
    check(result.type === "throw" && result.origin.kind === "guest" && result.value.kind === "object" && result.value.object === object, "exact key-conversion abrupt identity");
}
const other = fresh();
seed(other, "foreign", {kind: "object", object: object});
boolean(run(other, "Object.hasOwn(foreign,'hidden');"), true);
boolean(run(other, "foreign.hasOwnProperty('hidden');"), true);
for (const value of [{kind: "boolean", value: true}, {kind: "number", value: 3}, {kind: "symbol", value: wellKnownToPrimitive}] as Value[]) {
    seed(r, "primitive", value);
    boolean(run(r, "Object.hasOwn(primitive,'valueOf');"), false);
    boolean(run(r, "Object.prototype.hasOwnProperty.call(primitive,'valueOf');"), false);
}
for (const keyText of ["'0'", "'length'"]) {
    boolean(run(r, "Object.hasOwn('x'," + keyText + ");"), true);
    boolean(run(r, "Object.prototype.hasOwnProperty.call('x'," + keyText + ");"), true);
}
let interrupted = false, completed = false;
for (let steps = 0; steps < 40; steps++) {
    const result = run(r, "Object.hasOwn(input,key);", steps);
    if (result.type === "throw") { check(result.origin.kind === "resource-limit", "own-property budget"); interrupted = true; }
    else { boolean(result, true); completed = true; }
}
check(interrupted && completed, "own-property budget boundary");
console.log("Own-property predicates passed");
