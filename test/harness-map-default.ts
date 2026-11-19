import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { GuestArray } from "../src/array-object.js";
import {
    GuestObject,
    GuestError,
    UNDEFINED,
    normal,
    failure,
    resourceFailure,
    unsupportedFailure,
    sameValue,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
    type PropertyKey,
    type PropertyDescriptorUpdate,
    type InternalBooleanCompletion,
    type Builtin,
} from "../src/runtime.js";
import { wellKnownSpecies, GuestSymbol } from "../src/symbols.js";
import { mapObject } from "../src/array-map.js";
import { prepareBoundedScript, type ExecutableScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function num(value: number): Value {
    return { kind: "number", value };
}
const loc: Location = { line: 1, column: 1 };
function data(o: GuestObject, k: PropertyKey, v: Value): void {
    o.bootstrapDefine(k, { value: v, writable: true, configurable: true });
}
function define(r: Realm, k: string, v: Value): void {
    r.defineScriptGlobal(k, { value: v, writable: true, configurable: true });
}
function prepare(text: string, r: Realm, id: string): ExecutableScript {
    const p = prepareBoundedScript({ id, text }, r);
    if (p.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return p.record;
}
function idle(s: ScriptSession): void {
    const v = s.inspect();
    check(v.active === null && v.calls === 0 && v.depth === 0, "idle");
}
function run(text: string, r: Realm, s: ScriptSession, id: string): ValueCompletion {
    const v = evaluateScript(s, prepare(text, r, id));
    idle(s);
    return v.completion;
}
function own(o: GuestObject, k: string): Value {
    const d = o.getOwnProperty(k);
    if (d === undefined || d.kind !== "data") {
        throw new Error("own " + k);
    }
    return d.value;
}
const input = readFileSync(process.argv[2], "utf8");
check(input === "probe(7);\n" || input === "probe(11);\n", "runtime input");
const payload = input === "probe(7);\n" ? 7 : 11,
    inputId = payload === 7 ? "input-a" : "input-b";
class Effects {
    text = "";
    arrays = 0;
    callbacks = 0;
    enabled = false;
    stopAt = "";
    abrupt: ValueCompletion = normal();
    host: Error | null = null;
    interrupt(hook: string): ValueCompletion | null {
        if (this.stopAt !== hook) {
            return null;
        }
        if (this.host !== null) {
            throw this.host;
        }
        return this.abrupt;
    }
}
class ResultArray extends GuestArray {
    constructor(
        proto: GuestObject,
        readonly effects: Effects,
        readonly lower: boolean,
    ) {
        super(proto);
    }
    defineOwnProperty(
        k: PropertyKey,
        d: PropertyDescriptorUpdate,
        c: OperationContext,
        l: Location,
    ): InternalBooleanCompletion {
        if (k !== "length") {
            this.effects.text += this.lower ? "d" : "D";
        }
        return super.defineOwnProperty(k, d, c, l);
    }
}
class CountRealm extends Realm {
    constructor(
        readonly effects: Effects,
        readonly lower: boolean,
    ) {
        super((_line: string) => {
            throw new Error("output");
        }, "script");
    }
    createArray(): GuestArray {
        if (!this.effects.enabled) {
            return super.createArray();
        }
        this.effects.arrays++;
        this.effects.text += this.lower ? "a" : "A";
        return new ResultArray(this.arrayPrototype, this.effects, this.lower);
    }
}
class ReadArray extends GuestArray {
    size = -1;
    constructor(
        proto: GuestObject,
        readonly effects: Effects,
        readonly lower: boolean,
    ) {
        super(proto);
    }
    internalGet(k: PropertyKey, r: Value, c: OperationContext, l: Location): ValueCompletion {
        if (k === "length") {
            this.effects.text += this.lower ? "l" : "L";
            if (this.size >= 0) {
                return normal(num(this.size));
            }
        } else if (k === "constructor") {
            this.effects.text += this.lower ? "k" : "K";
        } else if (k === "0") {
            this.effects.text += this.lower ? "e" : "E";
            const abrupt = this.effects.interrupt(this.lower ? "e" : "E");
            if (abrupt !== null) {
                return abrupt;
            }
        }
        check(r.kind === "object" && r.object === this, "array Get receiver");
        return super.internalGet(k, r, c, l);
    }
    internalHasProperty(k: PropertyKey, l: Location): InternalBooleanCompletion {
        this.effects.text += this.lower ? "h" : "H";
        return super.internalHasProperty(k, l);
    }
}
class Holder extends GuestObject {
    constructor(
        proto: GuestObject,
        readonly effects: Effects,
    ) {
        super(proto);
    }
    internalGet(k: PropertyKey, r: Value, c: OperationContext, l: Location): ValueCompletion {
        check(
            k === wellKnownSpecies && r.kind === "object" && r.object === this,
            "canonical species and receiver",
        );
        this.effects.text += "S";
        return super.internalGet(k, r, c, l);
    }
}
class Ordinary extends GuestObject {
    constructor(
        proto: GuestObject,
        readonly effects: Effects,
    ) {
        super(proto);
    }
    internalGet(k: PropertyKey, r: Value, c: OperationContext, l: Location): ValueCompletion {
        check(k !== "constructor" && k !== wellKnownSpecies, "ordinary skips selection");
        this.effects.text += k === "length" ? "L" : "E";
        if (k === "0") {
            const abrupt = this.effects.interrupt("E");
            if (abrupt !== null) {
                return abrupt;
            }
        }
        return super.internalGet(k, r, c, l);
    }
    internalHasProperty(k: PropertyKey, l: Location): InternalBooleanCompletion {
        this.effects.text += "H";
        return super.internalHasProperty(k, l);
    }
}
type Trace = { id: string; columns: number[]; effects: string[]; terminal: string; calls: number };
// Literal accepted MP schedules, frozen before production changes.
const traces: Trace[] = [
    { id: "T01", columns: [1, 1, 7], effects: ["", "", "LKSA"], terminal: "empty", calls: 1 },
    {
        id: "T02",
        columns: [1, 1, 7, 1],
        effects: ["", "", "LKSA", "HECD"],
        terminal: "value",
        calls: 2,
    },
    {
        id: "T03",
        columns: [1, 1, 7, 1],
        effects: ["", "", "LKGSQA", "HECD"],
        terminal: "value",
        calls: 2,
    },
    { id: "T04", columns: [1, 1, 7], effects: ["", "", "L"], terminal: "callback", calls: 1 },
    { id: "T05", columns: [1, 1, 7], effects: ["", "", "LK"], terminal: "invalid", calls: 1 },
    { id: "T06", columns: [1, 1, 7], effects: ["", "", "LKS"], terminal: "invalid", calls: 1 },
    {
        id: "T07",
        columns: [1, 1, 7, 1, 1],
        effects: ["", "", "LKS", "", "HEC"],
        terminal: "custom",
        calls: 2,
    },
    { id: "T08", columns: [1, 1, 7], effects: ["", "", "LKG"], terminal: "abrupt", calls: 2 },
    { id: "T09", columns: [1, 1, 7], effects: ["", "", "LKSQ"], terminal: "abrupt", calls: 2 },
    {
        id: "T10",
        columns: [1, 1, 7, 1],
        effects: ["", "", "LA", "HECD"],
        terminal: "value",
        calls: 2,
    },
    { id: "T11", columns: [1, 1, 7], effects: ["", "", "LKS"], terminal: "range", calls: 1 },
    {
        id: "T12",
        columns: [1, 1, 7, 1],
        effects: ["", "", "LKSQA", "H"],
        terminal: "hole",
        calls: 2,
    },
    {
        id: "N01",
        columns: [1, 1, 7, 1, 1],
        effects: ["", "", "LKSQlk", "A", "HECD"],
        terminal: "value",
        calls: 3,
    },
    {
        id: "N02",
        columns: [1, 1, 7, 1, 1, 1],
        effects: ["", "", "LKSQlk", "", "hecA", "HECD"],
        terminal: "value",
        calls: 3,
    },
];
function count(text: string, letters: string): number {
    let n = 0;
    for (let i = 0; i < text.length; i++) {
        if (letters.includes(text[i])) {
            n++;
        }
    }
    return n;
}
function language(v: ValueCompletion, r: Realm, name: string, message: string): void {
    check(
        v.type === "throw" &&
            v.value.kind === "object" &&
            v.value.object instanceof GuestError &&
            v.origin.kind === "engine-diagnostic" &&
            v.diagnostic.name === name &&
            v.diagnostic.message === message,
        "language " + message,
    );
    if (v.type === "throw" && v.value.kind === "object") {
        check(
            v.value.object.getPrototypeOf() ===
                r.getErrorPrototype(name === "RangeError" ? "RangeError" : "TypeError"),
            "error Realm",
        );
    }
}
function result(
    v: ValueCompletion,
    r: Realm,
    source: GuestObject,
    length: number,
    hole: boolean,
): void {
    if (v.type !== "normal" || v.value.kind !== "object") {
        throw new Error("normal result");
    }
    const o = v.value.object,
        d = o.getOwnProperty("length");
    check(
        o instanceof GuestArray &&
            o !== source &&
            o.getPrototypeOf() === r.arrayPrototype &&
            d !== undefined &&
            d.kind === "data" &&
            sameValue(d.value, num(length)) &&
            d.writable &&
            !d.enumerable &&
            !d.configurable,
        "result identity/length",
    );
    const e = o.getOwnProperty("0");
    if (length === 0 || hole) {
        check(e === undefined, "hole");
    } else {
        check(
            e !== undefined &&
                e.kind === "data" &&
                sameValue(e.value, num(payload)) &&
                e.writable &&
                e.enumerable &&
                e.configurable,
            "result element",
        );
    }
}
function fixture(t: Trace, cross: boolean) {
    const effects = new Effects(),
        a = new CountRealm(effects, false),
        b = cross ? new CountRealm(effects, false) : a,
        c = cross ? new CountRealm(effects, true) : a;
    const array = new ReadArray(b.arrayPrototype, effects, false),
        holder = new Holder(b.objectPrototype, effects),
        source: GuestObject = t.id === "T10" ? new Ordinary(b.objectPrototype, effects) : array;
    if (t.id !== "T01") {
        data(source, "0", num(payload));
    }
    if (t.id === "T10") {
        data(source, "length", num(1));
    }
    data(array, "constructor", obj(holder));
    const abrupt = failure("Sentinel", "exact", loc);
    abrupt.value = obj(c.createObject());
    const callback = c.createBuiltin("callback", 3, (receiver, args, ctx, _l) => {
        effects.text += "C";
        effects.callbacks++;
        check(
            ctx.realm === c &&
                sameValue(receiver, num(19)) &&
                args.length === 3 &&
                sameValue(args[0], num(payload)) &&
                sameValue(args[1], num(0)) &&
                args[2].kind === "object" &&
                args[2].object === source,
            "callback tuple/Realm",
        );
        const stopped = effects.interrupt("C");
        return stopped === null ? normal(args[0]) : stopped;
    });
    const getter = c.createBuiltin("constructorGetter", 0, (receiver, _args, ctx, _l) => {
        effects.text += "G";
        check(
            ctx.realm === c && receiver.kind === "object" && receiver.object === array,
            "constructor getter receiver/Realm",
        );
        const stopped = effects.interrupt("G");
        if (stopped !== null) {
            return stopped;
        }
        return t.id === "T08" ? abrupt : normal(obj(holder));
    });
    const species = c.createBuiltin(
        "speciesGetter",
        0,
        (receiver, _args, ctx, l): ValueCompletion => {
            effects.text += "Q";
            check(
                ctx.realm === c && receiver.kind === "object" && receiver.object === holder,
                "species receiver/Realm",
            );
            const stopped = effects.interrupt("Q");
            if (stopped !== null) {
                return stopped;
            }
            if (t.id === "T09") {
                return abrupt;
            }
            if (t.id === "T12") {
                array.internalDelete("0");
            }
            if (t.id === "N01" || t.id === "N02") {
                const inner = new ReadArray(c.arrayPrototype, effects, true);
                if (t.id === "N02") {
                    data(inner, "0", num(payload));
                }
                const cb = c.createBuiltin("innerCallback", 3, (_r, args, _c, _l) => {
                    effects.text += "c";
                    effects.callbacks++;
                    const stopped = effects.interrupt("c");
                    return stopped === null ? normal(args[0]) : stopped;
                });
                // In same-Realm runs the allocation observer needs the nested label.
                const before = effects.text.length;
                let v: ValueCompletion = normal();
                try {
                    v = mapObject(inner, obj(cb), UNDEFINED, ctx, l);
                } finally {
                    if (!cross) {
                        effects.text =
                            effects.text.slice(0, before) +
                            effects.text.slice(before).replaceAll("A", "a").replaceAll("D", "d");
                    }
                }
                if (v.type === "throw") {
                    return v;
                }
            }
            return normal();
        },
    );
    if (t.id === "T03" || t.id === "T08") {
        array.bootstrapDefine("constructor", { get: obj(getter), configurable: true });
    }
    if (["T03", "T09", "T12", "N01", "N02"].includes(t.id)) {
        holder.bootstrapDefine(wellKnownSpecies, { get: obj(species), configurable: true });
    }
    if (t.id === "T05") {
        data(array, "constructor", num(7));
    }
    if (t.id === "T06") {
        data(holder, wellKnownSpecies, num(7));
    }
    if (t.id === "T07") {
        data(holder, wellKnownSpecies, obj(c.getErrorConstructor("Error")));
    }
    if (t.id === "T11") {
        array.size = 4294967296;
    }
    const probe = a.createBuiltin("probe", 1, (_r, args, ctx, l) => {
        check(ctx.realm === a && sameValue(args[0], num(payload)), "probe Realm/input");
        return mapObject(source, t.id === "T04" ? num(0) : obj(callback), num(19), ctx, l);
    });
    define(b, "probe", obj(probe));
    effects.enabled = true;
    return { effects, a, b, c, array, source, holder, abrupt, callback, getter, species };
}
let prefixes = 0,
    calls = 0;
for (const cross of [false, true]) {
    for (const t of traces) {
        for (const seed of [0, 7]) {
            for (const callMode of [false, true]) {
                const total = t.columns.length;
                for (let limit = 0; limit <= (callMode ? 3 : total + 1); limit++) {
                    const f = fixture(t, cross),
                        s = createScriptSession(
                            callMode
                                ? { maxCalls: limit, maxSteps: 100000 }
                                : { maxSteps: seed + limit, maxCalls: 64 },
                        );
                    if (seed) {
                        run(";;;;;;;", f.b, s, "seed");
                    }
                    const v = run(input, f.b, s, inputId),
                        snap = s.inspect();
                    let fx = "",
                        steps = total,
                        failed = false,
                        column = 1,
                        realm = f.a;
                    if (!callMode) {
                        failed = limit < total;
                        steps = Math.min(limit + 1, total);
                        fx = t.effects.slice(0, Math.min(limit, total)).join("");
                        if (failed) {
                            column = t.columns[limit];
                            realm =
                                limit < 3
                                    ? f.b
                                    : (limit === 3 && ["T07", "N01", "N02"].includes(t.id)) ||
                                        (limit === 4 && t.id === "N02")
                                      ? f.c
                                      : f.a;
                        }
                    } else {
                        fx = t.effects.join("");
                        failed = limit < t.calls;
                        if (failed) {
                            if (limit === 0) {
                                steps = 3;
                                fx = "";
                                realm = f.b;
                            } else if (limit === 2) {
                                steps = 3;
                                fx = "LKSQlk";
                                realm = f.c;
                            } else if (t.id === "T02") {
                                steps = 4;
                                fx = "LKSAHE";
                            } else if (t.id === "T10") {
                                steps = 4;
                                fx = "LAHE";
                            } else {
                                steps = 3;
                                fx = t.id === "T03" || t.id === "T08" ? "LK" : "LKS";
                            }
                        }
                    }
                    const label =
                        t.id +
                        " cross=" +
                        cross +
                        " seed=" +
                        seed +
                        " call=" +
                        callMode +
                        " limit=" +
                        limit;
                    check(
                        f.effects.text === fx,
                        label + " effects expected " + fx + " got " + f.effects.text,
                    );
                    check(snap.steps === seed + steps, label + " steps");
                    check(
                        f.effects.arrays === count(fx, "Aa") &&
                            f.effects.callbacks === count(fx, "Cc"),
                        label + " counters",
                    );
                    if (failed) {
                        check(
                            v.type === "throw" &&
                                v.origin.kind === "resource-limit" &&
                                v.origin.guardCode === (callMode ? "calls" : "steps"),
                            label + " resource",
                        );
                        if (v.type === "throw" && v.origin.kind === "resource-limit") {
                            check(
                                v.origin.count === (callMode ? limit : seed + limit + 1) &&
                                    v.origin.limit === (callMode ? limit : seed + limit),
                                label + " count/limit",
                            );
                        }
                    } else if (
                        t.terminal === "invalid" ||
                        t.terminal === "callback" ||
                        t.terminal === "range"
                    ) {
                        language(
                            v,
                            f.a,
                            t.terminal === "range" ? "RangeError" : "TypeError",
                            t.terminal === "range"
                                ? "map result length exceeds array limit"
                                : t.terminal === "callback"
                                  ? "map callback is not callable"
                                  : "map species is not a constructor",
                        );
                    } else if (t.terminal === "custom") {
                        errorSpecies(v, f.c, 1);
                    } else if (t.terminal === "abrupt") {
                        check(v === f.abrupt, "exact completion");
                        realm = f.c;
                    } else {
                        result(
                            v,
                            f.a,
                            f.source,
                            t.terminal === "empty" ? 0 : 1,
                            t.terminal === "hole",
                        );
                    }
                    if (v.type === "throw") {
                        check(
                            snap.lastAbrupt !== null &&
                                snap.lastAbrupt.unitId === inputId &&
                                snap.lastAbrupt.realm === realm &&
                                snap.lastAbrupt.loc.column === column,
                            label + " provenance",
                        );
                    }
                    if (callMode) {
                        calls++;
                    } else {
                        prefixes++;
                    }
                }
            }
        }
    }
}
console.log("PASS frozen prefixes=" + prefixes + " calls=" + calls + " " + inputId);

// Semantic selection rows exercise data/accessor inheritance independently of
// the resource schedules. The selected object is never recursively inspected.
let semantic = 0;
for (const cross of [false, true]) {
    for (const empty of [false, true]) {
        for (let row = 1; row <= 30; row++) {
            if (row === 23 || row === 24 || row === 25) {
                continue;
            } // Abrupt substitutions below.
            const f = fixture(traces[empty ? 0 : 1], cross),
                a = f.array,
                h = f.holder,
                c = f.c;
            let expected = "default",
                selection = "LKS",
                getters = 0;
            const nullValue: Value = { kind: "null" },
                symbol: Value = { kind: "symbol", value: new GuestSymbol("Symbol.species") };
            const badValues: Value[] = [
                num(0),
                num(7),
                num(NaN),
                { kind: "boolean", value: false },
                { kind: "boolean", value: true },
                { kind: "string", value: "x" },
                symbol,
            ];
            const bad = badValues[((semantic / 2) | 0) % badValues.length];
            const poison = c.createBuiltin("poison", 0, (_r, _args, _ctx, _l): ValueCompletion => {
                getters++;
                return f.abrupt;
            });
            const ctorProto = f.b.createObject(),
                speciesProto = f.b.createObject();
            if (row === 1) {
                a.internalDelete("constructor");
                selection = "LK";
                check(
                    a.getOwnProperty("constructor") === undefined &&
                        sameValue(
                            own(f.b.arrayPrototype, "constructor"),
                            own(f.b.globalObject, "Array"),
                        ),
                    "C default array inherits exact Array",
                );
                // Keep the original genuinely absent-constructor case as a separate control.
                const missing = fixture(traces[empty ? 0 : 1], cross);
                missing.array.internalDelete("constructor");
                missing.array.setPrototypeOf(null);
                const missingSession = createScriptSession();
                result(
                    run(input, missing.b, missingSession, inputId),
                    missing.a,
                    missing.array,
                    empty ? 0 : 1,
                    false,
                );
                check(
                    missing.effects.text === (empty ? "LKA" : "LKAHECD") &&
                        missing.effects.arrays === 1 &&
                        missing.effects.callbacks === (empty ? 0 : 1),
                    "absent constructor preserved under C",
                );
            }
            if (row === 2 || row === 3) {
                a.internalDelete("constructor");
                if (row === 2) {
                    data(a, "constructor", UNDEFINED);
                } else {
                    data(ctorProto, "constructor", UNDEFINED);
                    a.setPrototypeOf(ctorProto);
                }
                selection = "LK";
            }
            if (row === 5) {
                data(h, wellKnownSpecies, UNDEFINED);
            }
            if (row === 6) {
                data(h, wellKnownSpecies, nullValue);
            }
            if (row === 7) {
                data(speciesProto, wellKnownSpecies, empty ? nullValue : UNDEFINED);
                h.setPrototypeOf(speciesProto);
            }
            if (row === 8 || row === 9) {
                data(a, "constructor", row === 8 ? nullValue : bad);
                expected = "invalid";
                selection = "LK";
            }
            if (row === 10) {
                data(h, wellKnownSpecies, bad);
                expected = "invalid";
            }
            if (row === 11) {
                const selected = c.createObject();
                selected.bootstrapDefine(wellKnownSpecies, {
                    get: obj(poison),
                    configurable: true,
                });
                data(h, wellKnownSpecies, obj(selected));
                expected = "invalid";
            }
            if (row === 12) {
                data(h, wellKnownSpecies, obj(poison));
                expected = "invalid";
            }
            if (row === 13) {
                const setup = createScriptSession();
                run("function K(){throw 999;}", c, setup, "constructor");
                data(h, wellKnownSpecies, own(c.globalObject, "K"));
                expected = "custom";
            }
            if (row === 14) {
                data(h, wellKnownSpecies, obj(c.getErrorConstructor("Error")));
                expected = "custom";
            }
            if (row === 15 || row === 16) {
                data(a, "constructor", obj(row === 15 ? poison : c.getErrorConstructor("Error")));
                selection = "LK";
            }
            if (row === 17 || row === 18 || row === 19 || row === 20) {
                const ctor = c.createBuiltinConstructor(
                    empty ? "Object" : "Array",
                    1,
                    (_r, _args, _ctx, _l): ValueCompletion => {
                        throw new Error("custom call");
                    },
                    (_k, _newTarget, _args, _ctx, _l): ValueCompletion => {
                        throw new Error("custom construct");
                    },
                );
                data(ctor, "prototype", obj(c.arrayPrototype));
                if (row === 19 || row === 20) {
                    a.internalDelete("constructor");
                    data(f.b.arrayPrototype, "constructor", obj(ctor));
                } else {
                    data(a, "constructor", obj(ctor));
                }
                selection = "LK";
                if (row === 18) {
                    ctor.bootstrapDefine(wellKnownSpecies, {
                        get: obj(poison),
                        configurable: true,
                    });
                    expected = "abrupt";
                }
                if (row === 20) {
                    data(ctor, wellKnownSpecies, empty ? nullValue : num(7));
                    if (!empty) {
                        expected = "invalid";
                    }
                }
            }
            if (row === 21) {
                // Nonarray skip is asserted by Ordinary's rejecting Get override.
                const o = new Ordinary(f.b.objectPrototype, f.effects);
                data(o, "length", num(empty ? 0 : 1));
                if (!empty) {
                    data(o, "0", num(payload));
                }
                o.bootstrapDefine("constructor", { get: obj(poison), configurable: true });
                const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
                    mapObject(
                        o,
                        obj(
                            c.createBuiltin("cb", 3, (_r, args, _c, _l) => {
                                f.effects.text += "C";
                                f.effects.callbacks++;
                                return normal(args[0]);
                            }),
                        ),
                        UNDEFINED,
                        ctx,
                        l,
                    ),
                );
                define(f.b, "probe", obj(probe));
                selection = "L";
            }
            if (row === 22) {
                const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
                    mapObject(a, num(7), UNDEFINED, ctx, l),
                );
                define(f.b, "probe", obj(probe));
                expected = "callback";
                selection = "L";
                a.bootstrapDefine("constructor", { get: obj(poison), configurable: true });
            }
            if (row === 26) {
                h.bootstrapDefine("Symbol.species", { get: obj(poison), configurable: true });
                h.bootstrapDefine(new GuestSymbol("Symbol.species"), {
                    get: obj(poison),
                    configurable: true,
                });
            }
            if (row === 27) {
                speciesProto.bootstrapDefine(wellKnownSpecies, {
                    get: obj(
                        c.createBuiltin("inheritedSpecies", 0, (receiver, _args, ctx, _l) => {
                            check(
                                receiver.kind === "object" &&
                                    receiver.object === h &&
                                    ctx.realm === c,
                                "inherited species receiver",
                            );
                            getters++;
                            return normal();
                        }),
                    ),
                    configurable: true,
                });
                h.setPrototypeOf(speciesProto);
            }
            if (row === 28) {
                a.internalDelete("constructor");
                ctorProto.bootstrapDefine("constructor", {
                    get: obj(
                        c.createBuiltin("inheritedConstructor", 0, (receiver, _args, ctx, _l) => {
                            check(
                                receiver.kind === "object" &&
                                    receiver.object === a &&
                                    ctx.realm === c,
                                "inherited constructor receiver",
                            );
                            getters++;
                            return normal(obj(h));
                        }),
                    ),
                    configurable: true,
                });
                a.setPrototypeOf(ctorProto);
            }
            if (row === 29) {
                h.bootstrapDefine(wellKnownSpecies, {
                    get: obj(
                        c.createBuiltin("mutateConstructor", 0, (_r, _args, _ctx, _l) => {
                            getters++;
                            data(a, "constructor", num(7));
                            return normal();
                        }),
                    ),
                    configurable: true,
                });
            }
            if (row === 30) {
                a.bootstrapDefine("constructor", {
                    get: obj(
                        c.createBuiltin("mutateSpecies", 0, (_r, _args, _ctx, _l) => {
                            getters++;
                            data(h, wellKnownSpecies, nullValue);
                            return normal(obj(h));
                        }),
                    ),
                    configurable: true,
                });
            }
            const s = createScriptSession(),
                v = run(input, f.b, s, inputId),
                label = "S" + row + " cross=" + cross + " empty=" + empty;
            if (expected === "default") {
                result(v, f.a, a, empty ? 0 : 1, false);
            } else if (expected === "invalid" || expected === "callback") {
                language(
                    v,
                    f.a,
                    "TypeError",
                    expected === "callback"
                        ? "map callback is not callable"
                        : "map species is not a constructor",
                );
            } else if (expected === "custom") {
                if (row === 13) {
                    check(
                        v.type === "throw" &&
                            v.origin.kind === "guest" &&
                            sameValue(v.value, num(999)),
                        label + " exact constructor throw",
                    );
                } else {
                    errorSpecies(v, c, empty ? 0 : 1);
                }
            } else {
                check(v === f.abrupt, label + " abrupt identity");
            }
            check(
                getters === ([18, 27, 28, 29, 30].includes(row) ? 1 : 0),
                label + " getter calls",
            );
            const intrinsic = expected === "default" && row === 1 && !cross,
                customResult = expected === "custom" && row === 14;
            const suffix =
                intrinsic || customResult
                    ? empty
                        ? ""
                        : "HEC"
                    : expected === "default"
                      ? empty
                          ? "A"
                          : "AHECD"
                      : "";
            check(
                f.effects.text === selection + suffix,
                label + " effects " + f.effects.text + " wanted " + selection + suffix,
            );
            check(
                f.effects.arrays === (expected === "default" && !intrinsic ? 1 : 0) &&
                    f.effects.callbacks ===
                        ((expected === "default" || customResult) && !empty ? 1 : 0),
                label + " counts",
            );
            semantic++;
        }
    }
}
console.log("PASS semantic selection=" + semantic);

