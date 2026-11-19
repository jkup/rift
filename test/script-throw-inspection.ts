import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    sameValue,
    resourceFailure,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type Builtin,
} from "../src/runtime.js";
import { GuestSymbol, wellKnownSpecies } from "../src/symbols.js";
import { GuestNumber } from "../src/primitive-objects.js";
import { GuestArray } from "../src/array-object.js";
import { mapObject } from "../src/array-map.js";
import { prepareBoundedScript, type ExecutableScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import {
    evaluateScriptObserved,
    type ObservedScriptEvaluation,
} from "../src/script-throw-inspection.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {
        throw new Error("output");
    }, "script");
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function str(value: string): Value {
    return { kind: "string", value };
}
function num(value: number): Value {
    return { kind: "number", value };
}
function data(object: GuestObject, key: string, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, configurable: true });
}
function define(realm: Realm, key: string, value: Value): void {
    realm.defineScriptGlobal(key, { value, writable: true, configurable: true });
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("missing data " + key);
    }
    return descriptor.value;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") {
        throw new Error("object");
    }
    return value.object;
}
function prepare(realm: Realm, text: string, id: string): ExecutableScript {
    const prepared = prepareBoundedScript({ id, text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + id);
    }
    return prepared.record;
}
function idle(session: ScriptSession): void {
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "all-exit cleanup");
}
function run(session: ScriptSession, realm: Realm, text: string, id: string): ValueCompletion {
    try {
        return evaluateScript(session, prepare(realm, text, id)).completion;
    } finally {
        idle(session);
    }
}
function observe(
    session: ScriptSession,
    realm: Realm,
    text: string,
    id: string,
): ObservedScriptEvaluation {
    try {
        return evaluateScriptObserved(session, prepare(realm, text, id));
    } finally {
        idle(session);
    }
}
function abrupt(result: ObservedScriptEvaluation): ThrowCompletion {
    const completion = result.evaluation.completion;
    if (completion.type !== "throw") {
        throw new Error("original throw");
    }
    return completion;
}
function available(result: ObservedScriptEvaluation, realm: Realm, name: string): void {
    const inspection = result.inspection;
    check(
        inspection !== null &&
            inspection.kind === "available" &&
            inspection.realm === realm &&
            inspection.name === name,
        "available " + name,
    );
}
function retained(session: ScriptSession, result: ObservedScriptEvaluation): void {
    const source = result.source,
        history = session.inspect().lastAbrupt;
    check(
        source !== null &&
            history !== null &&
            source.record === history.record &&
            source.realm === history.realm &&
            source.unitId === history.unitId &&
            source.loc.line === history.loc.line &&
            source.loc.column === history.loc.column,
        "original history",
    );
    if (source === null || history === null) {
        throw new Error("source");
    }
    source.loc.column = 999;
    check(
        session.inspect().lastAbrupt?.loc.column === history.loc.column,
        "detached result location",
    );
    source.loc.column = history.loc.column;
}
function accessor(target: GuestObject, key: string, realm: Realm, callback: Builtin): void {
    target.bootstrapDefine(key, {
        get: obj(realm.createBuiltin(key, 0, callback)),
        configurable: true,
    });
}
const input = readFileSync(process.argv[2], "utf8");
check(input === "missing;\n" || input === "otherMissing;\n", "runtime input");
const payload = input === "missing;\n" ? 7 : 11;

// Original runtime errors are inspected as real objects, with original source.
{
    const realm = fresh(),
        session = createScriptSession();
    const record = prepare(realm, '"use strict"; ' + input, "X01");
    const result = evaluateScriptObserved(session, record);
    idle(session);
    available(result, realm, "ReferenceError");
    const completion = abrupt(result);
    check(
        completion.origin.kind === "engine-diagnostic" &&
            result.source?.record === record &&
            result.source.realm === realm &&
            result.source.loc.line === 1 &&
            result.source.loc.column === 15,
        "X01 original identity/site",
    );
    const message = own(object(completion.value), "message");
    check(
        message.kind === "string" &&
            message.value.includes(input === "missing;\n" ? "missing" : "otherMissing"),
        "runtime input message",
    );
    retained(session, result);
    const next = observe(session, realm, "1;", "normal");
    check(
        next.evaluation.completion.type === "normal" &&
            next.source === null &&
            next.inspection === null,
        "normal/reuse",
    );
    const caught = observe(session, realm, "try {throw 1;} catch(e) {}", "caught-normal");
    check(
        caught.evaluation.completion.type === "normal" &&
            caught.source === null &&
            caught.inspection === null &&
            session.inspect().lastAbrupt?.unitId === "caught-normal",
        "normal projection preserves caught history privately",
    );
}
const primitives: Value[] = [
    str("ReferenceError"),
    num(payload),
    { kind: "null" },
    UNDEFINED,
    { kind: "boolean", value: true },
    { kind: "symbol", value: new GuestSymbol("x") },
];
for (const value of primitives) {
    const realm = fresh(),
        session = createScriptSession();
    define(realm, "target", value);
    const result = observe(session, realm, "throw target;", "X02");
    check(
        sameValue(abrupt(result).value, value) && result.inspection?.kind === "absent",
        "primitive absent",
    );
}

