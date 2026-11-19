import type { ScriptClassInitializationEnvironment } from "../src/script-environment.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import {
    prepareStrictScript,
    type ExecutableScript,
    type ScriptGuestCallable,
} from "../src/script-record.js";
import {
    ScriptDeclarativeEnvironment,
    ScriptFunctionEnvironment,
    resolveScriptBinding,
    getScriptBinding,
    type ScriptEnvironment,
} from "../src/script-environment.js";
import { instantiateGlobalDeclarations } from "../src/script-global-declarations.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    resourceFailure,
    type Value,
    type ValueCompletion,
    type OperationContext,
    type ThrowCompletion,
} from "../src/runtime.js";
import type { GlobalEnvironment } from "../src/global-environment.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const loc = { line: 1, column: 1 };
const parts = readFileSync(process.argv[2], "utf8").trim().split("|");
const input: Value = { kind: "number", value: Number(parts[1]) };
function realm(): Realm {
    return new Realm((_s: string) => {
        throw new Error("output");
    }, "script");
}
function global(r: Realm): ScriptEnvironment {
    return { kind: "global", record: r.globalEnvironment };
}
function prepared(source: string, r: Realm): ExecutableScript {
    const p = prepareStrictScript({ id: "unit", text: source }, r);
    if (p.kind !== "ready") {
        throw new Error("prepare " + source);
    }
    return p.record;
}
class Budget {
    steps = 0;
    calls = 2;
    depth = 3;
    trace: number[] = [];
    abrupt: ThrowCompletion | null = null;
    readonly error = new Error("host sentinel");
    readonly context: OperationContext;
    mutate: Value[] | null = null;
    constructor(
        readonly realm: Realm,
        readonly limit = 1000,
        readonly host = false,
    ) {
        this.context = {
            realm: this.realm,
            call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => {
                throw new Error("invocation");
            },
            tick: (at: Location): ValueCompletion => {
                this.steps++;
                this.trace.push(at.column);
                check(at.line === 1, "line");
                if (this.mutate !== null) {
                    this.mutate[0] = UNDEFINED;
                    this.mutate.length = 1;
                }
                if (this.steps > this.limit) {
                    if (this.host) {
                        throw this.error;
                    }
                    this.abrupt = resourceFailure(
                        "steps",
                        this.steps,
                        this.limit,
                        "setup sentinel",
                        at,
                    );
                    return this.abrupt;
                }
                return normal();
            },
        };
    }
    saved(): void {
        check(
            this.calls === 2 && this.depth === 3 && this.context.realm === this.realm,
            "saved state",
        );
    }
}
function object(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object") {
        throw new Error("object");
    }
    return result.value.object;
}
function callable(fn: GuestObject): ScriptGuestCallable {
    if (fn.callable === null || fn.callable.kind !== "script-guest") {
        throw new Error("callable");
    }
    return fn.callable;
}
function prototype(fn: GuestObject): GuestObject {
    const d = fn.getOwnProperty("prototype");
    if (d === undefined || d.kind !== "data" || d.value.kind !== "object") {
        throw new Error("prototype");
    }
    return d.value.object;
}
function factory(
    r: ExecutableScript,
    scope: number,
    outer: ScriptEnvironment,
    b: Budget,
): ScriptGuestCallable {
    return callable(object(r.materializeFunction(scope, outer, null, b.context)));
}
function activation(
    r: ExecutableScript,
    c: ScriptGuestCallable,
    b: Budget,
    receiver: Value = UNDEFINED,
): ScriptFunctionEnvironment {
    const a = r.createFunctionEnvironment(c, receiver, b.context);
    if (a.type !== "normal") {
        throw new Error("activation");
    }
    return a.environment;
}
function block(
    r: ExecutableScript,
    scope: number,
    outer: ScriptEnvironment,
    b: Budget,
): ScriptDeclarativeEnvironment {
    const a = r.createBlockEnvironment(scope, outer, b.context);
    if (a.type !== "normal") {
        throw new Error("block");
    }
    return a.environment;
}
function value(
    context: OperationContext,
    e:
        | ScriptFunctionEnvironment
        | ScriptDeclarativeEnvironment
        | ScriptClassInitializationEnvironment
        | GlobalEnvironment,
    name: string,
): Value {
    const result = e.getBindingValue(name, context, loc);
    if (result.type !== "normal") {
        throw new Error("binding " + name);
    }
    return result.value;
}
function state(
    context: OperationContext,
    e:
        | ScriptFunctionEnvironment
        | ScriptDeclarativeEnvironment
        | ScriptClassInitializationEnvironment
        | GlobalEnvironment,
    name: string,
    expected: string,
    identity: Value = UNDEFINED,
): void {
    const present = e.hasBinding(name, loc);
    check(
        present.type === "normal" && present.value === (expected !== "absent"),
        "presence " + name + " " + expected,
    );
    if (expected === "absent") {
        return;
    }
    const result = e.getBindingValue(name, context, loc);
    if (expected === "tdz") {
        check(
            result.type === "throw" && result.diagnostic.name === "ReferenceError",
            "TDZ " + name,
        );
        return;
    }
    if (result.type !== "normal") {
        throw new Error("normal " + name);
    }
    if (expected === "value") {
        check(result.value === identity, "Value identity " + name);
    } else if (expected === "undefined") {
        check(result.value.kind === "undefined", "undefined " + name);
    } else {
        check(
            result.value.kind === "object" && result.value.object.callable?.kind === "script-guest",
            "real closure " + name,
        );
    }
}
function closure(
    context: OperationContext,
    e:
        | ScriptFunctionEnvironment
        | ScriptDeclarativeEnvironment
        | ScriptClassInitializationEnvironment
        | GlobalEnvironment,
    name: string,
    r: ExecutableScript,
    scope: number,
    outer: ScriptEnvironment,
): GuestObject {
    const v = value(context, e, name);
    if (v.kind !== "object") {
        throw new Error("closure object");
    }
    const c = callable(v.object);
    check(
        c.record === r &&
            c.realm === rRealm &&
            c.scopeId === scope &&
            c.environment === outer &&
            c.strict &&
            c.thisMode === "strict",
        "closure capture " + name,
    );
    const n = v.object.getOwnProperty("name"),
        len = v.object.getOwnProperty("length"),
        p = v.object.getOwnProperty("prototype"),
        back = prototype(v.object).getOwnProperty("constructor");
    check(
        n !== undefined &&
            n.kind === "data" &&
            n.value.kind === "string" &&
            n.value.value === name &&
            !n.writable &&
            !n.enumerable &&
            n.configurable,
        "name descriptor",
    );
    check(
        len !== undefined &&
            len.kind === "data" &&
            !len.writable &&
            !len.enumerable &&
            len.configurable &&
            p !== undefined &&
            p.kind === "data" &&
            p.writable &&
            !p.enumerable &&
            !p.configurable,
        "descriptors",
    );
    check(
        back !== undefined &&
            back.kind === "data" &&
            back.value.kind === "object" &&
            back.value.object === v.object &&
            back.writable &&
            !back.enumerable &&
            back.configurable,
        "backlink",
    );
    return v.object;
}
function invalid(action: () => void, b: Budget, r: ExecutableScript): void {
    const steps = b.steps,
        count = r.inspectMaterializations().completed;
    let caught = false;
    try {
        action();
    } catch (e) {
        if (e instanceof Error) {
            caught = true;
        }
    }
    check(
        caught && b.steps === steps && r.inspectMaterializations().completed === count,
        "invalid before effects",
    );
    b.saved();
}
function run(action: () => ValueCompletion, b: Budget, success: boolean): void {
    let result: ValueCompletion = normal(),
        caught = false;
    try {
        result = action();
    } catch (e) {
        if (e instanceof Error && e === b.error) {
            caught = true;
        } else {
            throw e;
        }
    }
    if (success) {
        check(!caught && result.type === "normal", "success");
    } else if (b.host) {
        check(caught, "host identity");
    } else {
        check(!caught && result.type === "throw" && result === b.abrupt, "abrupt identity");
        if (result.type !== "throw") {
            throw new Error("expected throw");
        }
        check(
            result.origin.kind === "resource-limit" &&
                result.origin.guardCode === "steps" &&
                result.origin.count === b.steps &&
                result.origin.limit === b.limit,
            "original resource origin",
        );
        check(
            result.diagnostic.loc.line === 1 &&
                result.diagnostic.loc.column === b.trace[b.steps - 1] &&
                result.diagnostic.phase === "runtime" &&
                result.diagnostic.message === "setup sentinel",
            "original diagnostic",
        );
    }
    b.saved();
}
const functionSource = '"use strict";function f(a,b){var a;var x;function g(){}let z;}';
const blockSource = '"use strict";{let x;function g(){}let y;}';
const globalSource = '"use strict"; let l; var x; function f(){}';
const functionTrace = [14, 51, 40, 34, 25, 27, 25, 27, 34, 40, 40, 40, 51, 51, 51, 60, 42, 51];
const blockTrace = [14, 19, 30, 21, 30, 39];
const globalTrace = [19, 26, 38, 38, 26, 26, 38, 19, 38, 29, 38, 26];
let rRealm = realm();
// Literal prefix states are independent of production plan traversal.
for (const host of [false, true]) {
    for (let limit = 0; limit <= 18; limit++) {
        const A = realm();
        rRealm = A;
        const R = prepared(functionSource, A),
            outer = global(A);
        const c = factory(R, 1, outer, new Budget(A));
        const b = new Budget(A, limit, host);
        let env: ScriptFunctionEnvironment | null = null;
        run(
            (): ValueCompletion => {
                const a = R.createFunctionEnvironment(c, { kind: "null" }, b.context);
                if (a.type === "throw") {
                    return a;
                }
                env = a.environment;
                return R.instantiateFunction(a.environment, [input], b.context);
            },
            b,
            limit === 18,
        );
        check(
            b.steps === Math.min(limit + 1, 18) &&
                b.trace.join() === functionTrace.slice(0, b.steps).join(),
            "function prefix trace",
        );
        check(
            R.inspectMaterializations().completed === (limit >= 17 ? 2 : 1),
            "function prefix allocation",
        );
        if (env !== null) {
            const e: ScriptFunctionEnvironment = env;
            check(
                e.outer === outer && e.callable === c && e.thisValue.kind === "null",
                "activation identity",
            );
            let expectedA: string;
            if (limit < 5) {
                expectedA = "absent";
            } else if (limit < 7) {
                expectedA = "tdz";
            } else {
                expectedA = "value";
            }
            state(b.context, e, "a", expectedA, input);
            let expectedB: string;
            if (limit < 6) {
                expectedB = "absent";
            } else if (limit < 8) {
                expectedB = "tdz";
            } else {
                expectedB = "undefined";
            }
            state(b.context, e, "b", expectedB);
            let expectedX: string;
            if (limit < 11) {
                expectedX = "absent";
            } else if (limit < 12) {
                expectedX = "tdz";
            } else {
                expectedX = "undefined";
            }
            state(b.context, e, "x", expectedX);
            let expectedG: string;
            if (limit < 14) {
                expectedG = "absent";
            } else if (limit < 15) {
                expectedG = "tdz";
            } else if (limit < 18) {
                expectedG = "undefined";
            } else {
                expectedG = "closure";
            }
            state(b.context, e, "g", expectedG);
            state(b.context, e, "z", limit < 16 ? "absent" : "tdz");
            state(b.context, e, "arguments", "absent");
            if (limit === 18) {
                closure(b.context, e, "g", R, 2, e);
            }
            invalid(
                () => {
                    R.instantiateFunction(e, [input], b.context);
                },
                b,
                R,
            );
        } else {
            check(limit === 0, "allocation failed only at A");
        }
    }
}
console.log("S01 P01 FUNCTION PASS");
for (const host of [false, true]) {
    for (let limit = 0; limit <= 6; limit++) {
        const A = realm();
        rRealm = A;
        const R = prepared(blockSource, A),
            outer = global(A),
            b = new Budget(A, limit, host);
        let env: ScriptDeclarativeEnvironment | null = null;
        run(
            (): ValueCompletion => {
                const a = R.createBlockEnvironment(1, outer, b.context);
                if (a.type === "throw") {
                    return a;
                }
                env = a.environment;
                return R.instantiateBlock(1, a.environment, b.context);
            },
            b,
            limit === 6,
        );
        check(
            b.steps === Math.min(limit + 1, 6) &&
                b.trace.join() === blockTrace.slice(0, b.steps).join(),
            "block trace",
        );
        check(R.inspectMaterializations().completed === (limit >= 4 ? 1 : 0), "block allocation");
        if (env !== null) {
            const e: ScriptDeclarativeEnvironment = env;
            check(e.outer === outer, "block outer");
            state(b.context, e, "x", limit < 2 ? "absent" : "tdz");
            let expectedG: string;
            if (limit < 3) {
                expectedG = "absent";
            } else if (limit < 5) {
                expectedG = "tdz";
            } else {
                expectedG = "closure";
            }
            state(b.context, e, "g", expectedG);
            state(b.context, e, "y", limit < 6 ? "absent" : "tdz");
            if (limit >= 5) {
                closure(b.context, e, "g", R, 2, e);
            }
            invalid(
                () => {
                    R.instantiateBlock(1, e, b.context);
                },
                b,
                R,
            );
        } else {
            check(limit === 0, "block A");
        }
    }
}
console.log("B01 P01 BLOCK PASS");
for (const host of [false, true]) {
    for (let limit = 0; limit <= 12; limit++) {
        const A = realm();
        rRealm = A;
        const R = prepared(globalSource, A),
            b = new Budget(A, limit, host),
            e = A.globalEnvironment;
        run(() => R.instantiateGlobals(e, b.context), b, limit === 12);
        check(
            b.steps === Math.min(limit + 1, 12) &&
                b.trace.join() === globalTrace.slice(0, b.steps).join(),
            "global trace",
        );
        state(b.context, e, "l", limit < 8 ? "absent" : "tdz");
        state(b.context, e, "f", limit < 11 ? "absent" : "closure");
        state(b.context, e, "x", limit < 12 ? "absent" : "undefined");
        check(R.inspectMaterializations().completed === (limit >= 10 ? 1 : 0), "global allocation");
        if (limit >= 11) {
            const f = value(b.context, e, "f");
            if (f.kind !== "object") {
                throw new Error("f");
            }
            const c = callable(f.object);
            check(
                c.environment.kind === "global" &&
                    c.environment.record === e &&
                    c.record === R &&
                    c.scopeId === 1,
                "global capture",
            );
            const descriptor = A.globalObject.getOwnProperty("f");
            check(
                descriptor !== undefined &&
                    descriptor.kind === "data" &&
                    descriptor.writable &&
                    descriptor.enumerable &&
                    !descriptor.configurable,
                "global function flags",
            );
        }
    }
}
console.log("G01 P01 GLOBAL PASS");
const A = realm();
rRealm = A;
const outer = global(A),
    R = prepared(functionSource, A),
    b = new Budget(A);