// Every reachable hook substitutes all four explicit abrupt kinds and a host
// exception at every step prefix. Effects and allocation prefixes stay exact.
let abruptControls = 0;
for (const cross of [false, true]) {
    for (const seed of [0, 7]) {
        for (const hook of ["G", "Q", "E", "C"]) {
            for (const mode of ["guest", "engine", "resource", "unsupported", "host"]) {
                for (let limit = 0; limit <= 5; limit++) {
                    const f = fixture(traces[2], cross),
                        s = createScriptSession({ maxSteps: seed + limit, maxCalls: 64 }),
                        sentinel = new Error("host sentinel");
                    let abrupt: ThrowCompletion =
                        mode === "resource"
                            ? resourceFailure("steps", 23, 22, "substitute", loc)
                            : mode === "unsupported"
                              ? unsupportedFailure(
                                    "runtime.map-species",
                                    "TypeError",
                                    "substitute",
                                    loc,
                                )
                              : failure("Sentinel", "substitute", loc);
                    if (mode === "guest") {
                        abrupt = {
                            type: "throw",
                            origin: { kind: "guest" },
                            value: obj(f.c.createObject()),
                            diagnostic: abrupt.diagnostic,
                        };
                    }
                    const replacement = f.c.createBuiltin(
                        "substitute",
                        0,
                        (_r, _args, _ctx, _l): ValueCompletion => {
                            f.effects.text += hook;
                            if (hook === "C") {
                                f.effects.callbacks++;
                            }
                            if (mode === "host") {
                                throw sentinel;
                            }
                            return abrupt;
                        },
                    );
                    if (hook === "G") {
                        f.array.bootstrapDefine("constructor", {
                            get: obj(replacement),
                            configurable: true,
                        });
                    }
                    if (hook === "Q") {
                        f.holder.bootstrapDefine(wellKnownSpecies, {
                            get: obj(replacement),
                            configurable: true,
                        });
                    }
                    // ReadArray logs E before its descriptor getter; avoid a second event.
                    if (hook === "E") {
                        f.array.bootstrapDefine("0", {
                            get: obj(
                                f.c.createBuiltin(
                                    "element",
                                    0,
                                    (_r, _args, _ctx, _l): ValueCompletion => {
                                        if (mode === "host") {
                                            throw sentinel;
                                        }
                                        return abrupt;
                                    },
                                ),
                            ),
                            configurable: true,
                        });
                    }
                    if (hook === "C") {
                        const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
                            mapObject(f.array, obj(replacement), num(19), ctx, l),
                        );
                        define(f.b, "probe", obj(probe));
                    }
                    if (seed) {
                        run(";;;;;;;", f.b, s, "seed");
                    }
                    let caught = false,
                        v: ValueCompletion = normal();
                    try {
                        v = run(input, f.b, s, inputId);
                    } catch (e) {
                        if (!(e instanceof Error) || e !== sentinel) {
                            throw e;
                        }
                        caught = true;
                    }
                    const reached = limit >= (hook === "G" || hook === "Q" ? 3 : 4);
                    const expected =
                        limit < 3
                            ? ""
                            : hook === "G"
                              ? "LKG"
                              : hook === "Q"
                                ? "LKGSQ"
                                : limit < 4
                                  ? "LKGSQA"
                                  : hook === "E"
                                    ? "LKGSQAHE"
                                    : "LKGSQAHEC";
                    check(
                        f.effects.text === expected,
                        "abrupt prefix " + hook + " " + mode + " " + limit,
                    );
                    check(caught === (reached && mode === "host"), "host identity");
                    idle(s);
                    if (reached && mode !== "host") {
                        check(
                            v === abrupt &&
                                v.type === "throw" &&
                                v.value === abrupt.value &&
                                v.origin === abrupt.origin &&
                                v.diagnostic === abrupt.diagnostic,
                            "exact abrupt tuple",
                        );
                    }
                    if (!reached) {
                        check(
                            v.type === "throw" && v.origin.kind === "resource-limit",
                            "earlier resource wins",
                        );
                    }
                    const state = s.inspect();
                    check(
                        state.steps ===
                            seed + (reached ? (hook === "G" || hook === "Q" ? 3 : 4) : limit + 1),
                        "abrupt literal steps",
                    );
                    if (!caught) {
                        const last = state.lastAbrupt;
                        check(
                            last !== null &&
                                last.unitId === inputId &&
                                last.realm === (reached ? f.c : limit < 3 ? f.b : f.a) &&
                                last.loc.column === (reached ? 1 : limit === 2 ? 7 : 1),
                            "abrupt literal provenance",
                        );
                    }
                    if (!reached && v.type === "throw" && v.origin.kind === "resource-limit") {
                        check(
                            v.origin.guardCode === "steps" &&
                                v.origin.count === seed + limit + 1 &&
                                v.origin.limit === seed + limit,
                            "abrupt prefix resource tuple",
                        );
                    }
                    check(
                        f.effects.arrays === count(expected, "A") &&
                            f.effects.callbacks === count(expected, "C"),
                        "abrupt counters",
                    );
                    abruptControls++;
                }
            }
        }
    }
}
console.log("PASS abrupt prefixes=" + abruptControls);