// Frozen four-tick host schedule: two source ticks followed by C then N.
for (const seed of [0, 7]) {
    for (const limit of [0, 1, 2, 3, 4]) {
        const realm = fresh(),
            session = createScriptSession({ maxSteps: seed + limit, maxCalls: 2 });
        if (seed) {
            check(run(session, realm, ";;;;;;;", "seed").type === "normal", "seven seed");
        }
        const target = new GuestObject(),
            ctor = realm.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
        let effects = "";
        accessor(target, "constructor", realm, (receiver, _args, context, loc) => {
            check(sameValue(receiver, obj(target)) && context.realm === realm, "C receiver/Realm");
            effects += "C";
            const budget = context.tick(loc);
            return budget.type === "throw" ? budget : normal(obj(ctor));
        });
        accessor(ctor, "name", realm, (receiver, _args, context, loc) => {
            check(sameValue(receiver, obj(ctor)) && context.realm === realm, "N receiver/Realm");
            effects += "N";
            const budget = context.tick(loc);
            return budget.type === "throw" ? budget : normal(str("ReferenceError"));
        });
        define(realm, "target", obj(target));
        const result = observe(session, realm, "throw target;", "prefix");
        check(effects === ["", "", "C", "CN", "CN"][limit], "literal prefix effects");
        check(session.inspect().steps === seed + Math.min(limit + 1, 4), "literal prefix count");
        if (limit < 2) {
            check(
                abrupt(result).origin.kind === "resource-limit" && result.inspection === null,
                "direct resource bypass",
            );
        } else if (limit < 4) {
            const inspection = result.inspection;
            check(
                inspection?.kind === "resource-limit" &&
                    inspection.source.loc.column === 1 &&
                    inspection.completion.origin.kind === "resource-limit",
                "secondary resource",
            );
            retained(session, result);
        } else {
            available(result, realm, "ReferenceError");
            retained(session, result);
        }
        if (limit < 4) {
            check(
                run(session, realm, "", "empty-reuse").type === "normal",
                "exhausted empty reuse",
            );
            const denied = run(session, realm, ";", "exhausted");
            check(
                denied.type === "throw" && denied.origin.kind === "resource-limit",
                "immutable exhausted cap",
            );
        }
    }
}
for (const seed of [0, 7]) {
    for (const calls of [0, 1, 2]) {
        const realm = fresh(),
            session = createScriptSession({ maxSteps: 100, maxCalls: calls });
        if (seed) {
            run(session, realm, ";;;;;;;", "seed");
        }
        const target = new GuestObject(),
            ctor = realm.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
        let effects = "";
        accessor(target, "constructor", realm, (_r, _a, c, l) => {
            effects += "C";
            c.tick(l);
            return normal(obj(ctor));
        });
        accessor(ctor, "name", realm, (_r, _a, c, l) => {
            effects += "N";
            c.tick(l);
            return normal(str(""));
        });
        define(realm, "target", obj(target));
        const result = observe(session, realm, "throw target;", "calls");
        check(
            effects === (calls === 0 ? "" : "CN") &&
                session.inspect().steps === seed + (calls === 0 ? 2 : 4),
            "call prefix",
        );
        if (calls === 0) {
            check(
                result.inspection?.kind === "resource-limit" &&
                    result.inspection.completion.origin.kind === "resource-limit" &&
                    result.inspection.completion.origin.guardCode === "calls",
                "call cap",
            );
        } else {
            available(result, realm, "");
        }
        retained(session, result);
        check(
            run(session, realm, ";", "same-session-reuse").type === "normal",
            "calls session reuse",
        );
    }
}

for (const mode of [
    "null",
    "undefined",
    "number",
    "object",
    "non-string",
    "empty",
    "other",
    "legacy",
]) {
    const realm = fresh(),
        other = fresh(),
        legacy = new Realm((_line: string) => {}),
        session = createScriptSession();
    const target = new GuestObject();
    let owner: Realm;
    if (mode === "other") {
        owner = other;
    } else if (mode === "legacy") {
        owner = legacy;
    } else {
        owner = realm;
    }
    const ctor = owner.createBuiltin("constructor", 0, (_r, _a, _c, _l) => normal());
    let reads = 0;
    accessor(ctor, "name", realm, (_r, _a, _c, _l) => {
        reads++;
        return normal(mode === "non-string" ? num(7) : str(""));
    });
    let constructorValue: Value;
    if (mode === "null") {
        constructorValue = { kind: "null" };
    } else if (mode === "undefined") {
        constructorValue = UNDEFINED;
    } else if (mode === "number") {
        constructorValue = num(7);
    } else if (mode === "object") {
        constructorValue = obj(new GuestObject());
    } else {
        constructorValue = obj(ctor);
    }
    data(target, "constructor", constructorValue);
    define(realm, "target", obj(target));
    const result = observe(session, realm, "throw target;", "X03-X05");
    if (mode === "null" || mode === "undefined") {
        check(result.inspection?.kind === "absent", "absent ctor");
    } else if (mode === "number" || mode === "object") {
        check(result.inspection?.kind === "non-callable", "noncallable ctor");
    } else if (mode === "legacy") {
        check(result.inspection?.kind === "foreign-profile", "foreign profile");
    } else if (mode === "non-string") {
        check(
            result.inspection?.kind === "non-string-name" && result.inspection.realm === realm,
            "invalid name Realm",
        );
    } else {
        available(result, owner, "");
    }
    check(
        reads === (mode === "non-string" || mode === "empty" || mode === "other" ? 1 : 0),
        "single or bypass name Get",
    );
}