const c = factory(R, 1, outer, b),
    e = activation(R, c, b);
const numericBudget = new Budget(A),
    numericReceiver: Value = { kind: "number", value: 7 };
const numeric = activation(R, c, numericBudget, numericReceiver),
    eleven: Value = { kind: "number", value: 11 };
check(
    R.instantiateFunction(
        numeric,
        [input, eleven, { kind: "number", value: 99 }],
        numericBudget.context,
    ).type === "normal",
    "numeric extra arguments",
);
state(numericBudget.context, numeric, "a", "value", input);
state(numericBudget.context, numeric, "b", "value", eleven);
state(numericBudget.context, numeric, "arguments", "absent");
state(numericBudget.context, numeric, "99", "absent");
check(
    numeric.thisValue === numericReceiver && numericBudget.trace.join() === functionTrace.join(),
    "numeric receiver and eighteen ticks",
);
const second: Value = { kind: "object", object: new GuestObject(A.objectPrototype) };
const args = [input, second, { kind: "number", value: 99 } as Value];
const copied = new Budget(A);
copied.mutate = args;
check(R.instantiateFunction(e, args, copied.context).type === "normal", "copied setup");
check(
    value(b.context, e, "a") === input &&
        value(b.context, e, "b") === second &&
        args.length === 1 &&
        args[0] === UNDEFINED,
    "S02 copied arguments",
);
check(copied.trace.join() === functionTrace.slice(1).join(), "S02 trace");
state(b.context, e, "arguments", "absent");
state(b.context, e, "99", "absent");
const missing = activation(R, c, b);
check(R.instantiateFunction(missing, [], b.context).type === "normal", "all missing");
state(b.context, missing, "a", "undefined");
state(b.context, missing, "b", "undefined");
console.log("S02 PASS");
const collision = prepared(
    '"use strict";function f(a){var a;function a(){}function g(){}function a(){return 2;}}',
    A,
);
const ce = activation(collision, factory(collision, 1, outer, b), b);
const cb = new Budget(A);
check(collision.instantiateFunction(ce, [input], cb.context).type === "normal", "collision setup");
const ca = closure(b.context, ce, "a", collision, 4, ce);
closure(b.context, ce, "g", collision, 3, ce);
check(
    callable(ca).sourceText() === "function a(){return 2;}" &&
        collision.inspectMaterializations().completed === 3,
    "last winner only",
);
check(cb.trace.slice(-4).join() === "48,57,62,71", "winner source order g,a");
const duplicate = prepared('"use strict";function f(a){var a;var a;var x;var x;}', A);
const de = activation(duplicate, factory(duplicate, 1, outer, b), b);
const db = new Budget(A);
check(duplicate.instantiateFunction(de, [input], db.context).type === "normal", "duplicates");
state(db.context, de, "a", "value", input);
state(db.context, de, "x", "undefined");
check(db.steps === 12, "all var occurrences");
console.log("S03 S07 PASS");
const sibling = prepared('"use strict";function f(){function g(){}function h(){}}', A),
    sc = factory(sibling, 1, outer, b);