let parsedControls = 0;
for (const cross of [false, true]) {
    for (const position of ["constructor", "species"]) {
        for (const throwing of [false, true]) {
            for (const seed of [0, 7]) {
                for (const callMode of [false, true]) {
                    const total = throwing ? 7 : 8,
                        columns = throwing ? [1, 1, 7, 1, 1, 14, 20] : [1, 1, 7, 1, 1, 14, 21, 1];
                    for (let limit = 0; limit <= (callMode ? 2 : total + 1); limit++) {
                        const f = fixture(traces[1], cross),
                            s = createScriptSession(
                                callMode
                                    ? { maxCalls: limit, maxSteps: 100000 }
                                    : { maxSteps: seed + limit, maxCalls: 64 },
                            ),
                            setup = createScriptSession(),
                            marker = obj(f.c.createObject());
                        define(f.c, "holder", obj(f.holder));
                        define(f.c, "marker", marker);
                        run(
                            throwing
                                ? "function g(){throw marker;}"
                                : position === "constructor"
                                  ? "function g(){return holder;}"
                                  : "function g(){return undefined;}",
                            f.c,
                            setup,
                            "getter",
                        );
                        const g = own(f.c.globalObject, "g");
                        if (position === "constructor") {
                            f.array.bootstrapDefine("constructor", { get: g, configurable: true });
                        } else {
                            f.holder.bootstrapDefine(wellKnownSpecies, {
                                get: g,
                                configurable: true,
                            });
                        }
                        if (seed) {
                            run(";;;;;;;", f.b, s, "seed");
                        }
                        const v = run(input, f.b, s, inputId),
                            snap = s.inspect();
                        const failed = callMode ? limit < 2 : limit < total,
                            done = callMode ? (failed ? 3 : total) : Math.min(limit, total);
                        let fx = done < 3 ? "" : position === "constructor" ? "LK" : "LKS";
                        if (callMode && limit === 0) {
                            fx = "";
                        }
                        if (!throwing && done >= 7 && !(callMode && failed)) {
                            fx = position === "constructor" ? "LKSA" : "LKSA";
                        }
                        if (!throwing && done >= 8) {
                            fx += "HECD";
                        }
                        const label =
                            "parsed " +
                            position +
                            " throwing=" +
                            throwing +
                            " seed=" +
                            seed +
                            " calls=" +
                            callMode +
                            " limit=" +
                            limit;
                        check(
                            f.effects.text === fx,
                            label + " effects " + f.effects.text + " expected " + fx,
                        );
                        check(
                            snap.steps ===
                                seed +
                                    (callMode ? (failed ? 3 : total) : Math.min(limit + 1, total)),
                            label + " steps",
                        );
                        if (failed) {
                            check(
                                v.type === "throw" &&
                                    v.origin.kind === "resource-limit" &&
                                    v.origin.guardCode === (callMode ? "calls" : "steps") &&
                                    v.origin.count === (callMode ? limit : seed + limit + 1) &&
                                    v.origin.limit === (callMode ? limit : seed + limit),
                                label + " resource tuple",
                            );
                        } else if (throwing) {
                            check(
                                v.type === "throw" &&
                                    v.value === marker &&
                                    v.origin.kind === "guest",
                                label + " exact marker",
                            );
                        } else {
                            result(v, f.a, f.array, 1, false);
                        }
                        if (v.type === "throw") {
                            const getterFailure =
                                (!callMode && failed && limit >= 3 && limit < 7) ||
                                (!failed && throwing);
                            const expectedRealm = getterFailure
                                ? f.c
                                : failed && (callMode ? limit === 0 : limit < 3)
                                  ? f.b
                                  : f.a;
                            const expectedColumn =
                                failed && !callMode ? columns[limit] : !failed && throwing ? 14 : 1;
                            check(
                                snap.lastAbrupt !== null &&
                                    snap.lastAbrupt.realm === expectedRealm &&
                                    snap.lastAbrupt.unitId ===
                                        (getterFailure ? "getter" : inputId) &&
                                    snap.lastAbrupt.loc.column === expectedColumn,
                                label +
                                    " source actual=" +
                                    (snap.lastAbrupt === null
                                        ? "null"
                                        : snap.lastAbrupt.unitId +
                                          ":" +
                                          snap.lastAbrupt.loc.column +
                                          ":" +
                                          (snap.lastAbrupt.realm === f.c ? "C" : "other")) +
                                    " expected=" +
                                    (getterFailure ? "getter" : inputId) +
                                    ":" +
                                    expectedColumn,
                            );
                        }
                        check(
                            f.effects.arrays === count(fx, "A") &&
                                f.effects.callbacks === count(fx, "C"),
                            label + " allocation/callbacks",
                        );
                        idle(setup);
                        parsedControls++;
                    }
                }
            }
        }
    }
}
console.log("PASS parsed getters=" + parsedControls);

