import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { GuestArray } from "../src/array-object.js";
import { GuestStringObject } from "../src/primitive-objects.js";
import { GuestSymbol } from "../src/symbols.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type PropertyKey, type PropertyDescriptorUpdate, type InternalBooleanCompletion } from "../src/runtime.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function n(value: number): Value { return { kind: "number", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }
const loc = { line: 17, column: 3 };
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
const realm = new Realm((_line) => {});
const evaluator = new Evaluator(realm);
const context = evaluator.context;
const seven = n(7), eleven = n(11);
let calls = 0;
let seen: Value = UNDEFINED;
let argumentsSeen: Value[] = [];
const getter = o(realm.createBuiltin("getter", 0, (receiver, args, _context, at) => {
    check(at === loc && args.length === 0, "getter location/args");
    calls++; seen = receiver; argumentsSeen = args; return normal(seven);
}));
const setter = o(realm.createBuiltin("setter", 1, (receiver, args, _context, at) => {
    check(at === loc && args.length === 1 && args[0] === eleven, "setter location/args");
    calls++; seen = receiver; argumentsSeen = args; return normal(o(realm.createObject()));
}));
function boolean(result: InternalBooleanCompletion, expected: boolean): void { check(result.type === "normal" && result.value === expected, "boolean"); }
function data(target: GuestObject, key: PropertyKey, value: Value, w: boolean, e: boolean, c: boolean): void {
    const d = target.getOwnProperty(key);
    check(d !== undefined && d.kind === "data" && sameValue(d.value, value) && d.writable === w && d.enumerable === e && d.configurable === c, "data descriptor");
}
function accessor(target: GuestObject, key: PropertyKey, get: Value, set: Value, e: boolean, c: boolean): void {
    const d = target.getOwnProperty(key);
    check(d !== undefined && d.kind === "accessor" && sameValue(d.get, get) && sameValue(d.set, set) && d.enumerable === e && d.configurable === c, "accessor descriptor");
}
for (const key of ["x", new GuestSymbol(input[0])]) {
    const target = new GuestObject();
    boolean(target.defineOwnProperty(key, {}, context, loc), true);
    data(target, key, UNDEFINED, false, false, false);
    const a = new GuestObject();
    boolean(a.defineOwnProperty(key, { get: UNDEFINED }, context, loc), true);
    accessor(a, key, UNDEFINED, UNDEFINED, false, false);
    const invalid: PropertyDescriptorUpdate[] = [{ value: UNDEFINED, get: UNDEFINED }, { writable: false, set: setter }, { get: n(7) }, { set: { kind: "null" } }, { get: o(new GuestObject()) }];
    for (const update of invalid) {
        const fresh = new GuestObject(); let caught = false;
        try { fresh.defineOwnProperty(key, update, context, loc); } catch { caught = true; }
        check(caught && fresh.ownPropertyKeys().length === 0, "R02 semantic");
        caught = false; try { fresh.bootstrapDefine(key, update); } catch { caught = true; }
        check(caught && fresh.ownPropertyKeys().length === 0, "R02 bootstrap");
    }
    const flex = new GuestObject();
    flex.bootstrapDefine(key, { value: seven, writable: true, enumerable: true, configurable: true });
    boolean(flex.defineOwnProperty(key, { get: getter }, context, loc), true);
    accessor(flex, key, getter, UNDEFINED, true, true);
    boolean(flex.defineOwnProperty(key, { value: eleven }, context, loc), true);
    data(flex, key, eleven, false, true, true);
    boolean(flex.defineOwnProperty(key, { enumerable: false }, context, loc), true);
    data(flex, key, eleven, false, false, true);
    const parent = new GuestObject(); parent.bootstrapDefine(key, { get: getter, set: setter, configurable: true });
    const child = new GuestObject(parent);
    for (const receiver of [o(child), n(3), { kind: "null" } as Value, UNDEFINED, o(new GuestObject())]) {
        const before = calls;
        const read = child.internalGet(key, receiver, context, loc);
        check(read.type === "normal" && read.value === seven && seen === receiver && calls === before + 1 && argumentsSeen.length === 0, "R11 receiver");
        boolean(child.internalSet(key, eleven, receiver, context, loc), true);
        check(seen === receiver && calls === before + 2 && argumentsSeen[0] === eleven && child.getOwnProperty(key) === undefined, "R12 receiver");
    }
    const abrupt = failure("TypeError", "sentinel", loc);
    const throwing = o(realm.createBuiltin("throwing", 0, (_r, _a, _c, _l) => abrupt));
    parent.bootstrapDefine(key, { get: throwing, set: throwing });
    check(child.internalGet(key, o(child), context, loc) === abrupt, "R15 get identity");
    check(child.internalSet(key, eleven, o(child), context, loc) === abrupt, "R15 set identity");
    let caught = false; try { child.get(key, context, loc); } catch { caught = true; }
    check(caught, "R33 host inspection");
}
const array = new GuestArray();
array.bootstrapDefine("2", { get: getter, configurable: true });
data(array, "length", n(3), true, false, false);
const before = calls;
boolean(array.defineOwnProperty("length", { get: getter }, context, loc), false);
boolean(array.defineOwnProperty("length", { value: n(0) }, context, loc), true);
check(calls === before && array.getOwnProperty("2") === undefined, "R17 deletion no calls");
const string = new GuestStringObject("ab");
boolean(string.defineOwnProperty("0", { get: getter }, context, loc), false);
boolean(string.defineOwnProperty("0", { value: { kind: "string", value: "a" } }, context, loc), true);
check(evaluator.steps === 0 && evaluator.calls === 0, "zero wrapper ticks and call restoration");
console.log("accessor preliminary controls " + input[0]);