const s1 = activation(sibling, sc, b),
    s2 = activation(sibling, sc, b);
check(
    sibling.instantiateFunction(s1, [], b.context).type === "normal" &&
        sibling.instantiateFunction(s2, [], b.context).type === "normal",
    "sibling setups",
);
const g1 = closure(b.context, s1, "g", sibling, 2, s1),
    h1 = closure(b.context, s1, "h", sibling, 3, s1),
    g2 = closure(b.context, s2, "g", sibling, 2, s2),
    h2 = closure(b.context, s2, "h", sibling, 3, s2);
check(
    s1 !== s2 &&
        g1 !== g2 &&
        h1 !== h2 &&
        g1 !== h1 &&
        prototype(g1) !== prototype(g2) &&
        prototype(h1) !== prototype(h2),
    "fresh invocations",
);
// Closures keep the actual environment alive and see subsequent host binding changes.
s1.createMutableBinding("captured", loc);
s1.initializeBinding("captured", input, b.context, loc);
const capture = callable(g1).environment;
check(capture.kind !== "global" && value(b.context, capture, "captured") === input, "live capture");
const cross = activation(R, factory(R, 1, s1, b), b, second);
check(
    cross.outer === s1 &&
        cross.thisValue === second &&
        R.instantiateFunction(cross, [input], b.context).type === "normal",
    "same Realm cross-record outer",
);
console.log("S04 PASS");
for (const source of [
    '"use strict";function f(a){let a;}',
    '"use strict";function f(){var a;let a;}',
    '"use strict";function f(a,a){}',
]) {
    check(
        prepareStrictScript({ id: "bad", text: source }, A).kind !== "ready",
        "preparation collision",
    );
}
const fresh = activation(R, c, b),
    otherRecord = prepared(functionSource, A),
    foreign = realm();