// Actual guest accessors, with a different defining record and Realm.
for (const at of ["return", "constructor", "name"]) {
    const realm = fresh(),
        other = fresh(),
        session = createScriptSession(),
        setup = createScriptSession();
    const target = new GuestObject(),
        sentinel = new GuestObject(),
        ctor = other.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
    let recursive = 0;
    accessor(sentinel, "constructor", realm, (_r, _a, _c, _l) => {
        recursive++;
        return normal();
    });
    define(other, "target", obj(target));
    define(other, "ctor", obj(ctor));
    define(other, "sentinel", obj(sentinel));
    const text =
        '"use strict"; var order=""; function C(){order=order+"C"; if(this!==target) throw 99; ' +
        (at === "constructor" ? "throw sentinel;" : "return ctor;") +
        '} function N(){order=order+"N"; if(this!==ctor) throw 99; ' +
        (at === "name" ? "throw sentinel;" : 'return "ReferenceError";') +
        "}";
    const defining = prepare(other, text, "guest-getters");
    check(evaluateScript(setup, defining).completion.type === "normal", "guest getter setup");
    target.bootstrapDefine("constructor", {
        get: own(other.globalObject, "C"),
        configurable: true,
    });
    ctor.bootstrapDefine("name", { get: own(other.globalObject, "N"), configurable: true });
    define(realm, "target", obj(target));
    const result = observe(session, realm, "throw target;", "guest-entry");
    check(
        sameValue(abrupt(result).value, obj(target)) &&
            result.source?.realm === realm &&
            result.source.unitId === "guest-entry",
        "guest original",
    );
    if (at === "return") {
        available(result, other, "ReferenceError");
    } else {
        const inspection = result.inspection;
        check(
            inspection?.kind === "abrupt" &&
                sameValue(inspection.completion.value, obj(sentinel)) &&
                inspection.source.record === defining &&
                inspection.source.realm === other &&
                inspection.source.unitId === "guest-getters",
            "guest secondary identity",
        );
    }
    check(
        sameValue(own(other.globalObject, "order"), str(at === "constructor" ? "C" : "CN")) &&
            recursive === 0,
        "guest order/no recursion",
    );
    retained(session, result);
    check(
        run(session, realm, ";", "reuse-a").type === "normal" &&
            run(setup, other, ";", "reuse-b").type === "normal",
        "BOTH original sessions reused",
    );
}