type Retained = {
    invoke: Builtin;
    receiver: Value;
    args: Value[];
    context: OperationContext;
    loc: Location;
};
function slot(o: GuestObject): Builtin {
    const c = o.callable;
    if (c === null || c.kind !== "builtin") {
        throw new Error("builtin");
    }
    return c.invoke;
}
function deny(r: Retained | null): void {
    if (r === null) {
        throw new Error("retained");
    }
    let caught = false;
    try {
        r.invoke(r.receiver, r.args, r.context, r.loc);
    } catch (e) {
        if (!(e instanceof Error) || e.message !== "Script execution unavailable") {
            throw e;
        }
        caught = true;
    }
    check(caught, "raw guard");
}
let reentries = 0;
for (const cross of [false, true]) {
    for (const mode of ["normal", "guest", "host"]) {
        for (const callMode of [false, true]) {
            for (let limit = 0; limit <= (callMode ? 2 : 4); limit++) {
                const f = fixture(traces[1], cross),
                    outer = createScriptSession(),
                    inner = createScriptSession(
                        callMode
                            ? { maxCalls: limit, maxSteps: 100000 }
                            : { maxSteps: limit, maxCalls: 64 },
                    ),
                    sentinel = new Error("reentry host");
                const innerRealm = new CountRealm(f.effects, true),
                    source = new ReadArray(innerRealm.arrayPrototype, f.effects, true);
                data(source, "0", num(payload));
                const diagnostic = failure("Sentinel", "inner", loc).diagnostic;
                const marker: ThrowCompletion = {
                    type: "throw",
                    origin: { kind: "guest" },
                    value: obj(innerRealm.createObject()),
                    diagnostic,
                };
                const cb = innerRealm.createBuiltin(
                    "cb",
                    3,
                    (_r, args, _ctx, _l): ValueCompletion => {
                        f.effects.text += "c";
                        f.effects.callbacks++;
                        if (mode === "host") {
                            throw sentinel;
                        }
                        if (mode === "guest") {
                            return marker;
                        }
                        return normal(args[0]);
                    },
                );
                const bridge = innerRealm.createBuiltin("inner", 0, (_r, _args, ctx, l) =>
                    mapObject(source, obj(cb), UNDEFINED, ctx, l),
                );
                define(innerRealm, "inner", obj(bridge));
                let retained: Retained | null = null,
                    restored = 0;
                const hook = f.c.createBuiltin(
                    "reenter",
                    0,
                    (receiver, args, ctx, l): ValueCompletion => {
                        f.effects.text += "Q";
                        retained = { invoke: slot(hook), receiver, args, context: ctx, loc: l };
                        deny(retained);
                        const before = outer.inspect();
                        check(
                            before.steps === 3 &&
                                before.calls === 2 &&
                                before.depth === 2 &&
                                before.active?.realm === f.c,
                            "suspended outer",
                        );
                        try {
                            const v = run("inner();", innerRealm, inner, "inner");
                            return v.type === "throw" ? v : normal();
                        } finally {
                            const after = outer.inspect(),
                                p = before.active,
                                q = after.active;
                            if (p === null || q === null) {
                                throw new Error("frame");
                            }
                            check(
                                after.steps === 3 &&
                                    after.calls === 2 &&
                                    after.depth === 2 &&
                                    ctx.realm === f.c &&
                                    q.realm === p.realm &&
                                    q.record === p.record &&
                                    q.scopeId === p.scopeId &&
                                    q.lexical === p.lexical &&
                                    q.variable === p.variable &&
                                    q.function === p.function &&
                                    q.strict === p.strict &&
                                    sameValue(q.thisValue, p.thisValue) &&
                                    q.phase === p.phase &&
                                    q.privateEnvironment === p.privateEnvironment,
                                "outer full restoration",
                            );
                            idle(inner);
                            deny(retained);
                            restored++;
                        }
                    },
                );
                f.holder.bootstrapDefine(wellKnownSpecies, { get: obj(hook), configurable: true });
                let host = false,
                    v: ValueCompletion = normal();
                try {
                    v = run(input, f.b, outer, inputId);
                } catch (e) {
                    if (!(e instanceof Error) || e !== sentinel) {
                        throw e;
                    }
                    host = true;
                }
                const successfulBudget = callMode ? limit >= 2 : limit >= 4,
                    completed = successfulBudget && mode === "normal";
                const innerFx = callMode
                    ? limit === 0
                        ? ""
                        : limit === 1
                          ? "lk"
                          : "lkhec"
                    : limit < 2
                      ? ""
                      : limit < 4
                        ? "lk"
                        : "lkhec";
                const fx = "LKSQ" + innerFx + (completed ? "AHECD" : "");
                check(
                    f.effects.text === fx,
                    "separate counters effects " + f.effects.text + " expected " + fx,
                );
                check(
                    outer.inspect().steps === (completed ? 4 : 3) &&
                        inner.inspect().steps ===
                            (callMode ? (limit < 2 ? 2 : 4) : Math.min(limit + 1, 4)),
                    "separate literal steps",
                );
                check(
                    host === (successfulBudget && mode === "host") && restored === 1,
                    "host/finally",
                );
                idle(outer);
                idle(inner);
                deny(retained);
                if (completed) {
                    result(v, f.a, f.array, 1, false);
                } else if (!host) {
                    check(v.type === "throw", "outer abrupt");
                    const last = outer.inspect().lastAbrupt;
                    check(
                        last !== null && last.unitId === inputId && last.realm === f.c,
                        "outer captures independent completion at Q",
                    );
                    if (successfulBudget) {
                        check(v === marker, "inner exact completion");
                    }
                    const inside = inner.inspect().lastAbrupt;
                    check(
                        inside !== null && inside.unitId === "inner" && inside.realm === innerRealm,
                        "inner provenance",
                    );
                }
                // Budget-exhausted sessions keep their immutable limits. Reuse proves the
                // same owner rejects at its next literal tick; sufficient sessions dispatch.
                for (const owner of [
                    { r: f.b, s: outer, id: "outer-reuse", available: true },
                    {
                        r: innerRealm,
                        s: inner,
                        id: "inner-reuse",
                        available: callMode && limit >= 1,
                    },
                ]) {
                    const start = owner.s.inspect().steps;
                    let bodies = 0;
                    const record = prepare("resume(7);", owner.r, owner.id);
                    const resume = owner.r.createBuiltin("resume", 1, (receiver, args, ctx, l) => {
                        bodies++;
                        const raw: Retained = {
                            invoke: slot(resume),
                            receiver,
                            args,
                            context: ctx,
                            loc: l,
                        };
                        deny(raw);
                        deny(retained);
                        const now = owner.s.inspect();
                        check(
                            now.steps === start + 3 &&
                                now.calls === 1 &&
                                now.depth === 2 &&
                                now.active?.record === record &&
                                now.active?.realm === owner.r &&
                                ctx.realm === owner.r,
                            "same original owner reuse",
                        );
                        return normal(num(7));
                    });
                    define(owner.r, "resume", obj(resume));
                    const again = evaluateScript(owner.s, record).completion;
                    if (owner.available) {
                        check(
                            again.type === "normal" &&
                                sameValue(again.value, num(7)) &&
                                bodies === 1 &&
                                owner.s.inspect().steps === start + 3,
                            "original guarded reuse",
                        );
                    } else {
                        check(
                            again.type === "throw" &&
                                again.origin.kind === "resource-limit" &&
                                bodies === 0,
                            "original exhausted budget preserved",
                        );
                    }
                    idle(owner.s);
                    deny(retained);
                }
                reentries++;
            }
        }
    }
}
console.log("PASS separate-session reentry=" + reentries);

