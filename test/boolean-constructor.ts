import {Realm} from "../src/realm.js";
import {GuestBoolean} from "../src/primitive-objects.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {normal, UNDEFINED, type Value, type ValueCompletion} from "../src/runtime.js";
import {wellKnownToPrimitive} from "../src/symbols.js";

function check(condition: boolean, message: string): void { if (!condition) throw new Error(message); }
function realm(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, {value, writable: true, configurable: true});
}
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "Boolean", text}, r);
    if (prepared.kind !== "ready") throw new Error("prepare Boolean");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "session restored");
    return result;
}
function primitive(result: ValueCompletion, expected: boolean): void {
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value === expected, "primitive Boolean result");
}
function boxed(result: ValueCompletion, expected: boolean, owner: Realm): void {
    if (result.type !== "normal" || result.value.kind !== "object") throw new Error("Boolean object result");
    const object = result.value.object;
    check(object instanceof GuestBoolean && object.booleanData === expected, "genuine Boolean slot");
    check(object.getPrototypeOf() === owner.booleanPrototype && object.ownPropertyKeys().length === 0, "prototype and private slot");
}

const r = realm();
const inputs: Value[] = [UNDEFINED, {kind: "null"}, {kind: "boolean", value: false}, {kind: "boolean", value: true},
    {kind: "number", value: 0}, {kind: "number", value: -0}, {kind: "number", value: NaN},
    {kind: "number", value: -1}, {kind: "number", value: Infinity}, {kind: "string", value: ""},
    {kind: "string", value: "false"}, {kind: "symbol", value: wellKnownToPrimitive},
    {kind: "object", object: r.createBooleanObject(false)}, {kind: "object", object: r.createArray()}];
const expected = [false, false, false, true, false, false, false, true, true, false, true, true, true, true];
for (let i = 0; i < inputs.length; i++) {
    seed(r, "input", inputs[i]);
    primitive(run(r, "Boolean(input);"), expected[i]);
    boxed(run(r, "new Boolean(input);"), expected[i], r);
}
primitive(run(r, "Boolean();"), false);
boxed(run(r, "new Boolean();"), false, r);
{
    const object = r.createObject();
    const poison: Value = {kind: "object", object: r.createBuiltin("poison", 0,
        (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("Boolean must not invoke coercion hooks"); })};
    for (const key of ["valueOf", "toString", wellKnownToPrimitive]) object.bootstrapDefine(key, {get: poison});
    seed(r, "input", {kind: "object", object});
    primitive(run(r, "Boolean(input);"), true);
    boxed(run(r, "new Boolean(input);"), true, r);
}
{
    const other = realm(), descriptor = r.globalObject.getOwnProperty("Boolean");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("Boolean constructor");
    seed(other, "ForeignBoolean", descriptor.value);
    primitive(run(other, "ForeignBoolean(0);"), false);
    boxed(run(other, "new ForeignBoolean(0);"), false, r);
    boxed(run(other, "new Boolean(0);"), false, other);
}
{
    let interruptedAfterArgument = false, completed = false;
    for (let steps = 0; steps < 30; steps++) {
        const target = realm();
        let calls = 0;
        seed(target, "mark", {kind: "object", object: target.createBuiltin("mark", 0,
            (_receiver, _args, _context, _loc): ValueCompletion => { calls++; return normal({kind: "number", value: 1}); })});
        const result = run(target, "new Boolean(mark());", steps);
        if (result.type === "throw") {
            check(result.origin.kind === "resource-limit", "construction limit classification");
            if (calls === 1) interruptedAfterArgument = true;
        } else { boxed(result, true, target); completed = true; }
        check(calls <= 1, "argument evaluated once");
    }
    check(interruptedAfterArgument && completed, "allocation budget boundary exercised");
}
console.log("Boolean constructor passed");