invalid(
    () => {
        otherRecord.instantiateFunction(fresh, [], b.context);
    },
    b,
    otherRecord,
);
const wrongContext = new Budget(foreign);
invalid(
    () => {
        R.instantiateFunction(fresh, [], wrongContext.context);
    },
    wrongContext,
    R,
);
const base = new ScriptFunctionEnvironment(outer, UNDEFINED, c);
invalid(
    () => {
        R.instantiateFunction(base, [], b.context);
    },
    b,
    R,
);
const copy = new ScriptFunctionEnvironment(fresh.outer, fresh.thisValue, fresh.callable);
invalid(
    () => {
        R.instantiateFunction(copy, [], b.context);
    },
    b,
    R,
);
check(
    R.instantiateFunction(fresh, [], b.context).type === "normal",
    "invalid does not consume fresh phase",
);
invalid(
    () => {
        R.instantiateFunction(fresh, [], b.context);
    },
    b,
    R,
);
console.log("S06 PASS");
const blocks = prepared('"use strict";{let x;function g(){}let y;{function h(){}}}', A),
    bb = new Budget(A);
check(bb.steps === 0 && blocks.inspectMaterializations().completed === 0, "untaken projection");
const b1 = block(blocks, 1, outer, bb),
    b2 = block(blocks, 1, outer, bb);