// Host/secondary failures at each Get, and exact completion identity from a
// host operation. No serialization or registry participates in these controls.
for (const at of ["constructor", "name"]) {
    for (const mode of ["throw", "resource", "species", "unsupported", "host", "same"]) {
        const realm = fresh(),
            other = fresh(),
            session = createScriptSession(),
            nested = createScriptSession();
        const target = new GuestObject(),
            sentinel = new GuestObject(),
            ctor = other.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
        const original: ThrowCompletion = {
            type: "throw",
            value: obj(target),
            origin: { kind: "guest" },
            diagnostic: {
                phase: "runtime",
                name: "misleading",
                message: "original",
                loc: { line: 1, column: 1 },
            },
        };
        const secondary: ThrowCompletion = {
            type: "throw",
            value: obj(sentinel),
            origin: { kind: "guest" },
            diagnostic: {
                phase: "runtime",
                name: "ReferenceError",
                message: "secondary",
                loc: { line: 1, column: 2 },
            },
        };
        const host = new Error("host sentinel");
        let recursive = 0,
            seen = "";
        accessor(sentinel, "constructor", realm, (_r, _a, _c, _l) => {
            recursive++;
            return normal();
        });
        const nestedRecord = prepare(other, "nestedFault();", "nested-host");
        define(
            other,
            "nestedFault",
            obj(
                other.createBuiltin("nestedFault", 0, (_r, _a, _c, _l): ValueCompletion => {
                    throw host;
                }),
            ),
        );
        const fault: Builtin = (_r, _a, c, l): ValueCompletion => {
            check(c.realm === other, "foreign getter context");
            if (mode === "host") {
                evaluateScriptObserved(nested, nestedRecord);
                throw new Error("unreachable");
            }
            if (mode === "resource") {
                return resourceFailure("steps", 101, 100, "fault", l);
            }
            if (mode === "species") {
                return mapSpecies(other, c, l);
            }
            if (mode === "unsupported") {
                return unsupportedRegExp(other, c, l);
            }
            return mode === "same" ? original : secondary;
        };
        accessor(target, "constructor", other, (r, a, c, l) => {
            seen += "C";
            return at === "constructor" ? fault(r, a, c, l) : normal(obj(ctor));
        });
        accessor(ctor, "name", other, (r, a, c, l) => {
            seen += "N";
            return at === "name" ? fault(r, a, c, l) : normal(str("ReferenceError"));
        });
        define(
            realm,
            "origin",
            obj(realm.createBuiltin("origin", 0, (_r, _a, _c, _l) => original)),
        );
        if (mode === "host") {
            let caught = false;
            try {
                observe(session, realm, "origin();", "host-origin");
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }
                check(error === host, "exact host identity");
                caught = true;
            }
            check(
                caught && session.inspect().lastAbrupt?.unitId === "host-origin",
                "host preserves original history",
            );
            idle(nested);
        } else {
            const result = observe(session, realm, "origin();", "original");
            check(
                result.evaluation.completion === original &&
                    abrupt(result).value === original.value,
                "exact original completion/value",
            );
            const inspection = result.inspection;
            if (mode === "species") {
                check(
                    inspection?.kind ===
                        (at === "constructor" ? "non-callable" : "non-string-name") &&
                        (inspection.kind !== "non-string-name" || inspection.realm === other),
                    "successful species inspection outcome",
                );
            } else {
                check(
                    inspection !== null &&
                        (inspection.kind === "abrupt" ||
                            inspection.kind === "resource-limit" ||
                            inspection.kind === "unsupported-operation"),
                    "secondary outcome",
                );
            }
            if (
                inspection !== null &&
                (inspection.kind === "abrupt" ||
                    inspection.kind === "resource-limit" ||
                    inspection.kind === "unsupported-operation")
            ) {
                let expectedKind: string;
                if (mode === "resource") {
                    expectedKind = "resource-limit";
                } else if (mode === "unsupported") {
                    expectedKind = "unsupported-operation";
                } else {
                    expectedKind = "abrupt";
                }
                check(inspection.kind === expectedKind, "exact secondary tag");
                if (mode === "same" || mode === "throw") {
                    check(
                        inspection.completion === (mode === "same" ? original : secondary),
                        "exact secondary completion",
                    );
                }
                check(
                    inspection.source.realm === other && inspection.source.unitId === "original",
                    "secondary builtin source Realm",
                );
            }
            retained(session, result);
        }
        check(
            recursive === 0 && seen === (at === "constructor" ? "C" : "CN"),
            "fault order/no recursion",
        );
        check(
            run(session, realm, ";", "reuse-original").type === "normal" &&
                run(nested, other, ";", "reuse-nested").type === "normal",
            "BOTH original sessions after exit",
        );
    }
}