for (const cross of [false, true]) {
    for (const kind of ["ordinary", "default", "invalid", "custom", "maximum"]) {
        const f = fixture(traces[1], cross),
            s = createScriptSession({ maxSteps: 3, maxCalls: 64 });
        f.array.size = kind === "maximum" ? 4294967295 : 4294967296;
        if (kind === "invalid") {
            data(f.holder, wellKnownSpecies, num(7));
        }
        if (kind === "custom") {
            data(f.holder, wellKnownSpecies, obj(f.c.getErrorConstructor("Error")));
        }
        if (kind === "ordinary") {
            const o = new Ordinary(f.b.objectPrototype, f.effects);
            data(o, "length", num(4294967296));
            data(o, "constructor", num(7));
            const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
                mapObject(o, obj(f.callback), UNDEFINED, ctx, l),
            );
            define(f.b, "probe", obj(probe));
        }
        const v = run(input, f.b, s, inputId);
        if (kind === "maximum") {
            check(
                v.type === "throw" &&
                    v.origin.kind === "resource-limit" &&
                    f.effects.text === "LKSA" &&
                    f.effects.arrays === 1,
                "maximum allocates before failed first iteration",
            );
        } else if (kind === "custom") {
            check(
                v.type === "throw" &&
                    v.origin.kind === "resource-limit" &&
                    v.origin.guardCode === "steps" &&
                    v.origin.count === 4 &&
                    v.origin.limit === 3 &&
                    f.effects.text === "LKS" &&
                    f.effects.arrays === 0,
                "custom construction budget before default length bound",
            );
        } else {
            language(
                v,
                f.a,
                kind === "invalid" ? "TypeError" : "RangeError",
                kind === "invalid"
                    ? "map species is not a constructor"
                    : "map result length exceeds array limit",
            );
            check(
                f.effects.arrays === 0 && f.effects.text === (kind === "ordinary" ? "L" : "LKS"),
                "length precedence",
            );
        }
    }
    for (const mutation of ["shrink", "delete", "grow", "fill", "inherit"]) {
        const f = fixture(traces[1], cross);
        if (mutation === "fill" || mutation === "inherit") {
            f.array.internalDelete("0");
        }
        const getter = f.c.createBuiltin("mutate", 0, (_r, _args, _ctx, _l) => {
            f.effects.text += "Q";
            if (mutation === "shrink") {
                f.array.bootstrapDefine("length", { value: num(0) });
            }
            if (mutation === "delete") {
                f.array.internalDelete("0");
            }
            if (mutation === "grow") {
                data(f.array, "1", num(99));
            }
            if (mutation === "fill") {
                data(f.array, "0", num(payload));
            }
            if (mutation === "inherit") {
                data(f.b.arrayPrototype, "0", num(payload));
            }
            return normal();
        });
        f.holder.bootstrapDefine(wellKnownSpecies, { get: obj(getter), configurable: true });
        const v = run(input, f.b, createScriptSession(), inputId),
            hole = mutation === "shrink" || mutation === "delete";
        result(v, f.a, f.array, 1, hole);
        check(f.effects.text === (hole ? "LKSQAH" : "LKSQAHECD"), "live presence " + mutation);
    }
    // Saved length survives callback growth, deletion and filling a future hole.
    const f = fixture(traces[1], cross);
    data(f.array, "2", num(33));
    let callbacks = 0;
    const cb = f.c.createBuiltin("mutateCallback", 3, (_r, args, _ctx, _l) => {
        callbacks++;
        if (sameValue(args[1], num(0))) {
            data(f.array, "1", num(payload));
            f.array.internalDelete("2");
            data(f.array, "3", num(99));
        }
        return normal(args[0]);
    });
    const bridge = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
        mapObject(f.array, obj(cb), UNDEFINED, ctx, l),
    );
    define(f.b, "probe", obj(bridge));
    const v = run(input, f.b, createScriptSession(), inputId);
    if (v.type !== "normal" || v.value.kind !== "object") {
        throw new Error("mutation result");
    }
    check(
        sameValue(own(v.value.object, "length"), num(3)) &&
            sameValue(own(v.value.object, "1"), num(payload)) &&
            v.value.object.getOwnProperty("2") === undefined &&
            v.value.object.getOwnProperty("3") === undefined &&
            callbacks === 2,
        "saved limit callback mutations",
    );
}
// Length coercion is completion-aware and runs before callback validation.
{
    const f = fixture(traces[1], true),
        o = new Ordinary(f.b.objectPrototype, f.effects),
        length = f.c.createObject();
    const coercer = f.c.createBuiltin("lengthCoercion", 1, (_r, _args, _ctx, _l) => {
        f.effects.text += "V";
        data(o, "constructor", num(7));
        return f.abrupt;
    });
    data(length, wellKnownToPrimitive, obj(coercer));
    data(o, "length", obj(length));
    const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
        mapObject(o, num(7), UNDEFINED, ctx, l),
    );
    define(f.b, "probe", obj(probe));
    check(
        run(input, f.b, createScriptSession(), inputId) === f.abrupt &&
            f.effects.text === "LV" &&
            f.effects.arrays === 0,
        "length abrupt before invalid callback",
    );
}
for (const scriptOperation of [false, true]) {
    for (const scriptObject of [false, true]) {
        for (const defined of [false, true]) {
            const r = new Realm((_line: string) => {}, scriptOperation ? "script" : "legacy"),
                origin = new Realm((_line: string) => {}, scriptObject ? "script" : "legacy"),
                a = origin.createArray(),
                holder = origin.createObject();
            let species = 0;
            const getter = r.createBuiltin("species", 0, (_r, _args, _ctx, _l) => {
                species++;
                return normal();
            });
            holder.bootstrapDefine(wellKnownSpecies, { get: obj(getter), configurable: true });
            if (defined) {
                data(a, "constructor", obj(holder));
            }
            const cb = r.createBuiltin("cb", 0, (_r, _args, _ctx, _l) => normal());
            const probe = r.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
                mapObject(a, obj(cb), UNDEFINED, ctx, l),
            );
            let v: ValueCompletion = normal();
            if (scriptOperation) {
                define(r, "probe", obj(probe));
                v = run(input, r, createScriptSession(), inputId);
            } else {
                const evaluator = new Evaluator(r);
                v = evaluator.call(obj(probe), UNDEFINED, [num(payload)], loc);
                check(evaluator.calls === 0 && evaluator.depth === 0, "legacy cleanup");
            }
            if (!scriptOperation && (defined || scriptObject)) {
                check(
                    v.type === "throw" &&
                        v.origin.kind === "unsupported-operation" &&
                        v.origin.capabilityCode === "runtime.map-species" &&
                        v.value.kind === "string" &&
                        species === 0,
                    "legacy unchanged with own or inherited constructor",
                );
            } else {
                result(v, r, a, 0, false);
                check(species === (scriptOperation && defined ? 1 : 0), "running profile policy");
            }
            if (scriptObject && !defined) {
                check(
                    sameValue(
                        own(origin.arrayPrototype, "constructor"),
                        own(origin.globalObject, "Array"),
                    ),
                    "Script origin inherits exact Array",
                );
                // An explicit undefined own property retains the previous default-success case.
                data(a, "constructor", UNDEFINED);
                let shadow: ValueCompletion = normal();
                if (scriptOperation) {
                    shadow = run(input, r, createScriptSession(), inputId);
                } else {
                    const evaluator = new Evaluator(r);
                    shadow = evaluator.call(obj(probe), UNDEFINED, [num(payload)], loc);
                    check(evaluator.calls === 0 && evaluator.depth === 0, "legacy shadow cleanup");
                }
                result(shadow, r, a, 0, false);
                check(species === 0, "undefined constructor shadow skips species");
            }
        }
    }
}
{
    const f = fixture(traces[1], true);
    check(wellKnownSpecies.description === "Symbol.species", "canonical description");
    for (const r of [f.a, f.b, f.c]) {
        for (const o of [
            r.globalObject,
            r.objectPrototype,
            r.arrayPrototype,
            r.functionPrototype,
        ]) {
            check(o.getOwnProperty(wellKnownSpecies) === undefined, "no species installation");
        }
    }
    check(
        f.a.arrayConstructor !== null &&
            f.b.arrayConstructor !== null &&
            f.a.arrayConstructor !== f.b.arrayConstructor,
        "X06 distinct intrinsic Arrays",
    );
}
console.log("PASS lengths mutations profiles inventories; X06 intrinsic Array");