const otherBlocks = prepared(blockSource, A);
invalid(
    () => {
        otherBlocks.instantiateBlock(1, b1, bb.context);
    },
    bb,
    otherBlocks,
);
for (const scope of [0, 2, 3, -1, 1.5, 99]) {
    invalid(
        () => {
            blocks.instantiateBlock(scope, b1, bb.context);
        },
        bb,
        blocks,
    );
}
invalid(
    () => {
        blocks.instantiateBlock(1, new ScriptDeclarativeEnvironment(outer), bb.context);
    },
    bb,
    blocks,
);
invalid(
    () => {
        blocks.createBlockEnvironment(1, global(foreign), bb.context);
    },
    bb,
    blocks,
);
check(
    blocks.instantiateBlock(1, b1, bb.context).type === "normal" &&
        blocks.instantiateBlock(1, b2, bb.context).type === "normal",
    "block entries",
);
const bg1 = closure(b.context, b1, "g", blocks, 2, b1),
    bg2 = closure(b.context, b2, "g", blocks, 2, b2);
const nested = block(blocks, 3, b1, bb);
check(blocks.instantiateBlock(3, nested, bb.context).type === "normal", "nested setup");
closure(b.context, nested, "h", blocks, 4, nested);
check(
    b1 !== b2 && bg1 !== bg2 && prototype(bg1) !== prototype(bg2) && nested.outer === b1,
    "block identities",
);
// Readonly is a TypeScript constraint, not a runtime ownership check. A hostile
// host can replace that public field with another valid same-Realm chain.
const originalOuter = new ScriptDeclarativeEnvironment(outer),
    replacementOuter = new ScriptDeclarativeEnvironment(outer);