function mapSpecies(
    realm: Realm,
    context: Parameters<Builtin>[2],
    loc: Parameters<Builtin>[3],
): ValueCompletion {
    const array = new GuestArray(realm.arrayPrototype),
        ctor = new GuestObject();
    ctor.bootstrapDefine(wellKnownSpecies, { value: own(realm.globalObject, "Object") });
    data(array, "constructor", obj(ctor));
    const callback = realm.createBuiltin("callback", 3, (_r, _a, _c, _l) => normal());
    const result = mapObject(array, obj(callback), UNDEFINED, context, loc);
    if (result.type === "normal") {
        boxedZero(result, realm);
    }
    return result;
}
for (const species of [true, false]) {
    const realm = fresh(),
        session = createScriptSession();
    define(
        realm,
        "unsupported",
        obj(
            realm.createBuiltin("unsupported", 0, (_r, _a, c, l) =>
                species ? mapSpecies(realm, c, l) : unsupportedRegExp(realm, c, l),
            ),
        ),
    );
    const result = observe(session, realm, "unsupported();", "U01");
    if (species) {
        boxedZero(result.evaluation.completion, realm);
        check(result.inspection === null, "successful species needs no throw inspection");
    } else {
        const completion = abrupt(result);
        check(
            completion.origin.kind === "unsupported-operation" &&
                completion.origin.capabilityCode === "runtime.regexp-pattern" &&
                result.inspection === null,
            "direct actual unsupported bypass",
        );
    }
}
// Ordinary entry never inspects; observed reentry is rejected by the same guard.
{
    const realm = fresh(),
        session = createScriptSession(),
        target = new GuestObject();
    let reads = 0;
    const empty = prepare(realm, "", "reentry");
    accessor(target, "constructor", realm, (_r, _a, _c, _l) => {
        reads++;
        let denied = false;
        try {
            evaluateScriptObserved(session, empty);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }
            denied = error.message === "Script session already active";
        }
        check(denied, "observed reentrant denial");
        return normal();
    });
    define(realm, "target", obj(target));
    check(
        run(session, realm, "throw target;", "ordinary").type === "throw" && reads === 0,
        "ordinary unchanged",
    );
    check(
        observe(session, realm, "throw target;", "observed").inspection?.kind === "absent" &&
            reads === 1,
        "one observed Get",
    );
}
// Entry phase and defining source are independent. The inspector runs in the
// entry frame even when a foreign guest function supplied the original throw.
{
    const realm = fresh(),
        other = fresh(),
        session = createScriptSession(),
        setup = createScriptSession();
    const target = new GuestObject();
    define(other, "target", obj(target));
    const defining = prepare(other, "function fail(){throw target;}", "foreign-origin");
    check(evaluateScript(setup, defining).completion.type === "normal", "foreign origin setup");
    define(realm, "fail", own(other.globalObject, "fail"));
    accessor(target, "constructor", realm, (_r, _a, context, _loc) => {
        const active = session.inspect().active;
        check(
            context.realm === realm &&
                active?.realm === realm &&
                active.record.inspect().unit.id === "entry",
            "entry inspection context",
        );
        return normal(own(realm.globalObject, "ReferenceError"));
    });
    const result = observe(session, realm, "fail();", "entry");
    available(result, realm, "ReferenceError");
    check(
        result.source?.record === defining &&
            result.source.realm === other &&
            result.source.loc.column === 17,
        "original foreign source",
    );
    retained(session, result);
    check(
        run(session, realm, ";", "reuse-entry").type === "normal" &&
            run(setup, other, ";", "reuse-defining").type === "normal",
        "foreign source both reuse",
    );
}
{
    const realm = fresh(),
        session = createScriptSession();
    realm.defineScriptGlobal("locked", { value: num(1), configurable: false });
    const result = observe(session, realm, "let locked;", "instantiation");
    check(
        result.evaluation.phase === "instantiation" && result.source?.unitId === "instantiation",
        "instantiation source",
    );
    available(result, realm, "SyntaxError");
    retained(session, result);
}
for (const mode of ["species", "unsupported", "resource"]) {
    const realm = fresh(),
        session = createScriptSession(),
        target = new GuestObject();
    let reads = 0;
    accessor(target, "constructor", realm, (_r, _a, _c, _l) => {
        reads++;
        return normal();
    });
    define(
        realm,
        "fault",
        obj(
            realm.createBuiltin("fault", 0, (_r, _a, c, l): ValueCompletion => {
                let result: ValueCompletion;
                if (mode === "resource") {
                    result = resourceFailure("steps", 101, 100, "fault", l);
                } else if (mode === "species") {
                    result = mapSpecies(realm, c, l);
                } else {
                    result = unsupportedRegExp(realm, c, l);
                }
                if (mode === "species") {
                    return result;
                }
                if (result.type !== "throw") {
                    throw new Error("fault");
                }
                return {
                    type: "throw",
                    value: obj(target),
                    origin: result.origin,
                    diagnostic: result.diagnostic,
                };
            }),
        ),
    );
    const result = observe(session, realm, "fault();", "origin-precedence");
    if (mode === "species") {
        boxedZero(result.evaluation.completion, realm);
        check(result.inspection === null && reads === 0, "successful species no inspection");
    } else {
        check(
            result.inspection === null &&
                reads === 0 &&
                abrupt(result).origin.kind ===
                    (mode === "resource" ? "resource-limit" : "unsupported-operation"),
            "object resource/unsupported bypass",
        );
    }
}
console.log("PASS X01-X06 U01-U02 input=" + payload + " prefixes=10 calls=6 guest=3 faults=12");