let primitiveControls = 0;
for (const cross of [false, true]) {
    for (const empty of [false, true]) {
        for (const species of [false, true]) {
            for (const invalid of [
                num(0),
                num(7),
                num(NaN),
                { kind: "boolean", value: false } as Value,
                { kind: "boolean", value: true } as Value,
                { kind: "string", value: "text" } as Value,
                { kind: "symbol", value: new GuestSymbol("invalid") } as Value,
            ]) {
                const f = fixture(traces[empty ? 0 : 1], cross);
                data(
                    species ? f.holder : f.array,
                    species ? wellKnownSpecies : "constructor",
                    invalid,
                );
                language(
                    run(input, f.b, createScriptSession(), inputId),
                    f.a,
                    "TypeError",
                    "map species is not a constructor",
                );
                check(
                    f.effects.text === (species ? "LKS" : "LK") &&
                        f.effects.arrays === 0 &&
                        f.effects.callbacks === 0,
                    "every primitive invalid",
                );
                primitiveControls++;
            }
        }
    }
}
class CoercionArray extends ReadArray {
    lengthValue: Value = UNDEFINED;
    internalGet(k: PropertyKey, r: Value, c: OperationContext, l: Location): ValueCompletion {
        if (k === "length") {
            this.effects.text += "L";
            return normal(this.lengthValue);
        }
        return super.internalGet(k, r, c, l);
    }
}
for (const cross of [false, true]) {
    for (const throwing of [false, true]) {
        const f = fixture(traces[1], cross),
            a = new CoercionArray(f.b.arrayPrototype, f.effects, false),
            length = f.c.createObject();
        data(a, "0", num(payload));
        data(a, "constructor", num(7));
        const coercer = f.c.createBuiltin("coerceLength", 1, (receiver, args, ctx, _l) => {
            check(
                ctx.realm === f.c &&
                    receiver.kind === "object" &&
                    receiver.object === length &&
                    args.length === 1 &&
                    sameValue(args[0], { kind: "string", value: "number" }),
                "length conversion tuple",
            );
            f.effects.text += "V";
            data(a, "constructor", obj(f.holder));
            if (throwing) {
                return f.abrupt;
            }
            return normal(num(1));
        });
        data(length, wellKnownToPrimitive, obj(coercer));
        a.lengthValue = obj(length);
        const cb = f.c.createBuiltin("cb", 3, (_r, args, _ctx, _l) => {
            f.effects.text += "C";
            f.effects.callbacks++;
            return normal(args[0]);
        });
        const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
            mapObject(a, throwing ? num(0) : obj(cb), UNDEFINED, ctx, l),
        );
        define(f.b, "probe", obj(probe));
        const v = run(input, f.b, createScriptSession(), inputId);
        if (throwing) {
            check(
                v === f.abrupt && f.effects.text === "LV" && f.effects.arrays === 0,
                "length before invalid callback",
            );
        } else {
            result(v, f.a, a, 1, false);
            check(f.effects.text === "LVKSAHECD", "length mutation before constructor Get");
        }
    }
}
console.log("PASS exhaustive primitive controls=" + primitiveControls + " length coercion");

