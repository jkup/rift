import {Realm} from "../src/realm.js";
import {normal, type ValueCompletion} from "../src/runtime.js";
import {wellKnownToPrimitive, wellKnownSpecies} from "../src/symbols.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "numeric-predicates", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare numeric predicate");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "predicate restores session");
    return result;
}
for (const name of ["isNaN", "isFinite"]) {
    const owner = fresh(), caller = fresh(), input = caller.createObject();
    const descriptor = owner.globalObject.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("numeric predicate descriptor");
    check(descriptor.writable && !descriptor.enumerable && descriptor.configurable, "numeric predicate global attributes");
    caller.defineScriptGlobal("method", {value: descriptor.value});
    caller.defineScriptGlobal("symbol", {value: {kind: "symbol", value: wellKnownSpecies}});
    const bad = run(caller, "method(symbol);");
    check(bad.type === "throw" && bad.value.kind === "object" && bad.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "numeric predicate error Realm");
    let calls = 0;
    input.bootstrapDefine(wellKnownToPrimitive, {value: {kind: "object", object: caller.createBuiltin("convert", 1, (receiver, args, context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === input && args[0].kind === "string" && args[0].value === "number" && context.realm === caller, "numeric predicate conversion protocol");
        calls++;
        return normal({kind: "string", value: "4"});
    })}});
    caller.defineScriptGlobal("input", {value: {kind: "object", object: input}});
    const actual = run(caller, "method(input,{valueOf:function(){throw 7;}});");
    check(actual.type === "normal" && actual.value.kind === "boolean" && actual.value.value === (name === "isFinite") && calls === 1, "predicate coerces only first argument once");
    const noncoercing = run(caller, "Number." + name + "(input);");
    check(noncoercing.type === "normal" && noncoercing.value.kind === "boolean" && !noncoercing.value.value && calls === 1, "Number predicates remain non-coercing");
    const thrown = run(fresh(), "let marker={};let input={valueOf:function(){throw marker;}};try{" + name + "(input);}catch(e){e===marker;}");
    check(thrown.type === "normal" && thrown.value.kind === "boolean" && thrown.value.value, "predicate preserves thrown identity");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 45; steps++) {
        const result = run(fresh(), name + "({valueOf:function(){return 4;}});", steps);
        if (result.type === "throw") {
            check(result.origin.kind === "resource-limit", "numeric predicate budget");
            interrupted = true;
        } else {
            check(result.value.kind === "boolean" && result.value.value === (name === "isFinite"), "numeric predicate bounded result");
            completed = true;
        }
    }
    check(interrupted && completed, "numeric predicate budget boundary");
    check(!new Realm((_line: string) => {}).global.bindings.has(name), "legacy numeric globals unchanged");
}
console.log("Global numeric predicates passed");