// Approved P01/P02/P06/P07/P09: synthetic provenance and execution Realm
// are independent, including nested builtin propagation and session reentry.
for (const seed of [0, 7]) {
    for (const position of ["constructor", "name"]) {
        for (const mode of [
            "entry",
            "third",
            "resource",
            "species",
            "unsupported",
            "same",
            "host",
            "reentry",
        ]) {
            for (const wrapped of [false, true]) {
                const entry = fresh(),
                    other = fresh(),
                    third = fresh();
                const session = createScriptSession(),
                    setup = createScriptSession();
                if (seed) {
                    run(session, entry, ";;;;;;;", "seed-a");
                    run(setup, other, ";;;;;;;", "seed-b");
                }
                const target = new GuestObject(),
                    ctor = third.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
                const marker = num(payload),
                    host = new Error("P07 host");
                const original: ThrowCompletion = {
                    type: "throw",
                    value: obj(target),
                    origin: { kind: "guest" },
                    diagnostic: {
                        phase: "runtime",
                        name: "Uncaught",
                        message: "original",
                        loc: { line: 1, column: 17 },
                    },
                };
                define(other, "target", obj(target));
                define(
                    other,
                    "origin",
                    obj(other.createBuiltin("origin", 0, (_r, _a, _c, _l) => original)),
                );
                const originalRecord = prepare(
                    other,
                    mode === "same"
                        ? "function fail(){origin();}"
                        : "function fail(){throw target;}",
                    "original",
                );
                check(
                    evaluateScript(setup, originalRecord).completion.type === "normal",
                    "P original setup",
                );
                define(entry, "fail", own(other.globalObject, "fail"));
                const entryRecord = prepare(entry, "fail();", "entry");
                const nestedRecord = prepare(
                    third,
                    "function crash(){host();} crash();",
                    "nested-host",
                );
                define(
                    third,
                    "host",
                    obj(
                        third.createBuiltin("host", 0, (_r, _a, _c, _l): ValueCompletion => {
                            throw host;
                        }),
                    ),
                );
                const getterRealm = mode === "entry" ? entry : third;
                let secondary: ThrowCompletion | null = null,
                    getterCalls = 0;
                const body: Builtin = (receiver, _args, context, loc): ValueCompletion => {
                    getterCalls++;
                    const active = session.inspect().active;
                    check(
                        sameValue(receiver, position === "constructor" ? obj(target) : obj(ctor)),
                        "P exact receiver",
                    );
                    check(
                        context.realm === getterRealm &&
                            active?.realm === getterRealm &&
                            active.record === entryRecord &&
                            active.strict === false &&
                            active.lexical.kind === "global" &&
                            active.lexical.record === entry.globalEnvironment &&
                            active.variable === active.lexical,
                        "P anchor never rewrites execution frame",
                    );
                    check(loc.line === 1 && loc.column === 17, "P supplied original coordinate");
                    if (mode === "host") {
                        evaluateScriptObserved(setup, nestedRecord);
                        throw new Error("unreachable");
                    }
                    if (mode === "reentry") {
                        let denied = false;
                        try {
                            evaluateScriptObserved(session, entryRecord);
                        } catch (error) {
                            if (!(error instanceof Error)) {
                                throw error;
                            }
                            denied = error.message === "Script session already active";
                        }
                        check(denied, "P09 owner reentry denied");
                    }
                    if (mode === "same") {
                        secondary = original;
                        return original;
                    }
                    if (mode === "resource") {
                        secondary = resourceFailure("steps", 101, 100, "P resource", loc);
                        return secondary;
                    }
                    if (mode === "species") {
                        return mapSpecies(getterRealm, context, loc);
                    }
                    if (mode === "unsupported") {
                        const failure = unsupportedRegExp(getterRealm, context, loc);
                        if (failure.type !== "throw") {
                            throw new Error("P unsupported");
                        }
                        secondary = failure;
                        return failure;
                    }
                    const failure: ThrowCompletion = {
                        type: "throw",
                        value: marker,
                        origin: { kind: "guest" },
                        diagnostic: {
                            phase: "runtime",
                            name: "Uncaught",
                            message: "P secondary",
                            loc,
                        },
                    };
                    secondary = failure;
                    return failure;
                };
                const inner = getterRealm.createBuiltin("inner", 0, body);
                const getter = wrapped
                    ? entry.createBuiltin("wrapper", 0, (receiver, args, context, loc) =>
                          context.call(obj(inner), receiver, args, loc),
                      )
                    : inner;
                if (position === "name") {
                    data(target, "constructor", obj(ctor));
                }
                (position === "constructor" ? target : ctor).bootstrapDefine(position, {
                    get: obj(getter),
                    configurable: true,
                });
                const beforeA = session.inspect().steps,
                    beforeB = setup.inspect().steps;
                if (mode === "host") {
                    let caught = false;
                    try {
                        evaluateScriptObserved(session, entryRecord);
                    } catch (error) {
                        if (!(error instanceof Error)) {
                            throw error;
                        }
                        check(error === host, "P07 exact host");
                        caught = true;
                    }
                    check(
                        caught &&
                            session.inspect().lastAbrupt?.record === originalRecord &&
                            session.inspect().lastAbrupt?.realm === other,
                        "P07 original history",
                    );
                } else {
                    const result = evaluateScriptObserved(session, entryRecord),
                        inspection = result.inspection;
                    check(
                        sameValue(abrupt(result).value, obj(target)) &&
                            result.source?.record === originalRecord &&
                            result.source.realm === other &&
                            result.source.loc.column === 17,
                        "P original identity",
                    );
                    if (mode === "same") {
                        check(
                            result.evaluation.completion === original,
                            "P06 original exact reused completion",
                        );
                    }
                    if (mode === "species") {
                        check(
                            inspection?.kind ===
                                (position === "constructor" ? "non-callable" : "non-string-name") &&
                                (inspection.kind !== "non-string-name" ||
                                    inspection.realm === third),
                            "P successful species inspection",
                        );
                    } else {
                        check(
                            inspection !== null &&
                                (inspection.kind === "abrupt" ||
                                    inspection.kind === "resource-limit" ||
                                    inspection.kind === "unsupported-operation"),
                            "P secondary arm",
                        );
                    }
                    if (
                        inspection !== null &&
                        (inspection.kind === "abrupt" ||
                            inspection.kind === "resource-limit" ||
                            inspection.kind === "unsupported-operation")
                    ) {
                        check(
                            inspection.completion === secondary &&
                                inspection.source.record === originalRecord &&
                                inspection.source.unitId === "original" &&
                                inspection.source.loc.line === 1 &&
                                inspection.source.loc.column === 17 &&
                                inspection.source.realm === getterRealm,
                            "P exact synthetic fallback identity",
                        );
                        let expectedKind: string;
                        if (mode === "resource") {
                            expectedKind = "resource-limit";
                        } else if (mode === "unsupported") {
                            expectedKind = "unsupported-operation";
                        } else {
                            expectedKind = "abrupt";
                        }
                        check(inspection.kind === expectedKind, "P outcome priority");
                    }
                    retained(session, result);
                }
                idle(session);
                idle(setup);
                check(
                    getterCalls === 1 &&
                        session.inspect().steps > beforeA &&
                        setup.inspect().steps >= beforeB,
                    "P monotonic budgets",
                );
                for (const selected of [session, setup]) {
                    const ordinary = run(selected, entry, "throw 1;", "ordinary-reuse");
                    check(
                        ordinary.type === "throw" &&
                            selected.inspect().lastAbrupt?.unitId === "ordinary-reuse",
                        "P ordinary no anchor leak",
                    );
                    const next = observe(selected, other, "throw 2;", "observed-reuse");
                    check(
                        next.source?.unitId === "observed-reuse" &&
                            next.source.realm === other &&
                            next.source.loc.column === 1 &&
                            next.inspection?.kind === "absent",
                        "P BOTH original sessions observed reuse",
                    );
                }
            }
        }
    }
}