let objectLinkControls = 0;
for (const cross of [false, true]) {
    for (const empty of [false, true]) {
        for (const selected of ["undefined", "null", "invalid", "custom", "poison"]) {
            const f = fixture(traces[empty ? 0 : 1], cross);
            let invoked = 0,
                gets = 0;
            const ctor = f.c.createBuiltinConstructor(
                "Object",
                1,
                (_r, _args, _ctx, _l): ValueCompletion => {
                    invoked++;
                    throw new Error("Object call forbidden");
                },
                (_k, _newTarget, _args, _ctx, _l): ValueCompletion => {
                    invoked++;
                    throw new Error("Object construct forbidden");
                },
            );
            data(ctor, "prototype", obj(f.b.objectPrototype));
            f.array.internalDelete("constructor");
            data(f.b.arrayPrototype, "constructor", obj(ctor));
            if (selected === "undefined") {
                data(ctor, wellKnownSpecies, UNDEFINED);
            }
            if (selected === "null") {
                data(ctor, wellKnownSpecies, { kind: "null" });
            }
            if (selected === "invalid") {
                data(ctor, wellKnownSpecies, num(7));
            }
            if (selected === "custom") {
                data(ctor, wellKnownSpecies, obj(ctor));
            }
            if (selected === "poison") {
                ctor.bootstrapDefine(wellKnownSpecies, {
                    get: obj(
                        f.c.createBuiltin("poisonSpecies", 0, (receiver, _args, ctx, _l) => {
                            gets++;
                            check(
                                ctx.realm === f.c &&
                                    receiver.kind === "object" &&
                                    receiver.object === ctor &&
                                    f.effects.arrays === 0,
                                "Object species exact receiver before allocation",
                            );
                            return f.abrupt;
                        }),
                    ),
                    configurable: true,
                });
            }
            let v: ValueCompletion = normal(),
                host = false;
            try {
                v = run(input, f.b, createScriptSession(), inputId);
            } catch (error) {
                if (!(error instanceof Error) || error.message !== "Object construct forbidden") {
                    throw error;
                }
                host = true;
            }
            if (selected === "undefined" || selected === "null") {
                result(v, f.a, f.array, empty ? 0 : 1, false);
            } else if (selected === "invalid") {
                language(v, f.a, "TypeError", "map species is not a constructor");
            } else if (selected === "custom") {
                check(host, "Object custom species constructs");
            } else {
                check(v === f.abrupt, "Object poison exact abrupt");
            }
            check(
                invoked === (selected === "custom" ? 1 : 0) &&
                    host === (selected === "custom") &&
                    gets === (selected === "poison" ? 1 : 0),
                "no Object identity exemption; selected constructor invoked",
            );
            objectLinkControls++;
        }
    }
}
for (const cross of [false, true]) {
    for (const empty of [false, true]) {
        for (const poison of [false, true]) {
            const f = fixture(traces[empty ? 0 : 1], cross),
                setup = createScriptSession();
            run("function Array(){throw 999;}", f.c, setup, "foreign-constructor");
            const value = own(f.c.globalObject, "Array");
            if (value.kind !== "object") {
                throw new Error("function");
            }
            value.object.bootstrapDefine("prototype", { value: obj(f.c.arrayPrototype) });
            data(f.array, "constructor", value);
            let gets = 0;
            if (poison) {
                value.object.bootstrapDefine(wellKnownSpecies, {
                    get: obj(
                        f.c.createBuiltin("foreignSpecies", 0, (receiver, _args, ctx, _l) => {
                            gets++;
                            check(
                                ctx.realm === f.c &&
                                    sameValue(receiver, value) &&
                                    f.effects.arrays === 0,
                                "foreign Script constructor species",
                            );
                            return f.abrupt;
                        }),
                    ),
                    configurable: true,
                });
            }
            const v = run(input, f.b, createScriptSession(), inputId);
            if (poison) {
                check(
                    v === f.abrupt && gets === 1 && f.effects.arrays === 0,
                    "named Array not foreign intrinsic",
                );
            } else {
                result(v, f.a, f.array, empty ? 0 : 1, false);
            }
            objectLinkControls++;
        }
    }
}
console.log("PASS Object-link and foreign Script constructor controls=" + objectLinkControls);