originalOuter.createMutableBinding("captured", loc);
originalOuter.initializeBinding("captured", input, b.context, loc);
replacementOuter.createMutableBinding("captured", loc);
replacementOuter.initializeBinding("captured", second, b.context, loc);
const outerRecord = prepared('"use strict";{function g(){}}', A);
const originalBlock = block(outerRecord, 1, originalOuter, b),
    outerBudget = new Budget(A);
// @ts-expect-error Deliberate host mutation of the readonly public field.
originalBlock.outer = replacementOuter;
invalid(
    () => {
        outerRecord.instantiateBlock(1, originalBlock, outerBudget.context);
    },
    outerBudget,
    outerRecord,
);
check(
    outerBudget.steps === 0 && outerRecord.inspectMaterializations().completed === 0,
    "outer rejection has no setup effects",
);
state(b.context, originalBlock, "g", "absent");
state(b.context, originalOuter, "captured", "value", input);
state(b.context, replacementOuter, "captured", "value", second);
// @ts-expect-error Restore the original field to prove rejection kept phase fresh.
originalBlock.outer = originalOuter;
check(
    outerRecord.instantiateBlock(1, originalBlock, outerBudget.context).type === "normal" &&
        outerBudget.steps === 3,
    "restored outer succeeds from fresh phase",
);
const capturedFunction = closure(b.context, originalBlock, "g", outerRecord, 2, originalBlock);
const resolvedCapture = resolveScriptBinding(
    callable(capturedFunction).environment,
    "captured",
    loc,
);
if (resolvedCapture.type !== "normal") {
    throw new Error("capture reference");
}
check(resolvedCapture.reference.base === originalOuter, "closure original outer chain");
const capturedValue = getScriptBinding(resolvedCapture.reference, outerBudget.context);
check(
    capturedValue.type === "normal" &&
        capturedValue.value === input &&
        originalBlock.outer === originalOuter,
    "closure original binding",
);
console.log("B02 B03 PASS");
// The original D2 marker oracle remains exactly eleven ticks.
const markerRealm = realm(),
    marker = prepared(globalSource, markerRealm),
    mb = new Budget(markerRealm);