// P03/P04: actual Script code suspends fallback even in the entry record.
// A builtin wrapper must not overwrite its first-captured guest source.
for (const seed of [0, 7]) {
    for (const position of ["constructor", "name"]) {
        for (const sameRecord of [false, true]) {
            for (const wrapped of [false, true]) {
                const entry = fresh(),
                    other = fresh(),
                    third = fresh(),
                    session = createScriptSession(),
                    setup = createScriptSession();
                if (seed) {
                    run(session, entry, ";;;;;;;", "seed-a");
                    run(setup, other, ";;;;;;;", "seed-b");
                }
                const target = new GuestObject(),
                    ctor = third.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
                const owner = sameRecord ? entry : third;
                define(owner, "marker", num(payload));
                define(other, "target", obj(target));
                const originalRecord = prepare(other, "function fail(){throw target;}", "original");
                check(
                    evaluateScript(setup, originalRecord).completion.type === "normal",
                    "P guest original setup",
                );
                define(entry, "fail", own(other.globalObject, "fail"));
                if (position === "name") {
                    data(target, "constructor", obj(ctor));
                }
                const install = (getter: Value): void => {
                    const selected = wrapped
                        ? obj(
                              other.createBuiltin("wrapper", 0, (receiver, args, context, loc) =>
                                  context.call(getter, receiver, args, loc),
                              ),
                          )
                        : getter;
                    (position === "constructor" ? target : ctor).bootstrapDefine(position, {
                        get: selected,
                        configurable: true,
                    });
                };
                define(
                    entry,
                    "install",
                    obj(
                        entry.createBuiltin("install", 1, (_r, args, _c, _l) => {
                            install(args[0]);
                            return normal();
                        }),
                    ),
                );
                let getterRecord: ExecutableScript;
                let entryRecord: ExecutableScript;
                if (sameRecord) {
                    entryRecord = prepare(
                        entry,
                        '"use strict"; function C(){throw marker;} install(C); fail();',
                        "entry",
                    );
                    getterRecord = entryRecord;
                } else {
                    getterRecord = prepare(
                        third,
                        '"use strict"; function C(){throw marker;}',
                        "getter",
                    );
                    check(
                        evaluateScript(setup, getterRecord).completion.type === "normal",
                        "P separate getter setup",
                    );
                    install(own(third.globalObject, "C"));
                    entryRecord = prepare(entry, "fail();", "entry");
                }
                const result = evaluateScriptObserved(session, entryRecord),
                    inspection = result.inspection;
                check(
                    inspection?.kind === "abrupt" &&
                        inspection.source.record === getterRecord &&
                        inspection.source.realm === owner &&
                        inspection.source.loc.line === 1 &&
                        inspection.source.loc.column === 28 &&
                        sameValue(inspection.completion.value, num(payload)),
                    "P03/P04 actual guest source wins",
                );
                check(
                    result.source?.record === originalRecord && result.source.realm === other,
                    "P03/P04 original intact",
                );
                retained(session, result);
                idle(session);
                idle(setup);
                check(
                    run(session, entry, ";", "reuse-a").type === "normal" &&
                        run(setup, other, ";", "reuse-b").type === "normal",
                    "P03/P04 both reuse",
                );
            }
        }
    }
}