// Expand each accepted trace's literal event groups at every fresh/seeded prefix.
// The first injected hook cuts off the frozen trace; no engine output is used
// to choose its expected effects, source Realm, step count or publication.
let traceAbruptControls = 0;
for (const t of traces) {
    for (const hook of ["G", "Q", "E", "C", "e", "c"]) {
        const full = t.effects.join("");
        if (!full.includes(hook)) {
            continue;
        }
        let hookTick = 0;
        while (!t.effects[hookTick].includes(hook)) {
            hookTick++;
        }
        for (const cross of [false, true]) {
            for (const seed of [0, 7]) {
                for (const mode of ["guest", "engine", "resource", "unsupported", "host"]) {
                    for (let limit = 0; limit <= t.columns.length + 1; limit++) {
                        const f = fixture(t, cross),
                            s = createScriptSession({ maxSteps: seed + limit, maxCalls: 64 }),
                            sentinel = new Error("trace host");
                        let abrupt: ThrowCompletion =
                            mode === "resource"
                                ? resourceFailure("steps", 29, 28, "trace substitute", loc)
                                : mode === "unsupported"
                                  ? unsupportedFailure(
                                        "runtime.map-species",
                                        "TypeError",
                                        "trace substitute",
                                        loc,
                                    )
                                  : failure("Sentinel", "trace substitute", loc);
                        if (mode === "guest") {
                            abrupt = {
                                type: "throw",
                                value: obj(f.c.createObject()),
                                origin: { kind: "guest" },
                                diagnostic: abrupt.diagnostic,
                            };
                        }
                        f.effects.stopAt = hook;
                        f.effects.abrupt = abrupt;
                        if (mode === "host") {
                            f.effects.host = sentinel;
                        }
                        if (seed) {
                            run(";;;;;;;", f.b, s, "seed");
                        }
                        let v: ValueCompletion = normal(),
                            caught = false;
                        try {
                            v = run(input, f.b, s, inputId);
                        } catch (e) {
                            if (!(e instanceof Error) || e !== sentinel) {
                                throw e;
                            }
                            caught = true;
                        }
                        const reached = limit > hookTick,
                            fx = reached
                                ? full.slice(0, full.indexOf(hook) + 1)
                                : t.effects.slice(0, limit).join("");
                        const label = t.id + " " + hook + " " + mode + " " + limit;
                        check(f.effects.text === fx, label + " literal interrupted effects");
                        check(
                            f.effects.arrays === count(fx, "Aa") &&
                                f.effects.callbacks === count(fx, "Cc"),
                            label + " counts",
                        );
                        check(
                            s.inspect().steps === seed + (reached ? hookTick + 1 : limit + 1),
                            label + " step count",
                        );
                        check(caught === (reached && mode === "host"), label + " host");
                        idle(s);
                        if (reached && !caught) {
                            check(
                                v === abrupt &&
                                    v.type === "throw" &&
                                    v.value === abrupt.value &&
                                    v.diagnostic === abrupt.diagnostic &&
                                    v.origin === abrupt.origin,
                                label + " exact tuple",
                            );
                        }
                        if (!reached) {
                            check(
                                v.type === "throw" &&
                                    v.origin.kind === "resource-limit" &&
                                    v.origin.guardCode === "steps" &&
                                    v.origin.count === seed + limit + 1 &&
                                    v.origin.limit === seed + limit,
                                label + " prefix resource tuple",
                            );
                        }
                        if (!caught) {
                            const last = s.inspect().lastAbrupt,
                                realm = reached
                                    ? hook === "E"
                                        ? f.a
                                        : f.c
                                    : limit < 3
                                      ? f.b
                                      : (limit === 3 && ["T07", "N01", "N02"].includes(t.id)) ||
                                          (limit === 4 && t.id === "N02")
                                        ? f.c
                                        : f.a;
                            check(
                                last !== null &&
                                    last.unitId === inputId &&
                                    last.realm === realm &&
                                    last.loc.column === (reached ? 1 : t.columns[limit]),
                                label + " provenance",
                            );
                        }
                        traceAbruptControls++;
                    }
                }
            }
        }
    }
}
console.log("PASS all-trace abrupt prefixes=" + traceAbruptControls);

for (const cross of [false, true]) {
    const f = fixture(traces[1], cross),
        o = new Ordinary(f.b.objectPrototype, f.effects);
    let reads = 0;
    o.bootstrapDefine("length", {
        get: obj(
            f.c.createBuiltin("lengthGetter", 0, (receiver, args, ctx, _l) => {
                reads++;
                check(
                    receiver.kind === "object" &&
                        receiver.object === o &&
                        args.length === 0 &&
                        ctx.realm === f.c,
                    "length getter tuple",
                );
                return f.abrupt;
            }),
        ),
        configurable: true,
    });
    const probe = f.a.createBuiltin("probe", 1, (_r, _args, ctx, l) =>
        mapObject(o, num(0), UNDEFINED, ctx, l),
    );
    define(f.b, "probe", obj(probe));
    const s = createScriptSession();
    check(
        run(input, f.b, s, inputId) === f.abrupt &&
            reads === 1 &&
            f.effects.text === "L" &&
            f.effects.arrays === 0 &&
            s.inspect().lastAbrupt?.realm === f.c,
        "length getter before callback validation",
    );
    for (const position of ["constructor", "species"]) {
        for (const mode of ["guest", "engine", "resource", "unsupported", "host"]) {
            const q = fixture(traces[2], cross);
            q.array.bootstrapDefine("length", { value: num(0) });
            const sentinel = new Error("empty getter host");
            let abrupt: ThrowCompletion =
                mode === "resource"
                    ? resourceFailure("calls", 3, 3, "empty substitute", loc)
                    : mode === "unsupported"
                      ? unsupportedFailure(
                            "runtime.map-species",
                            "TypeError",
                            "empty substitute",
                            loc,
                        )
                      : failure("Sentinel", "empty substitute", loc);
            if (mode === "guest") {
                abrupt = {
                    type: "throw",
                    value: obj(q.c.createObject()),
                    origin: { kind: "guest" },
                    diagnostic: abrupt.diagnostic,
                };
            }
            q.effects.stopAt = position === "constructor" ? "G" : "Q";
            q.effects.abrupt = abrupt;
            if (mode === "host") {
                q.effects.host = sentinel;
            }
            const session = createScriptSession();
            let host = false,
                v: ValueCompletion = normal();
            try {
                v = run(input, q.b, session, inputId);
            } catch (e) {
                if (!(e instanceof Error) || e !== sentinel) {
                    throw e;
                }
                host = true;
            }
            check(
                host === (mode === "host") &&
                    (host || v === abrupt) &&
                    q.effects.text === (position === "constructor" ? "LKG" : "LKGSQ") &&
                    q.effects.arrays === 0 &&
                    q.effects.callbacks === 0 &&
                    session.inspect().steps === 3,
                "empty accessor abrupt selection",
            );
            idle(session);
        }
    }
}
console.log("PASS length-getter and empty-array abrupt selection");

function errorSpecies(value: ValueCompletion, realm: Realm, length: number): void {
    check(value.type === "normal" && value.value.kind === "object", "Error species completion");
    if (value.type !== "normal" || value.value.kind !== "object") {
        throw new Error("Error species object");
    }
    const object = value.value.object;
    check(
        object instanceof GuestError &&
            object.getPrototypeOf() === realm.getErrorPrototype("Error") &&
            sameValue(own(object, "message"), { kind: "string", value: String(length) }) &&
            object.getOwnProperty("length") === undefined,
        "Error species identity and message",
    );
    const element = object.getOwnProperty("0");
    check(
        length === 0
            ? element === undefined
            : element !== undefined &&
                  element.kind === "data" &&
                  sameValue(element.value, num(payload)) &&
                  element.writable &&
                  element.enumerable &&
                  element.configurable,
        "Error species mapped element",
    );
}