const markerObject = new GuestObject(markerRealm.objectPrototype);
check(
    instantiateGlobalDeclarations(
        marker.inspect(),
        markerRealm.globalEnvironment,
        mb.context,
        (_d, _f, _e, _u, _c): ValueCompletion => normal({ kind: "object", object: markerObject }),
    ).type === "normal",
    "marker",
);
check(
    mb.trace.join() === "19,26,38,38,26,26,38,19,38,38,26" &&
        marker.inspectMaterializations().completed === 0,
    "eleven marker ticks",
);
// Use a function-only record for repeat admission: a repeated let would fail earlier.
const gr = realm(),
    grRecord = prepared('"use strict";function f(){}', gr),
    gb = new Budget(gr);
check(
    grRecord.instantiateGlobals(gr.globalEnvironment, gb.context).type === "normal",
    "first globals",
);
const old = value(gb.context, gr.globalEnvironment, "f");
gr.globalObject.bootstrapDefine("f", { value: old, writable: false, configurable: false });
const before = grRecord.inspectMaterializations().completed;
check(
    grRecord.instantiateGlobals(gr.globalEnvironment, gb.context).type === "throw" &&
        value(gb.context, gr.globalEnvironment, "f") === old &&
        grRecord.inspectMaterializations().completed === before,
    "fresh admission",
);
const adapter = grRecord.createGlobalMaterializer(gr.globalEnvironment, gb.context),
    plan = grRecord.inspect(),
    d = plan.declarations[0],
    fn = plan.functions[0];
invalid(
    () => {
        adapter(d, fn, gr.globalEnvironment, plan.unit, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        adapter({ ...d }, fn, gr.globalEnvironment, plan.unit, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        adapter(d, { ...fn }, gr.globalEnvironment, plan.unit, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        adapter(d, fn, A.globalEnvironment, plan.unit, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        adapter(d, fn, gr.globalEnvironment, { id: "copy", text: plan.unit.text }, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        adapter(d, fn, gr.globalEnvironment, plan.unit, new Budget(gr).context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        grRecord.createGlobalMaterializer(A.globalEnvironment, gb.context);
    },
    gb,
    grRecord,
);
invalid(
    () => {
        grRecord.instantiateGlobals(gr.globalEnvironment, b.context);
    },
    b,
    grRecord,
);
const detached = grRecord.inspect();
(detached.unit as { text: string }).text = "wrong";
(detached.declarations[0].site as { name: string }).name = "wrong";
const cleanRealm = realm(),
    cleanRecord = prepared(globalSource, cleanRealm),
    cleanPlan = cleanRecord.inspect();
(cleanPlan.unit as { text: string }).text = "wrong";
(cleanPlan.functions[0] as { scope: number }).scope = 99;
const cleanBudget = new Budget(cleanRealm);
check(
    cleanRecord.instantiateGlobals(cleanRealm.globalEnvironment, cleanBudget.context).type ===
        "normal",
    "private originals",
);
state(cleanBudget.context, cleanRealm.globalEnvironment, "f", "closure");
const previous = value(cleanBudget.context, cleanRealm.globalEnvironment, "f");
cleanRealm.globalObject.bootstrapDefine("f", {
    value: previous,
    writable: false,
    configurable: false,
});
const repeat = new Budget(cleanRealm);
check(
    cleanRecord.instantiateGlobals(cleanRealm.globalEnvironment, repeat.context).type === "throw" &&
        repeat.trace.join() === "19" &&
        value(cleanBudget.context, cleanRealm.globalEnvironment, "f") === previous &&
        cleanRecord.inspectMaterializations().completed === 1,
    "G01 repeated lexical admission first",
);
console.log("G01 MARKER G02 G03 PASS");
// A private activation cannot be subclass-injected; P02 uses the reachable tick
// boundary (all prefixes above), not a claimed environment override test.
console.log("P02 TICK BOUNDARY PASS");
const mono = new Budget(A, 18),
    first = activation(R, c, mono);
check(R.instantiateFunction(first, [input], mono.context).type === "normal", "consume18");
const exhausted = R.createFunctionEnvironment(c, UNDEFINED, mono.context);
check(
    exhausted.type === "throw" && exhausted === mono.abrupt && mono.steps === 19,
    "monotonic next A",
);
mono.saved();
const independent = new Budget(A),
    independentEnv = activation(R, c, independent);
check(
    R.instantiateFunction(independentEnv, [input], independent.context).type === "normal" &&
        independent.steps === 18,
    "independent counter",
);
console.log("P03 PASS");
console.log("INPUT " + parts[0] + " " + parts[1] + " PASS");