for (const seed of [0, 7]) {
    for (const position of ["constructor", "name"]) {
        // P05: failure before dispatch keeps the entry Realm, not getter Realm.
        const entry = fresh(),
            third = fresh(),
            session = createScriptSession({ maxSteps: 100, maxCalls: 0 });
        if (seed) {
            run(session, entry, ";;;;;;;", "seed");
        }
        const target = new GuestObject(),
            ctor = third.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
        let calls = 0;
        if (position === "name") {
            data(target, "constructor", obj(ctor));
        }
        accessor(position === "constructor" ? target : ctor, position, third, (_r, _a, _c, _l) => {
            calls++;
            return normal();
        });
        define(entry, "target", obj(target));
        const result = observe(session, entry, "throw target;", "entry"),
            inspection = result.inspection;
        check(
            inspection?.kind === "resource-limit" &&
                inspection.source.realm === entry &&
                inspection.source.unitId === "entry" &&
                inspection.source.loc.column === 1 &&
                inspection.completion.origin.kind === "resource-limit" &&
                inspection.completion.origin.guardCode === "calls" &&
                inspection.completion.origin.count === 0 &&
                inspection.completion.origin.limit === 0 &&
                calls === 0 &&
                session.inspect().steps === seed + 2,
            "P05 predispatch source/count",
        );
        retained(session, result);
        check(run(session, entry, ";", "reuse").type === "normal", "P05 reuse");
    }
}

// P08: setup itself has genuine Script provenance before the first body tick.
for (const seed of [0, 7]) {
    for (const position of ["constructor", "name"]) {
        for (const limit of [2, 3, 4, 5]) {
            const entry = fresh(),
                third = fresh(),
                session = createScriptSession({ maxSteps: seed + limit, maxCalls: 2 }),
                setup = createScriptSession();
            if (seed) {
                run(session, entry, ";;;;;;;", "seed");
            }
            define(third, "marker", num(payload));
            const getterRecord = prepare(
                third,
                '"use strict"; function C(){throw marker;}',
                "getter",
            );
            check(
                evaluateScript(setup, getterRecord).completion.type === "normal",
                "P08 setup separate session",
            );
            const target = new GuestObject(),
                ctor = third.createBuiltin("ctor", 0, (_r, _a, _c, _l) => normal());
            if (position === "name") {
                data(target, "constructor", obj(ctor));
            }
            (position === "constructor" ? target : ctor).bootstrapDefine(position, {
                get: own(third.globalObject, "C"),
                configurable: true,
            });
            define(entry, "target", obj(target));
            const result = observe(session, entry, "throw target;", "entry"),
                inspection = result.inspection;
            check(
                inspection !== null &&
                    (inspection.kind === "resource-limit" || inspection.kind === "abrupt"),
                "P08 secondary",
            );
            if (
                inspection !== null &&
                (inspection.kind === "resource-limit" || inspection.kind === "abrupt")
            ) {
                check(
                    inspection.source.record === getterRecord &&
                        inspection.source.realm === third &&
                        inspection.source.loc.line === 1 &&
                        inspection.source.loc.column === [15, 28, 34, 28][limit - 2] &&
                        session.inspect().steps === seed + [3, 4, 5, 5][limit - 2],
                    "P08 literal setup/body prefixes",
                );
                check(inspection.kind === (limit < 5 ? "resource-limit" : "abrupt"), "P08 origin");
            }
            retained(session, result);
            check(
                run(session, entry, "", "exhausted-reuse").type === "normal" &&
                    run(setup, third, ";", "setup-reuse").type === "normal",
                "P08 BOTH immutable-limit sessions reuse",
            );
        }
    }
}
console.log(
    "PASS P01-P09 positions=2 seeds=2 synthetic=64 guest=16 call=4 prefixes=16 input=" + payload,
);

function boxedZero(result: ValueCompletion, realm: Realm): void {
    check(result.type === "normal" && result.value.kind === "object", "species normal object");
    if (result.type !== "normal" || result.value.kind !== "object") {
        throw new Error("species object");
    }
    const value = result.value.object;
    check(
        value instanceof GuestNumber &&
            value.numberData === 0 &&
            value.getPrototypeOf() === realm.numberPrototype &&
            value.getOwnProperty("length") === undefined,
        "Object species boxes zero without length",
    );
}
function unsupportedRegExp(
    realm: Realm,
    context: Parameters<Builtin>[2],
    loc: Parameters<Builtin>[3],
): ValueCompletion {
    if (context.construct === undefined) {
        throw new Error("construction unavailable");
    }
    const constructor = own(realm.globalObject, "RegExp");
    return context.construct(constructor, [str("a"), str("v")], constructor, loc);
}
