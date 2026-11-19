import { validatePropertyDescriptorUpdate } from "../src/runtime.js";
import type {
    DataDescriptor as InspectionDataDescriptor,
    PropertyDescriptor as InspectionDescriptor,
} from "../src/runtime.js";
function dataDescriptor(d: InspectionDescriptor | undefined): InspectionDataDescriptor | undefined {
    if (d !== undefined && d.kind !== "data") {
        throw new Error("expected data descriptor");
    }
    return d;
}
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { GuestArray } from "../src/array-object.js";
import {
    GuestBoolean,
    GuestNumber,
    GuestStringObject,
    GuestSymbolObject,
} from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { toNumber } from "../src/conversion.js";
import {
    GuestObject,
    Environment,
    UNDEFINED as U,
    normal,
    failure,
    sameValue,
    getValue,
    putValue,
    type Value,
    type Completion,
    type ValueCompletion,
    type ThrowCompletion,
    type InternalBooleanCompletion,
    type PropertyKey,
    type Builtin,
    type Reference,
    type OperationContext,
    type PropertyDescriptorUpdate,
} from "../src/runtime.js";
import type { Expr, Stmt, Location } from "../src/syntax.js";

function check(ok: boolean, name: string): void {
    if (!ok) {
        throw new Error("property-assignment " + name);
    }
}
function s(value: string): Value {
    return { kind: "string", value };
}
function n(value: number): Value {
    return { kind: "number", value };
}
function b(value: boolean): Value {
    return { kind: "boolean", value };
}
function o(object: GuestObject): Value {
    return { kind: "object", object };
}
function sym(value: GuestSymbol): Value {
    return { kind: "symbol", value };
}
const nil: Value = { kind: "null" };
const loc: Location = { line: 1, column: 1 };
const refLoc: Location = { line: 7, column: 9 };
const opLoc: Location = { line: 8, column: 4 };
const nullish = "cannot convert null or undefined to object";
const Q: ThrowCompletion = failure("ReferenceError", "sentinel", refLoc);
Q.value = o(new GuestObject());
const F = new Error("host sentinel");
const s1 = new GuestSymbol("x");
const s2 = new GuestSymbol("x");
const primitives: Value[] = [b(true), n(3), s("ab"), sym(s1)];
function bind(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) {
        throw new Error("missing binding " + name);
    }
    return entry.value;
}
function seed(target: GuestObject, key: PropertyKey, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function fn(realm: Realm, body: Builtin): Value {
    return o(realm.createBuiltin("hook", 0, body));
}
function statement(source: string): Stmt {
    const parsed = parse(source);
    check(parsed.error === null && parsed.body.length === 1, "parse " + source);
    return parsed.body[0];
}
function expression(source: string): Expr {
    const stmt = statement(source);
    if (stmt.kind !== "expression") {
        throw new Error("expected expression");
    }
    return stmt.expression;
}
function run(e: Evaluator, source: string): Completion {
    return e.statement(statement(source), e.context.realm.global, U);
}
function program(e: Evaluator, source: string): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "program parse");
    return e.block(parsed.body, e.context.realm.global, U);
}
function expect(result: Completion, value: Value, name: string): void {
    check(result.type === "normal" && sameValue(result.value, value), name);
}
function error(
    result: Completion,
    message: string,
    name: string,
    at: Location = opLoc,
    kind = "TypeError",
): void {
    check(
        result.type === "throw" &&
            result.diagnostic.phase === "runtime" &&
            result.diagnostic.name === kind &&
            result.diagnostic.message === message &&
            result.diagnostic.loc.line === at.line &&
            result.diagnostic.loc.column === at.column,
        name,
    );
}
function exact(result: Completion | InternalBooleanCompletion, name: string): void {
    check(
        result === Q &&
            result.value === Q.value &&
            result.type === "throw" &&
            result.diagnostic === Q.diagnostic,
        name,
    );
}
function clean(e: Evaluator, realm: Realm, name: string, calls = 0, depth = 0): void {
    check(e.calls === calls && e.depth === depth && e.context.realm === realm, name + " cleanup");
}
function reference(base: Value, key: Value = s("x")): Reference {
    return { kind: "property", base, key, loc: refLoc };
}
function saved(ref: Reference, base: Value, key: Value, name: string): void {
    check(
        ref.kind === "property" && ref.base === base && sameValue(ref.key, key),
        name + " captured base/key",
    );
}
function descriptor(
    target: GuestObject,
    key: PropertyKey,
    value: Value,
    writable: boolean,
    enumerable: boolean,
    configurable: boolean,
    name: string,
): void {
    const d = target.getOwnProperty(key);
    check(
        d !== undefined &&
            d.kind === "data" &&
            sameValue(d.value, value) &&
            d.writable === writable &&
            d.enumerable === enumerable &&
            d.configurable === configurable,
        name,
    );
}
function prototype(realm: Realm, value: Value): GuestObject {
    switch (value.kind) {
        case "boolean":
            return realm.booleanPrototype;
        case "number":
            return realm.numberPrototype;
        case "string":
            return realm.stringPrototype;
        case "symbol":
            return realm.symbolPrototype;
        default:
            throw new Error("expected primitive");
    }
}
class Measured extends Evaluator {
    peak = 0;
    invocations = 0;
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        this.peak = Math.max(this.peak, this.depth + 1);
        return super.evaluate(expr, env, receiver, allowUnresolvable);
    }
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        if (this.calls < this.maxCalls) {
            this.invocations++;
        }
        return super.call(callee, receiver, args, at);
    }
}
// Each factory returns a real primitive wrapper. Instrument its top-level Set,
// not a prototype override (ordinary descriptor traversal does not call those).
class Observation {
    trace = "";
    boxes: GuestObject[] = [];
    factories: string[] = [];
    sets = 0;
    keys: PropertyKey[] = [];
    definitions = 0;
    reads = 0;
    receiver: Value = U;
    at: Location = loc;
    context: OperationContext | null = null;
    setMode = "success";
    factoryFault = false;
    held: Reference | null = null;
    expectedKey: Value = s("x");
    beforeSet(receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.trace += "S";
        this.sets++;
        this.receiver = receiver;
        this.context = context;
        this.at = at;
        if (this.held !== null) {
            saved(this.held, receiver, this.expectedKey, "cache before dispatch");
        }
        if (this.setMode === "fault") {
            throw F;
        }
        if (this.setMode === "abrupt") {
            return Q;
        }
        return { type: "normal", value: this.setMode !== "false" };
    }
}
class BooleanBox extends GuestBoolean {
    constructor(
        value: boolean,
        proto: GuestObject,
        public observation: Observation,
    ) {
        super(value, proto);
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        this.observation.keys.push(key);
        const observed = this.observation.beforeSet(receiver, context, at);
        if (observed.type === "throw" || !observed.value) {
            return observed;
        }
        return super.internalSet(key, value, receiver, context, at);
    }
    defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.observation.definitions++;
        return super.defineOwnProperty(key, desc, context, at);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        this.observation.reads++;
        return super.internalGet(key, receiver, context, at);
    }
}
class NumberBox extends GuestNumber {
    constructor(
        value: number,
        proto: GuestObject,
        public observation: Observation,
    ) {
        super(value, proto);
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        this.observation.keys.push(key);
        const observed = this.observation.beforeSet(receiver, context, at);
        if (observed.type === "throw" || !observed.value) {
            return observed;
        }
        return super.internalSet(key, value, receiver, context, at);
    }
    defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.observation.definitions++;
        return super.defineOwnProperty(key, desc, context, at);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        this.observation.reads++;
        return super.internalGet(key, receiver, context, at);
    }
}
class StringBox extends GuestStringObject {
    constructor(
        value: string,
        proto: GuestObject,
        public observation: Observation,
    ) {
        super(value, proto);
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        this.observation.keys.push(key);
        const observed = this.observation.beforeSet(receiver, context, at);
        if (observed.type === "throw" || !observed.value) {
            return observed;
        }
        return super.internalSet(key, value, receiver, context, at);
    }
    defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.observation.definitions++;
        return super.defineOwnProperty(key, desc, context, at);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        this.observation.reads++;
        return super.internalGet(key, receiver, context, at);
    }
}
class SymbolBox extends GuestSymbolObject {
    constructor(
        value: GuestSymbol,
        proto: GuestObject,
        public observation: Observation,
    ) {
        super(value, proto);
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        this.observation.keys.push(key);
        const observed = this.observation.beforeSet(receiver, context, at);
        if (observed.type === "throw" || !observed.value) {
            return observed;
        }
        return super.internalSet(key, value, receiver, context, at);
    }
    defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.observation.definitions++;
        return super.defineOwnProperty(key, desc, context, at);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        this.observation.reads++;
        return super.internalGet(key, receiver, context, at);
    }
}
class ObservedRealm extends Realm {
    observation = new Observation();
    constructor() {
        super((_line) => {});
    }
    record(box: GuestObject, kind: string): void {
        this.observation.trace += "O";
        if (this.observation.factoryFault) {
            throw F;
        }
        this.observation.boxes.push(box);
        this.observation.factories.push(kind);
    }
    createBooleanObject(value: boolean): GuestBoolean {
        const box = new BooleanBox(value, this.booleanPrototype, this.observation);
        this.record(box, "boolean");
        return box;
    }
    createNumberObject(value: number): GuestNumber {
        const box = new NumberBox(value, this.numberPrototype, this.observation);
        this.record(box, "number");
        return box;
    }
    createStringObject(value: string): GuestStringObject {
        const box = new StringBox(value, this.stringPrototype, this.observation);
        this.record(box, "string");
        return box;
    }
    createSymbolObject(value: GuestSymbol): GuestSymbolObject {
        const box = new SymbolBox(value, this.symbolPrototype, this.observation);
        this.record(box, "symbol");
        return box;
    }
}
class Target extends GuestObject {
    definitionMode = "success";
    constructor(public observation: Observation) {
        super();
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        this.observation.keys.push(key);
        const observed = this.observation.beforeSet(receiver, context, at);
        if (observed.type === "throw" || !observed.value) {
            return observed;
        }
        return super.internalSet(key, value, receiver, context, at);
    }
    internalGet(
        _key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        this.observation.reads++;
        throw F;
    }
    defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        at: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.observation.definitions++;
        if (this.definitionMode === "false") {
            return { type: "normal", value: false };
        }
        if (this.definitionMode === "abrupt") {
            return Q;
        }
        return super.defineOwnProperty(key, desc, context, at);
    }
}
class Key extends GuestObject {
    mode = "success";
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        if (this.mode === "fault") {
            throw F;
        }
        if (this.mode === "abrupt") {
            return Q;
        }
        return super.internalGet(key, receiver, context, at);
    }
}
function slot(box: GuestObject): Value {
    if (box instanceof GuestBoolean) {
        return b(box.booleanData);
    }
    if (box instanceof GuestNumber) {
        return n(box.numberData);
    }
    if (box instanceof GuestStringObject) {
        return s(box.stringData);
    }
    if (box instanceof GuestSymbolObject) {
        return sym(box.symbolData);
    }
    throw new Error("expected wrapper");
}
function primitiveState(realm: ObservedRealm, base: Value, name: string): void {
    const observation = realm.observation;
    check(
        observation.boxes.length === 1 && observation.factories[0] === base.kind,
        name + " factory",
    );
    check(
        observation.receiver === base &&
            observation.sets === 1 &&
            observation.definitions === 0 &&
            observation.reads === 0,
        name + " Receiver/dispatch",
    );
    const box = observation.boxes[0];
    check(
        sameValue(slot(box), base) && box.getPrototypeOf() === prototype(realm, base),
        name + " slot/prototype",
    );
    check(
        box.ownPropertyKeys().length === (base.kind === "string" ? base.value.length + 1 : 0),
        name + " no additions",
    );
}

// A captured source reference is exposed only through the evaluator's existing
// reference API. No production observer or extra semantic read is introduced.
class Capturing extends Measured {
    held: Reference | null = null;
    reference(
        expr: Expr,
        env: Environment,
        receiver: Value,
    ): import("../src/runtime.js").ReferenceResult {
        const result = super.reference(expr, env, receiver);
        if (result.type === "reference" && result.reference.kind === "property") {
            this.held = result.reference;
        }
        return result;
    }
}
class Scenario {
    realm = new ObservedRealm();
    e = new Capturing(this.realm);
    key = new Key();
    keyValue = o(this.key);
    target = new Target(this.realm.observation);
    base: Value = b(true);
    rhs = o(new GuestObject());
    hooks = 0;
    stop = "";
    hookMode = "success";
    constructor() {
        bind(this.realm, "selectedBase", this.base);
        bind(this.realm, "selectedKey", this.keyValue);
        seed(
            this.key,
            wellKnownToPrimitive,
            fn(this.realm, (receiver, args, _context, _at): Completion => {
                this.hooks++;
                this.realm.observation.trace += "C";
                check(
                    receiver === this.keyValue &&
                        args.length === 1 &&
                        sameValue(args[0], s("string")),
                    "E canonical receiver/hint",
                );
                if (this.hookMode === "fault") {
                    throw F;
                }
                if (this.hookMode === "abrupt") {
                    return Q;
                }
                return normal(s("x"));
            }),
        );
        bind(
            this.realm,
            "base",
            fn(this.realm, (_r, _a, _c, _l) => {
                this.realm.observation.trace += "B";
                return this.stop === "B" ? Q : normal(binding(this.realm, "selectedBase"));
            }),
        );
        bind(
            this.realm,
            "key",
            fn(this.realm, (_r, _a, _c, _l) => {
                this.realm.observation.trace += "K";
                return this.stop === "K" ? Q : normal(binding(this.realm, "selectedKey"));
            }),
        );
        bind(
            this.realm,
            "rhs",
            fn(this.realm, (_r, _a, _c, _l) => {
                this.realm.observation.trace += "R";
                if (this.stop === "R") {
                    return Q;
                }
                if (this.stop === "replaceBase") {
                    bind(this.realm, "selectedBase", o(this.target));
                }
                if (this.stop === "replaceKey") {
                    bind(this.realm, "selectedKey", s("y"));
                }
                if (this.stop === "replaceMethod") {
                    seed(
                        this.key,
                        wellKnownToPrimitive,
                        fn(this.realm, (_rr, _aa, _cc, _ll) => {
                            this.realm.observation.trace += "Y";
                            return normal(s("y"));
                        }),
                    );
                }
                return normal(this.rhs);
            }),
        );
    }
    select(base: Value): void {
        this.base = base;
        bind(this.realm, "selectedBase", base);
    }
    run(): Completion {
        return run(this.e, "base()[key()] = rhs();");
    }
}

const orderRows = [
    { name: "E1 PrimitiveOrder", mode: "primitive", trace: "BKROCS", outcome: "false" },
    { name: "E2 ObjectOrder", mode: "object", trace: "BKRCS", outcome: "success" },
    { name: "E3 BaseAbrupt", mode: "B", trace: "B", outcome: "abrupt" },
    { name: "E4 KeyExpressionAbrupt", mode: "K", trace: "BK", outcome: "abrupt" },
    { name: "E8 KeyAbrupt", mode: "keyAbrupt", trace: "BKROC", outcome: "abrupt" },
    { name: "E9 KeyHostFault", mode: "keyFault", trace: "BKROC", outcome: "fault" },
    { name: "E10 SetAbrupt", mode: "setAbrupt", trace: "BKROCS", outcome: "abrupt" },
    { name: "E11 SetHostFault", mode: "setFault", trace: "BKROCS", outcome: "fault" },
    { name: "E12 FactoryFault", mode: "factoryFault", trace: "BKRO", outcome: "fault" },
    { name: "E13 KeyLookupFault", mode: "lookupFault", trace: "BKRO", outcome: "fault" },
    { name: "E14 KeyLookupAbrupt", mode: "lookupAbrupt", trace: "BKRO", outcome: "abrupt" },
    { name: "E15 RHSChangesKeyMethod", mode: "replaceMethod", trace: "BKROYS", outcome: "y" },
    { name: "E16 RHSRebindsBase", mode: "replaceBase", trace: "BKROCS", outcome: "false" },
    { name: "E17 RHSRebindsKey", mode: "replaceKey", trace: "BKROCS", outcome: "false" },
];
for (const row of orderRows) {
    const scenario = new Scenario();
    scenario.stop = row.mode;
    if (row.mode === "object") {
        scenario.select(o(scenario.target));
    }
    if (row.mode === "keyAbrupt") {
        scenario.hookMode = "abrupt";
    }
    if (row.mode === "keyFault") {
        scenario.hookMode = "fault";
    }
    if (row.mode === "setAbrupt") {
        scenario.realm.observation.setMode = "abrupt";
    }
    if (row.mode === "setFault") {
        scenario.realm.observation.setMode = "fault";
    }
    if (row.mode === "factoryFault") {
        scenario.realm.observation.factoryFault = true;
    }
    if (row.mode === "lookupFault") {
        scenario.key.mode = "fault";
    }
    if (row.mode === "lookupAbrupt") {
        scenario.key.mode = "abrupt";
    }
    let result: Completion = normal();
    let escaped = false;

    try {
        result = scenario.run();
    } catch (fault) {
        escaped = fault instanceof Error && fault === F;
    }

    check(scenario.realm.observation.trace === row.trace, row.name + " exact trace");
    check(escaped === (row.outcome === "fault"), row.name + " F identity");
    if (row.outcome === "abrupt") {
        exact(result, row.name);
    }
    if (row.outcome === "false" || row.outcome === "y") {
        error(
            result,
            row.outcome === "y" ? "property is not writable: y" : "property is not writable: x",
            row.name,
            loc,
        );
    }
    if (row.outcome === "success") {
        expect(result, scenario.rhs, row.name);
        descriptor(scenario.target, "x", scenario.rhs, true, true, true, row.name + " assigned");
    }
    const held = scenario.e.held;
    if (held !== null) {
        const key = row.trace.endsWith("S")
            ? s(row.outcome === "y" ? "y" : "x")
            : scenario.keyValue;
        saved(held, scenario.base, key, row.name);
    }
    if (row.mode === "replaceBase") {
        check(
            scenario.target.ownPropertyKeys().length === 0 &&
                binding(scenario.realm, "selectedBase").kind === "object",
            row.name + " actual rebinding",
        );
    }
    if (row.mode === "replaceKey") {
        check(
            sameValue(binding(scenario.realm, "selectedKey"), s("y")),
            row.name + " actual rebinding",
        );
    }
    check(scenario.realm.observation.reads === 0, row.name + " no target Get");
    if (row.mode !== "object") {
        check(scenario.realm.observation.definitions === 0, row.name + " no definition");
    }
    clean(scenario.e, scenario.realm, row.name);
}
for (const base of [...primitives, nil, U, o(new GuestObject())]) {
    const scenario = new Scenario();
    scenario.select(base);
    scenario.stop = "R";

    const result = scenario.run();

    exact(result, "E5 RHSAbrupt");
    check(
        scenario.realm.observation.trace === "BKR" && scenario.hooks === 0,
        "E5 no boxing/conversion/Set",
    );
    clean(scenario.e, scenario.realm, "E5");
}
for (const base of [nil, U]) {
    for (const mode of ["success", "abrupt", "fault"]) {
        const scenario = new Scenario();
        scenario.select(base);
        scenario.hookMode = mode;

        const result = scenario.run();

        error(result, nullish, "E6 NullishOrder / E7 NullishCompetingKey", loc);
        check(
            scenario.realm.observation.trace === "BKR" && scenario.hooks === 0,
            "E6/E7 no key call",
        );
        clean(scenario.e, scenario.realm, "E6/E7");
    }
}

// E18-E23/E38: distinguish explicit hook/RHS effects from assignment writes.
for (const name of [
    "E18 RHSChangesPrototype",
    "E19 HookUnlocksTarget",
    "E20 HookClosesTarget",
    "E21 HookMutatesRHS",
    "E22 BaseNotCoerced",
    "E23 RHSNotCoerced",
    "E38 NoTargetRead",
]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target = new Target(realm.observation);
    const base = o(target);
    const rhsObject = new GuestObject();
    const rhs = o(rhsObject);
    const key = new GuestObject();
    const parent = new GuestObject();
    parent.bootstrapDefine("x", { value: n(1) });
    seed(rhsObject, "m", n(1));
    bind(realm, "r", rhs);
    if (name === "E19 HookUnlocksTarget") {
        target.bootstrapDefine("x", { value: n(1), configurable: true });
    }
    seed(
        key,
        wellKnownToPrimitive,
        fn(realm, (_r, _a, _c, _l) => {
            if (name === "E19 HookUnlocksTarget") {
                target.bootstrapDefine("x", { writable: true });
            }
            if (name === "E20 HookClosesTarget") {
                target.preventExtensions();
            }
            if (name === "E21 HookMutatesRHS") {
                seed(rhsObject, "m", n(2));
                bind(realm, "r", o(new GuestObject()));
            }
            return normal(s("x"));
        }),
    );
    let forbidden = 0;
    const trap = fn(realm, (_r, _a, _c, _l): Completion => {
        forbidden++;
        throw F;
    });
    for (const keyName of [wellKnownToPrimitive, "toString", "valueOf"]) {
        if (name === "E22 BaseNotCoerced") {
            seed(target, keyName, trap);
        }
        if (name === "E23 RHSNotCoerced") {
            seed(rhsObject, keyName, trap);
        }
    }
    bind(realm, "p", base);
    bind(realm, "k", o(key));
    bind(
        realm,
        "rhs",
        fn(realm, (_r, _a, _c, _l) => {
            target.setPrototypeOf(parent);
            return normal(rhs);
        }),
    );

    const result =
        name === "E18 RHSChangesPrototype"
            ? run(e, "p[k] = rhs();")
            : putValue(reference(base, o(key)), rhs, e.context, opLoc);

    if (name === "E18 RHSChangesPrototype" || name === "E20 HookClosesTarget") {
        error(
            result,
            "property is not writable: x",
            name,
            name === "E18 RHSChangesPrototype" ? loc : opLoc,
        );
        check(target.getOwnProperty("x") === undefined, name + " absent");
    } else {
        expect(result, rhs, name);
        descriptor(
            target,
            "x",
            rhs,
            true,
            name !== "E19 HookUnlocksTarget",
            true,
            name + " descriptor",
        );
    }
    if (name === "E18 RHSChangesPrototype") {
        descriptor(parent, "x", n(1), false, false, false, name + " parent");
    }
    if (name === "E20 HookClosesTarget") {
        check(!target.isExtensible(), name + " closed");
    }
    if (name === "E21 HookMutatesRHS") {
        check(
            sameValue(rhsObject.get("m", e.context, loc), n(2)) &&
                binding(realm, "r") !== rhs &&
                result.value === rhs,
            name + " mutation/identity",
        );
    }
    check(
        forbidden === 0 && realm.observation.reads === 0 && realm.observation.boxes.length === 0,
        name + " no coercion/Get/box",
    );
}

const conversionRows = [
    {
        name: "E25 CanonicalNoncallable",
        mode: "noncallable",
        trace: "",
        message: "symbol toPrimitive method is not callable",
    },
    {
        name: "E26 CanonicalObject",
        mode: "object",
        trace: "C",
        message: "cannot convert object to primitive",
    },
    {
        name: "E27 OrdinaryFirst undefined",
        mode: "undefined",
        trace: "T",
        message: "property is not writable: x",
    },
    {
        name: "E27 OrdinaryFirst null",
        mode: "null",
        trace: "T",
        message: "property is not writable: x",
    },
    {
        name: "E28 OrdinarySecond",
        mode: "second",
        trace: "TV",
        message: "property is not writable: x",
    },
    { name: "E29 OrdinarySkip", mode: "skip", trace: "V", message: "property is not writable: x" },
    {
        name: "E30 OrdinaryFailure",
        mode: "failure",
        trace: "TV",
        message: "cannot convert object to primitive",
    },
];
for (const row of conversionRows) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const key = new GuestObject();
    let trace = "";
    seed(
        key,
        wellKnownToPrimitive,
        row.mode === "noncallable" ? n(1) : row.mode === "null" ? nil : U,
    );
    if (row.mode === "object") {
        seed(
            key,
            wellKnownToPrimitive,
            fn(realm, (_r, _a, _c, _l) => {
                trace += "C";
                return normal(o(key));
            }),
        );
    }
    seed(
        key,
        "toString",
        row.mode === "skip"
            ? n(1)
            : fn(realm, (_r, _a, _c, _l) => {
                  trace += "T";
                  return normal(row.mode === "second" || row.mode === "failure" ? o(key) : s("x"));
              }),
    );
    seed(
        key,
        "valueOf",
        fn(realm, (_r, _a, _c, _l) => {
            trace += "V";
            return normal(row.mode === "failure" ? o(key) : s("x"));
        }),
    );
    const base = b(true);
    const ref = reference(base, o(key));

    const result = putValue(ref, o(new GuestObject()), e.context, opLoc);

    const converted = row.message === "property is not writable: x";
    error(result, row.message, row.name, converted ? opLoc : refLoc);
    check(
        trace === row.trace && realm.observation.sets === (converted ? 1 : 0),
        row.name + " trace/Set",
    );
    saved(ref, base, converted ? s("x") : o(key), row.name);
}
for (const stage of ["T", "V"]) {
    for (const faultMode of [false, true]) {
        const realm = new ObservedRealm();
        const e = new Evaluator(realm);
        const key = new GuestObject();
        const base = b(true);
        const raw = o(key);
        const ref = reference(base, raw);
        let trace = "";
        for (const method of ["T", "V"]) {
            seed(
                key,
                method === "T" ? "toString" : "valueOf",
                fn(realm, (_r, _a, _c, _l): Completion => {
                    trace += method;
                    if (method === stage) {
                        if (faultMode) {
                            throw F;
                        }
                        return Q;
                    }
                    return normal(raw);
                }),
            );
        }
        let result: Completion = normal();
        let escaped = false;

        try {
            result = putValue(ref, n(7), e.context, opLoc);
        } catch (fault) {
            escaped = fault instanceof Error && fault === F;
        }

        if (faultMode) {
            check(escaped, "E31 OrdinaryAbrupt F");
        } else {
            exact(result, "E31 OrdinaryAbrupt Q");
        }
        check(
            trace === (stage === "T" ? "T" : "TV") && realm.observation.sets === 0,
            "E31 trace/no Set",
        );
        saved(ref, base, raw, "E31 raw key");
        clean(e, realm, "E31");
    }
}
for (const primitive of [false, true]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target = new GuestObject();
    const base = primitive ? b(true) : o(target);
    const key = new GuestObject();
    const rhs = o(new GuestObject());
    seed(
        key,
        wellKnownToPrimitive,
        fn(realm, (_r, _a, _c, _l) => normal(sym(s1))),
    );
    const ref = reference(base, o(key));

    const result = putValue(ref, rhs, e.context, opLoc);

    if (primitive) {
        error(result, "property is not writable: Symbol(x)", "E24 CanonicalSymbol");
    } else {
        expect(result, rhs, "E24 CanonicalSymbol");
        descriptor(target, s1, rhs, true, true, true, "E24 symbol property");
    }
    saved(ref, base, sym(s1), "E24 saved identity");
    check(target.getOwnProperty(s2) === undefined, "E24 distinct symbols");
}
const spellingRows: { name: string; key: Value; expected: string }[] = [
    { name: "E32 PrimitiveKeySpelling undefined", key: U, expected: "undefined" },
    { name: "E32 PrimitiveKeySpelling null", key: nil, expected: "null" },
    { name: "E32 PrimitiveKeySpelling true", key: b(true), expected: "true" },
    { name: "E32 PrimitiveKeySpelling false", key: b(false), expected: "false" },
    { name: "E32 PrimitiveKeySpelling minus zero", key: n(-0), expected: "0" },
    { name: "E32 PrimitiveKeySpelling NaN", key: n(NaN), expected: "NaN" },
    { name: "E32 PrimitiveKeySpelling infinity", key: n(Infinity), expected: "Infinity" },
    {
        name: "E32 PrimitiveKeySpelling negative infinity",
        key: n(-Infinity),
        expected: "-Infinity",
    },
    { name: "E33 EmptyAndUTF16Key empty", key: s(""), expected: "" },
    { name: "E33 EmptyAndUTF16Key UTF16", key: s("a\0\ud800"), expected: "a\0\ud800" },
];
for (const row of spellingRows) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target = new GuestObject();
    const base = o(target);
    const rhs = o(new GuestObject());
    const ref = reference(base, row.key);

    const result = putValue(ref, rhs, e.context, opLoc);

    expect(result, rhs, row.name);
    descriptor(target, row.expected, rhs, true, true, true, row.name + " exact key");
    saved(ref, base, s(row.expected), row.name);
    check(e.steps === 0 && realm.observation.trace === "", row.name + " no hooks/box");
}
for (const stage of [0, 1, 2]) {
    for (const faultMode of [false, true]) {
        const realm = new ObservedRealm();
        const e = new Evaluator(realm);
        const target = array();
        if (stage === 0) {
            target.bootstrapDefine("length", { writable: false });
        }
        const base = o(target);
        const key = new GuestObject();
        seed(
            key,
            wellKnownToPrimitive,
            fn(realm, (_r, _a, _c, _l) => normal(s("length"))),
        );
        const ref = reference(base, o(key));
        const rhs = new GuestObject();
        let calls = 0;
        seed(
            rhs,
            wellKnownToPrimitive,
            fn(realm, (_r, _a, _c, _l): Completion => {
                calls++;
                saved(ref, base, s("length"), "E35 saved before RHS");
                seed(target, "effect", n(calls));
                if (calls === stage || stage === 0) {
                    if (faultMode) {
                        throw F;
                    }
                    return Q;
                }
                return normal(n(2));
            }),
        );
        let result: Completion = normal();
        let escaped = false;

        try {
            result = putValue(ref, o(rhs), e.context, opLoc);
        } catch (fault) {
            escaped = fault instanceof Error && fault === F;
        }

        if (stage === 0) {
            error(result, "property is not writable: length", "E34 FrozenArrayRHS");
        } else if (faultMode) {
            check(escaped, "E35 ArrayRHSFailure F");
        } else {
            exact(result, "E35 ArrayRHSFailure Q");
        }
        check(
            calls === stage && sameValue(target.get("length", e.context, loc), n(3)),
            "E34/E35 calls/length",
        );
        if (stage > 0) {
            check(
                sameValue(target.get("effect", e.context, loc), n(stage)),
                "E35 retained mutation",
            );
        }
        saved(ref, base, s("length"), "E34/E35 cache");
        clean(e, realm, "E34/E35");
    }
}
for (const failInner of [false, true]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const a = new Target(realm.observation);
    const bTarget = new Target(realm.observation);
    const rhs = o(new GuestObject());
    bind(realm, "a", o(a));
    bind(realm, "b", failInner ? b(true) : o(bTarget));
    bind(realm, "r", rhs);

    const result = run(e, "a.x = b.y = r;");

    if (failInner) {
        error(result, "property is not writable: y", "E37 InnerFailure", { line: 1, column: 7 });
        check(
            a.getOwnProperty("x") === undefined && realm.observation.sets === 1,
            "E37 no outer Put",
        );
    } else {
        expect(result, rhs, "E36 NestedAssignment");
        descriptor(a, "x", rhs, true, true, true, "E36 outer");
        descriptor(bTarget, "y", rhs, true, true, true, "E36 inner");
        check(
            realm.observation.trace === "SS" &&
                realm.observation.keys[0] === "y" &&
                realm.observation.keys[1] === "x",
            "E36 inner then outer writes",
        );
    }
}

// V1-V18: literal primitive cases, including each readonly String variant.
const primitiveRows: { name: string; base: Value; key: Value; rhs: Value; message: string }[] = [
    { name: "V1 True", base: b(true), key: s("x"), rhs: U, message: "property is not writable: x" },
    {
        name: "V2 False",
        base: b(false),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    { name: "V3 Number", base: n(3), key: s("x"), rhs: U, message: "property is not writable: x" },
    {
        name: "V4 MinusZero",
        base: n(-0),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    { name: "V5 NaN", base: n(NaN), key: s("x"), rhs: U, message: "property is not writable: x" },
    {
        name: "V6 Infinity positive",
        base: n(Infinity),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    {
        name: "V6 Infinity negative",
        base: n(-Infinity),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    {
        name: "V7 EmptyString",
        base: s(""),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    {
        name: "V8 String",
        base: s("ab"),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    {
        name: "V9 Symbol",
        base: sym(s1),
        key: s("x"),
        rhs: U,
        message: "property is not writable: x",
    },
    {
        name: "V12 Unit same",
        base: s("ab"),
        key: n(0),
        rhs: s("a"),
        message: "property is not writable: 0",
    },
    {
        name: "V12 Unit different",
        base: s("ab"),
        key: n(0),
        rhs: s("z"),
        message: "property is not writable: 0",
    },
    {
        name: "V13 Length same",
        base: s("ab"),
        key: s("length"),
        rhs: n(2),
        message: "property is not writable: length",
    },
    {
        name: "V13 Length different",
        base: s("ab"),
        key: s("length"),
        rhs: n(3),
        message: "property is not writable: length",
    },
    {
        name: "V14 UTF16 high",
        base: s("\ud83d\ude00"),
        key: n(0),
        rhs: U,
        message: "property is not writable: 0",
    },
    {
        name: "V14 UTF16 low",
        base: s("\ud83d\ude00"),
        key: n(1),
        rhs: U,
        message: "property is not writable: 1",
    },
    {
        name: "V15 StringOrdinaryKeys minus zero",
        base: s("ab"),
        key: s("-0"),
        rhs: U,
        message: "property is not writable: -0",
    },
    {
        name: "V15 StringOrdinaryKeys leading zero",
        base: s("ab"),
        key: s("01"),
        rhs: U,
        message: "property is not writable: 01",
    },
    {
        name: "V15 StringOrdinaryKeys out of bounds",
        base: s("ab"),
        key: s("2"),
        rhs: U,
        message: "property is not writable: 2",
    },
    {
        name: "V15 StringOrdinaryKeys fraction",
        base: s("ab"),
        key: s("1.5"),
        rhs: U,
        message: "property is not writable: 1.5",
    },
    {
        name: "V15 StringOrdinaryKeys negative",
        base: s("ab"),
        key: s("-1"),
        rhs: U,
        message: "property is not writable: -1",
    },
];
for (const row of primitiveRows) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const rhs = row.rhs === U ? o(new GuestObject()) : row.rhs;
    const ref = reference(row.base, row.key);

    const result = putValue(ref, rhs, e.context, opLoc);

    error(result, row.message, row.name);
    primitiveState(realm, row.base, row.name);
    if (row.base.kind === "string" && row.base.value.length === 2) {
        const box = realm.observation.boxes[0];
        const high = row.name.startsWith("V14") ? "\ud83d" : "a";
        const low = row.name.startsWith("V14") ? "\ude00" : "b";
        descriptor(box, "0", s(high), false, true, false, row.name + " unit0");
        descriptor(box, "1", s(low), false, true, false, row.name + " unit1");
        descriptor(box, "length", n(2), false, false, false, row.name + " length");
    }
}
for (const base of [nil, U]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const key = new Key();
    key.mode = "abrupt";
    const ref = reference(base, o(key));

    const result = putValue(ref, o(new GuestObject()), e.context, opLoc);

    error(result, nullish, "V10 Null / V11 Undefined", refLoc);
    check(
        realm.observation.trace === "" && realm.observation.sets === 0,
        "V10/V11 no factories/key/Set",
    );
    saved(ref, base, o(key), "V10/V11 raw key");
}
for (const name of [
    "V16 PrimitiveInheritedWritable",
    "V17 PrimitiveInheritedLocked",
    "V18 PrimitiveSymbolKey",
]) {
    for (const base of primitives) {
        for (const same of [false, true]) {
            const realm = new ObservedRealm();
            const e = new Evaluator(realm);
            const parent = prototype(realm, base);
            const key: PropertyKey = name === "V18 PrimitiveSymbolKey" ? s1 : "x";
            const writable = name !== "V17 PrimitiveInheritedLocked";
            parent.bootstrapDefine(key, {
                value: n(1),
                writable,
                enumerable: false,
                configurable: true,
            });
            const count = parent.ownPropertyKeys().length;
            const rhs = same ? n(1) : o(new GuestObject());

            const result = putValue(
                reference(base, typeof key === "string" ? s(key) : sym(key)),
                rhs,
                e.context,
                opLoc,
            );

            error(
                result,
                name === "V18 PrimitiveSymbolKey"
                    ? "property is not writable: Symbol(x)"
                    : "property is not writable: x",
                name,
            );
            primitiveState(realm, base, name);
            descriptor(parent, key, n(1), writable, false, true, name + " parent unchanged");
            check(
                parent.ownPropertyKeys().length === count &&
                    parent.getOwnProperty(s2) === undefined,
                name + " no additions/symbol identity",
            );
        }
    }
}

// V19-V24, V33, V36: object and definition boundaries share explicit setup modes.
for (const name of [
    "V19 ObjectNew",
    "V20 ObjectUpdate",
    "V21 InheritedWritable",
    "V22 InheritedLocked",
    "V23 Nonextensible absent",
    "V23 Nonextensible existing",
    "V24 CallableObject",
    "V33 SymbolObjectKeys",
    "V36 DefinitionBoundary success",
    "V36 DefinitionBoundary false",
    "V36 DefinitionBoundary abrupt",
]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target = new Target(realm.observation);
    const parent = new GuestObject();
    const rhs = o(new GuestObject());
    let calls = 0;
    let base = o(target);
    let key: Value = s("x");
    if (name === "V20 ObjectUpdate") {
        target.bootstrapDefine("x", { value: n(1), writable: true });
    }
    if (name === "V21 InheritedWritable" || name === "V22 InheritedLocked") {
        parent.bootstrapDefine("x", { value: n(1), writable: name === "V21 InheritedWritable" });
        target.setPrototypeOf(parent);
    }
    if (name === "V23 Nonextensible existing") {
        seed(target, "x", n(1));
    }
    if (name.startsWith("V23")) {
        target.preventExtensions();
    }
    if (name === "V24 CallableObject") {
        base = fn(realm, (_r, _a, _c, _l) => {
            calls++;
            return normal();
        });
    }
    if (name === "V33 SymbolObjectKeys") {
        seed(target, s1, n(1));
        seed(target, s2, n(2));
        key = sym(s1);
    }
    if (name === "V36 DefinitionBoundary false") {
        target.definitionMode = "false";
    }
    if (name === "V36 DefinitionBoundary abrupt") {
        target.definitionMode = "abrupt";
    }

    const result = putValue(reference(base, key), rhs, e.context, opLoc);

    check(
        realm.observation.boxes.length === 0 && realm.observation.reads === 0 && calls === 0,
        name + " no boxing/Get/call",
    );
    if (name === "V36 DefinitionBoundary abrupt") {
        exact(result, name);
    } else if (
        name === "V22 InheritedLocked" ||
        name === "V23 Nonextensible absent" ||
        name === "V36 DefinitionBoundary false"
    ) {
        error(result, "property is not writable: x", name);
    } else {
        expect(result, rhs, name);
        if (base.kind !== "object") {
            throw new Error("object base");
        }
        descriptor(
            base.object,
            name === "V33 SymbolObjectKeys" ? s1 : "x",
            rhs,
            true,
            name !== "V20 ObjectUpdate",
            name !== "V20 ObjectUpdate",
            name + " flags",
        );
    }
    if (name.startsWith("V36")) {
        check(realm.observation.definitions === 1, name + " definition dispatch once");
    }
    if (name === "V21 InheritedWritable" || name === "V22 InheritedLocked") {
        descriptor(
            parent,
            "x",
            n(1),
            name === "V21 InheritedWritable",
            false,
            false,
            name + " unchanged parent",
        );
    }
    if (
        name === "V22 InheritedLocked" ||
        name === "V23 Nonextensible absent" ||
        name === "V36 DefinitionBoundary false" ||
        name === "V36 DefinitionBoundary abrupt"
    ) {
        check(target.getOwnProperty("x") === undefined, name + " no own x");
    }
    if (name === "V33 SymbolObjectKeys") {
        check(
            sameValue(dataDescriptor(target.getOwnProperty(s2))!.value, n(2)) &&
                target.getOwnProperty("Symbol(x)") === undefined,
            name + " symbol identities",
        );
    }
}
{
    const realm = new Realm((_line) => {});
    const e = new Evaluator(realm);
    const boxes: GuestObject[] = [
        realm.createBooleanObject(true),
        realm.createNumberObject(-0),
        realm.createSymbolObject(s1),
        realm.createStringObject("ab"),
    ];
    const rhs = o(new GuestObject());
    for (const box of boxes) {
        const before = slot(box);
        const result = putValue(reference(o(box)), rhs, e.context, opLoc);
        expect(result, rhs, "V25 ExplicitBoxes");
        descriptor(box, "x", rhs, true, true, true, "V25 own descriptor");
        check(sameValue(slot(box), before), "V25 scalar preserved");
    }
    const string = realm.createStringObject("ab");
    for (const key of ["0", "length"]) {
        const result = putValue(reference(o(string), s(key)), rhs, e.context, opLoc);
        error(
            result,
            key === "0" ? "property is not writable: 0" : "property is not writable: length",
            "V26 ExplicitStringVirtual",
        );
    }
    descriptor(string, "0", s("a"), false, true, false, "V26 index");
    descriptor(string, "length", n(2), false, false, false, "V26 length");
}
function array(): GuestArray {
    const target = new GuestArray();
    seed(target, "0", n(1));
    seed(target, "1", n(2));
    seed(target, "2", n(3));
    return target;
}
for (const name of [
    "V27 ArrayIndex",
    "V28 ArrayFrozenLength",
    "V29 ArrayLength",
    "V30 InvalidLength",
    "V31 ArrayBlockedShrink",
    "V32 ArrayRHSIdentity",
]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target =
        name === "V27 ArrayIndex" || name === "V28 ArrayFrozenLength" ? new GuestArray() : array();
    if (name === "V28 ArrayFrozenLength") {
        target.bootstrapDefine("length", { writable: false });
    }
    if (name === "V31 ArrayBlockedShrink") {
        target.bootstrapDefine("1", { configurable: false });
    }
    const base = o(target);
    const key = new GuestObject();
    seed(
        key,
        wellKnownToPrimitive,
        fn(realm, (_r, _a, _c, _l) => normal(s("length"))),
    );
    const ref = reference(
        base,
        name === "V27 ArrayIndex" ? n(2) : name === "V28 ArrayFrozenLength" ? n(0) : o(key),
    );
    let trace = "";
    const rhsObject = new GuestObject();
    seed(
        rhsObject,
        wellKnownToPrimitive,
        fn(realm, (_r, args, _c, _l) => {
            check(args.length === 1 && sameValue(args[0], s("number")), "V32 number hint");
            saved(ref, base, s("length"), "V32 cached before N");
            trace += "N";
            return normal(n(2));
        }),
    );
    const rhs =
        name === "V32 ArrayRHSIdentity"
            ? o(rhsObject)
            : n(
                  name === "V27 ArrayIndex"
                      ? 7
                      : name === "V30 InvalidLength"
                        ? 1.5
                        : name === "V31 ArrayBlockedShrink"
                          ? 0
                          : 1,
              );

    const result = putValue(ref, rhs, e.context, opLoc);

    check(realm.observation.boxes.length === 0, name + " no boxing");
    if (name === "V28 ArrayFrozenLength") {
        error(result, "property is not writable: 0", name);
        check(
            sameValue(target.get("length", e.context, loc), n(0)) &&
                target.getOwnProperty("0") === undefined,
            name + " unchanged",
        );
    } else if (name === "V30 InvalidLength") {
        error(result, "invalid array length", name, opLoc, "RangeError");
        check(
            sameValue(target.get("length", e.context, loc), n(3)) &&
                sameValue(target.get("2", e.context, loc), n(3)),
            name + " unchanged",
        );
    } else if (name === "V31 ArrayBlockedShrink") {
        error(result, "property is not writable: length", name);
        check(
            sameValue(target.get("length", e.context, loc), n(2)) &&
                sameValue(target.get("0", e.context, loc), n(1)) &&
                sameValue(target.get("1", e.context, loc), n(2)) &&
                target.getOwnProperty("2") === undefined,
            name + " partial shrink",
        );
    } else {
        expect(result, rhs, name);
        if (name === "V27 ArrayIndex") {
            check(
                sameValue(target.get("length", e.context, loc), n(3)) &&
                    sameValue(target.get("2", e.context, loc), n(7)) &&
                    target.getOwnProperty("0") === undefined &&
                    target.getOwnProperty("1") === undefined,
                name + " holes",
            );
        }
        if (name === "V29 ArrayLength") {
            check(
                sameValue(target.get("length", e.context, loc), n(1)) &&
                    sameValue(target.get("0", e.context, loc), n(1)) &&
                    target.getOwnProperty("1") === undefined &&
                    target.getOwnProperty("2") === undefined,
                name + " shrink",
            );
        }
        if (name === "V32 ArrayRHSIdentity") {
            check(
                trace === "NN" &&
                    sameValue(target.get("length", e.context, loc), n(2)) &&
                    result.value === rhs,
                name + " exact RHS/two conversions",
            );
        }
    }
}
for (const receiver of [...primitives, nil, U]) {
    for (const mode of ["absent", "writable", "locked"]) {
        const realm = new ObservedRealm();
        const e = new Evaluator(realm);
        const base = new GuestObject();
        if (mode !== "absent") {
            base.bootstrapDefine("x", { value: n(1), writable: mode === "writable" });
        }

        const result = base.internalSet("x", n(2), receiver, e.context, opLoc);

        check(
            result.type === "normal" &&
                !result.value &&
                realm.observation.definitions === 0 &&
                realm.observation.boxes.length === 0,
            "V34 RawPrimitiveReceiver " + mode,
        );
    }
}
{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const base = new GuestObject();
    const receiver = new Target(realm.observation);
    const rhs = o(new GuestObject());
    seed(base, "x", n(1));

    const result = base.internalSet("x", rhs, o(receiver), e.context, opLoc);

    check(
        result.type === "normal" && result.value && realm.observation.definitions === 1,
        "V35 DistinctObjectReceiver",
    );
    descriptor(receiver, "x", rhs, true, true, true, "V35 receiver");
    check(sameValue(base.get("x", e.context, loc), n(1)), "V35 base unchanged");
}

// K1-K18: each attempt uses the same held Reference unless named otherwise.
class CacheScenario {
    realm = new ObservedRealm();
    e = new Evaluator(this.realm);
    key = new Key();
    raw = o(this.key);
    target = new GuestObject();
    base = o(this.target);
    rhs = o(new GuestObject());
    hooks = 0;
    next: Value = s("x");
    mode = "success";
    ref: Reference = reference(this.base, this.raw);
    constructor() {
        seed(
            this.key,
            wellKnownToPrimitive,
            fn(this.realm, (_r, _a, _c, _l): Completion => {
                this.hooks++;
                if (this.mode === "fault") {
                    throw F;
                }
                if (this.mode === "abrupt") {
                    return Q;
                }
                return normal(this.next);
            }),
        );
    }
    put(value: Value = this.rhs): Completion {
        return putValue(this.ref, value, this.e.context, opLoc);
    }
}
for (const name of [
    "K1 PutPut",
    "K2 PutGet",
    "K3 GetPut",
    "K5 FalseRetry",
    "K6 AbruptRetry",
    "K7 HostRetry",
    "K8 ConversionRetry",
    "K9 ConversionFaultRetry lookup",
    "K9 ConversionFaultRetry call",
    "K13 SymbolCache",
    "K18 FreshRHS",
]) {
    const c = new CacheScenario();
    const observation = c.realm.observation;
    const observed = new Target(observation);
    if (name === "K6 AbruptRetry" || name === "K7 HostRetry") {
        c.base = o(observed);
        c.ref = reference(c.base, c.raw);
        observation.setMode = name === "K6 AbruptRetry" ? "abrupt" : "fault";
    }
    if (name === "K3 GetPut") {
        seed(c.target, "x", n(1));
    }
    if (name === "K5 FalseRetry") {
        c.target.preventExtensions();
    }
    if (name === "K8 ConversionRetry") {
        c.mode = "abrupt";
    }
    if (name === "K9 ConversionFaultRetry call") {
        c.mode = "fault";
    }
    if (name === "K9 ConversionFaultRetry lookup") {
        c.key.mode = "fault";
    }
    if (name === "K13 SymbolCache") {
        c.next = sym(s1);
    }
    let first: Completion = normal();
    let escaped = false;

    try {
        first = name === "K3 GetPut" ? getValue(c.ref, c.e.context, opLoc) : c.put();
    } catch (fault) {
        escaped = fault instanceof Error && fault === F;
    }

    const conversionFailed = name === "K8 ConversionRetry" || name.startsWith("K9");
    if (name === "K7 HostRetry" || name.startsWith("K9")) {
        check(escaped, name + " original F");
    } else if (name === "K6 AbruptRetry" || name === "K8 ConversionRetry") {
        exact(first, name);
    } else if (name === "K5 FalseRetry") {
        error(first, "property is not writable: x", name);
    } else {
        expect(first, name === "K3 GetPut" ? n(1) : c.rhs, name + " first");
    }
    saved(
        c.ref,
        c.base,
        conversionFailed ? c.raw : name === "K13 SymbolCache" ? sym(s1) : s("x"),
        name + " first cache",
    );
    clean(c.e, c.realm, name);

    // Change the original hook result, except when retrying failed conversion.
    c.next = conversionFailed ? s("x") : name === "K13 SymbolCache" ? sym(s2) : s("y");
    c.mode = "success";
    c.key.mode = "success";
    observation.setMode = "success";
    const secondRHS =
        name === "K1 PutPut" ? n(7) : name === "K18 FreshRHS" ? o(new GuestObject()) : c.rhs;

    const second = name === "K2 PutGet" ? getValue(c.ref, c.e.context, opLoc) : c.put(secondRHS);

    if (name === "K5 FalseRetry") {
        error(second, "property is not writable: x", name + " retry");
    } else {
        expect(second, name === "K2 PutGet" ? c.rhs : secondRHS, name + " retry");
    }
    check(
        c.hooks ===
            (name === "K8 ConversionRetry" || name === "K9 ConversionFaultRetry call" ? 2 : 1),
        name + " hook count",
    );
    saved(c.ref, c.base, name === "K13 SymbolCache" ? sym(s1) : s("x"), name + " saved retry");
    const target = c.base.kind === "object" ? c.base.object : c.target;
    check(
        target.getOwnProperty("y") === undefined && target.getOwnProperty(s2) === undefined,
        name + " no replacement key",
    );
    if (name !== "K5 FalseRetry") {
        descriptor(
            target,
            name === "K13 SymbolCache" ? s1 : "x",
            name === "K2 PutGet" ? c.rhs : secondRHS,
            true,
            true,
            true,
            name + " target",
        );
    }
}
{
    const c = new CacheScenario();
    seed(
        c.key,
        wellKnownToPrimitive,
        fn(c.realm, (_r, _a, _c, _l) => {
            c.hooks++;
            return normal(s(c.hooks === 1 ? "x" : "y"));
        }),
    );
    bind(c.realm, "p", c.base);
    bind(c.realm, "k", c.raw);

    expect(run(c.e, "p[k] = 7;"), n(7), "K4 SeparateReferences first");
    expect(run(c.e, "p[k] = 8;"), n(8), "K4 SeparateReferences second");

    check(
        c.hooks === 2 &&
            sameValue(c.target.get("x", c.e.context, loc), n(7)) &&
            sameValue(c.target.get("y", c.e.context, loc), n(8)),
        "K4 separate keys",
    );
}
for (const name of [
    "K10 PrimitiveRetry",
    "K11 PrimitiveGetAfterFailure",
    "K12 NullishRetry null",
    "K12 NullishRetry undefined",
    "K17 NoBoxCache",
]) {
    const c = new CacheScenario();
    const base =
        name === "K12 NullishRetry null"
            ? nil
            : name === "K12 NullishRetry undefined"
              ? U
              : b(true);
    const ref = reference(base, c.raw);
    const other = new ObservedRealm();
    const otherEvaluator = new Evaluator(other);
    seed(c.realm.booleanPrototype, "x", n(1));

    const first = putValue(ref, c.rhs, c.e.context, opLoc);
    const second =
        name === "K11 PrimitiveGetAfterFailure"
            ? getValue(ref, c.e.context, opLoc)
            : putValue(
                  ref,
                  n(7),
                  name === "K17 NoBoxCache" ? otherEvaluator.context : c.e.context,
                  opLoc,
              );

    if (name.startsWith("K12")) {
        error(first, nullish, name, refLoc);
        error(second, nullish, name, refLoc);
        check(c.hooks === 0 && c.realm.observation.boxes.length === 0, name + " no effects");
        saved(ref, base, c.raw, name);
    } else {
        error(first, "property is not writable: x", name);
        if (name === "K11 PrimitiveGetAfterFailure") {
            expect(second, n(1), name);
        } else {
            error(second, "property is not writable: x", name);
        }
        check(c.hooks === 1, name + " hook count");
        saved(ref, base, s("x"), name);
        if (name === "K17 NoBoxCache") {
            check(
                c.realm.observation.boxes.length === 1 &&
                    other.observation.boxes.length === 1 &&
                    other.observation.boxes[0].getPrototypeOf() === other.booleanPrototype,
                name + " active Realm",
            );
        } else {
            check(
                c.realm.observation.boxes.length === 2 &&
                    c.realm.observation.boxes[0] !== c.realm.observation.boxes[1],
                name + " fresh boxes",
            );
        }
    }
}
for (const key of [s("x"), sym(s1)]) {
    for (const mode of ["abrupt", "fault", "false"]) {
        const c = new CacheScenario();
        const target = new Target(c.realm.observation);
        const base = o(target);
        const ref = reference(base, c.raw);
        c.next = key;
        c.realm.observation.held = ref;
        c.realm.observation.expectedKey = key;
        c.realm.observation.setMode = mode;
        let result: Completion = normal();
        let escaped = false;

        try {
            result = putValue(ref, c.rhs, c.e.context, opLoc);
        } catch (fault) {
            escaped = fault instanceof Error && fault === F;
        }

        if (mode === "fault") {
            check(escaped, "K14 CacheBeforeDispatch F");
        } else if (mode === "abrupt") {
            exact(result, "K14 CacheBeforeDispatch Q");
        } else {
            error(
                result,
                key.kind === "symbol"
                    ? "property is not writable: Symbol(x)"
                    : "property is not writable: x",
                "K14 CacheBeforeDispatch false",
            );
        }
        check(c.realm.observation.sets === 1 && c.hooks === 1, "K14 observer ran");
        saved(ref, base, key, "K14 after dispatch");
    }
}
{
    const c = new CacheScenario();
    const target = array();
    const base = o(target);
    const ref = reference(base, c.raw);
    c.next = s("length");
    const rhs = new GuestObject();
    let calls = 0;
    seed(
        rhs,
        wellKnownToPrimitive,
        fn(c.realm, (_r, _a, _c, _l) => {
            calls++;
            saved(ref, base, s("length"), "K15 CacheBeforeArrayRHS");
            c.next = s("other");
            return normal(n(2));
        }),
    );
    const rhsValue = o(rhs);

    const first = putValue(ref, rhsValue, c.e.context, opLoc);
    const second = putValue(ref, n(1), c.e.context, opLoc);

    expect(first, rhsValue, "K15 first exact RHS");
    expect(second, n(1), "K15 second");
    check(
        calls === 2 &&
            c.hooks === 1 &&
            sameValue(target.get("length", c.e.context, loc), n(1)) &&
            target.getOwnProperty("other") === undefined,
        "K15 saved key through RHS effects",
    );
}
for (const mode of ["nullish", "key", "false", "abrupt"]) {
    const c = new CacheScenario();
    const base = mode === "nullish" ? nil : b(true);
    const ref = reference(base, c.raw);
    if (mode === "key") {
        seed(c.key, wellKnownToPrimitive, n(1));
    }
    if (mode === "abrupt") {
        c.realm.observation.setMode = "abrupt";
    }

    const result = putValue(ref, c.rhs, c.e.context, opLoc);

    if (mode === "nullish") {
        error(result, nullish, "K16 LocationSplit nullish", refLoc);
    }
    if (mode === "key") {
        error(result, "symbol toPrimitive method is not callable", "K16 LocationSplit key", refLoc);
    }
    if (mode === "false") {
        error(result, "property is not writable: x", "K16 LocationSplit false", opLoc);
    }
    if (mode === "abrupt") {
        exact(result, "K16 LocationSplit Q");
    }
    if (mode === "false" || mode === "abrupt") {
        check(c.realm.observation.at === opLoc, "K16 Set location identity");
    }
}
for (const mode of ["mutable", "missing", "uninitialized", "immutable"]) {
    const c = new CacheScenario();
    const environment = new Environment(null);
    environment.bindings.set("x", {
        initialized: mode !== "uninitialized",
        mutable: mode !== "immutable",
        value: n(1),
    });
    const ref: Reference = {
        kind: "binding",
        environment: mode === "missing" ? null : environment,
        name: mode === "missing" ? "z" : "x",
    };

    const result = putValue(ref, c.rhs, c.e.context, opLoc);

    if (mode === "mutable") {
        expect(result, c.rhs, "K19 BindingControls mutable");
        check(environment.bindings.get("x")!.value === c.rhs, "K19 assigned identity");
    } else {
        error(
            result,
            mode === "missing"
                ? "z is not defined"
                : mode === "uninitialized"
                  ? "x is not initialized"
                  : "binding is not mutable: x",
            "K19 BindingControls",
            opLoc,
            mode === "immutable" ? "TypeError" : "ReferenceError",
        );
    }
    check(c.realm.observation.trace === "" && c.e.steps === 0, "K19 no property operations");
}
for (const symbolFailure of [false, true]) {
    const c = new CacheScenario();
    seed(c.target, "x", symbolFailure ? sym(s1) : n(1));
    let puts = 0;

    const read = getValue(c.ref, c.e.context, opLoc);
    let result: Completion = read;
    if (read.type === "normal") {
        if (symbolFailure) {
            const numeric = toNumber(read.value, opLoc, null);
            result = numeric.type === "throw" ? numeric : normal(n(numeric.value));
        } else {
            result = Q;
        }
        if (result.type === "normal") {
            puts++;
            result = c.put();
        }
    }

    if (symbolFailure) {
        error(result, "cannot convert symbol to number", "K20 ReadBeforeFailure numeric", opLoc);
    } else {
        exact(result, "K20 ReadBeforeFailure RHS");
    }
    check(puts === 0 && c.hooks === 1, "K20 no Put/retained read effects");
    saved(c.ref, c.base, s("x"), "K20 saved read key");
    check(
        sameValue(c.target.get("x", c.e.context, loc), symbolFailure ? sym(s1) : n(1)),
        "K20 unchanged target",
    );
}

// F1-F9/F11: wrapper Realm is observed before entering the foreign hook.
for (const name of [
    "F1 ForeignKey",
    "F2 ForeignPrimitiveResult",
    "F3 ForeignObject",
    "F4 NestedBoxing",
    "F5 MutateAPrototype",
    "F6 GuestAbrupt",
    "F7 HostFault",
    "F8 DispatchFault Q",
    "F8 DispatchFault F",
    "F9 SeededCalls Q",
    "F9 SeededCalls F",
    "F11 SideEffectSurvival",
]) {
    const a = new ObservedRealm();
    const home = new ObservedRealm();
    const e = new Evaluator(a);
    const key = new GuestObject();
    const raw = o(key);
    const target = new Target(home.observation);
    target.setPrototypeOf(home.objectPrototype);
    const base =
        name === "F3 ForeignObject"
            ? o(target)
            : name === "F2 ForeignPrimitiveResult"
              ? n(3)
              : b(true);
    const ref = reference(base, raw);
    const rhs = o(home.createObject());
    let nEffects = 0;
    let mEffects = 0;
    if (name.startsWith("F9")) {
        e.calls = 1;
        e.depth = 4;
    }
    if (name === "F8 DispatchFault Q") {
        a.observation.setMode = "abrupt";
    }
    if (name === "F8 DispatchFault F") {
        a.observation.setMode = "fault";
    }
    seed(
        key,
        wellKnownToPrimitive,
        fn(home, (_r, _args, context, _at): Completion => {
            mEffects++;
            check(context.realm === home, name + " hook Realm B");
            if (name !== "F3 ForeignObject") {
                check(
                    a.observation.boxes.length === 1 &&
                        a.observation.boxes[0].getPrototypeOf() === prototype(a, base),
                    name + " A wrapper already exists",
                );
            }
            if (name === "F4 NestedBoxing") {
                const innerBase = b(false);
                const inner = putValue(reference(innerBase), n(7), context, opLoc);
                error(inner, "property is not writable: x", name + " inner");
                check(
                    home.observation.boxes.length === 1 &&
                        home.observation.boxes[0].getPrototypeOf() === home.booleanPrototype &&
                        home.observation.receiver === innerBase,
                    name + " B box/original Receiver",
                );
            }
            if (name === "F5 MutateAPrototype") {
                a.booleanPrototype.bootstrapDefine("x", {
                    value: n(9),
                    writable: false,
                    configurable: true,
                });
            }
            if (name === "F6 GuestAbrupt" || name === "F9 SeededCalls Q") {
                return Q;
            }
            if (name === "F7 HostFault" || name === "F9 SeededCalls F") {
                throw F;
            }
            return normal(s("x"));
        }),
    );
    bind(a, "p", base);
    bind(a, "k", raw);
    bind(
        a,
        "base",
        fn(home, (_r, _args, context, _at) => {
            check(context.realm === home, "F2 base Realm");
            return normal(base);
        }),
    );
    bind(
        a,
        "rhs",
        fn(home, (_r, _args, context, _at) => {
            check(context.realm === home && a.observation.boxes.length === 0, "F2 RHS before box");
            nEffects++;
            return normal(rhs);
        }),
    );
    let result: Completion = normal();
    let escaped = false;

    try {
        result =
            name === "F2 ForeignPrimitiveResult"
                ? run(e, "base()[k] = rhs();")
                : name === "F11 SideEffectSurvival"
                  ? run(e, "p[k] = rhs();")
                  : putValue(ref, rhs, e.context, opLoc);
    } catch (fault) {
        escaped = fault instanceof Error && fault === F;
    }

    if (name === "F7 HostFault" || name === "F8 DispatchFault F" || name === "F9 SeededCalls F") {
        check(escaped, name + " F identity");
    } else if (
        name === "F6 GuestAbrupt" ||
        name === "F8 DispatchFault Q" ||
        name === "F9 SeededCalls Q"
    ) {
        exact(result, name);
    } else if (name === "F3 ForeignObject") {
        expect(result, rhs, name);
        descriptor(target, "x", rhs, true, true, true, name + " B object write");
        check(
            target.getPrototypeOf() === home.objectPrototype &&
                a.observation.boxes.length === 0 &&
                home.observation.boxes.length === 0,
            name + " identity/prototype/no box",
        );
        check(
            home.observation.context === e.context &&
                home.observation.context.realm === a &&
                home.observation.receiver === base,
            name + " Set receives A context and B object Receiver",
        );
    } else {
        error(
            result,
            "property is not writable: x",
            name,
            name === "F2 ForeignPrimitiveResult" || name === "F11 SideEffectSurvival" ? loc : opLoc,
        );
    }
    clean(e, a, name, name.startsWith("F9") ? 1 : 0, name.startsWith("F9") ? 4 : 0);
    if (a.observation.sets > 0) {
        check(
            a.observation.receiver === base &&
                a.observation.context === e.context &&
                a.observation.context.realm === a,
            name + " Set in A",
        );
    }
    if (name === "F6 GuestAbrupt" || name === "F7 HostFault" || name.startsWith("F9")) {
        saved(ref, base, raw, name + " failed conversion");
        check(a.observation.sets === 0, name + " no Set");
    }
    if (name.startsWith("F8")) {
        saved(ref, base, s("x"), name + " saved before dispatch");
    }
    if (name === "F5 MutateAPrototype") {
        descriptor(a.booleanPrototype, "x", n(9), false, false, true, name + " mutation retained");
        check(home.booleanPrototype.getOwnProperty("x") === undefined, name + " B unchanged");
    }
    if (name === "F11 SideEffectSurvival") {
        check(
            nEffects === 1 &&
                mEffects === 1 &&
                a.observation.definitions === 0 &&
                a.booleanPrototype.getOwnProperty("x") === undefined,
            name + " effects survive",
        );
    }
}
// F10 Recovery / R28 Cleanup: every fault site is tested with remaining budget,
// including seeded entry guards. Factory faults have no guest-completion form.
for (const stage of ["factory", "keyGet", "keyCall", "Set"]) {
    for (const hostFault of [false, true]) {
        if (stage === "factory" && !hostFault) {
            continue;
        }
        for (const seeded of [false, true]) {
            const a = new ObservedRealm();
            const home = new ObservedRealm();
            const e = new Evaluator(a);
            const key = new Key();
            const raw = o(key);
            const base = b(true);
            const ref = reference(base, raw);
            let enabled = true;
            if (seeded) {
                e.calls = 1;
                e.depth = 4;
            }
            seed(
                key,
                wellKnownToPrimitive,
                fn(home, (_r, _a, context, _l): Completion => {
                    check(context.realm === home, "F10 foreign call");
                    if (enabled && stage === "keyCall") {
                        if (hostFault) {
                            throw F;
                        }
                        return Q;
                    }
                    return normal(s("x"));
                }),
            );
            if (stage === "factory") {
                a.observation.factoryFault = true;
            }
            if (stage === "keyGet") {
                key.mode = hostFault ? "fault" : "abrupt";
            }
            if (stage === "Set") {
                a.observation.setMode = hostFault ? "fault" : "abrupt";
            }
            let result: Completion = normal();
            let escaped = false;

            try {
                result = putValue(ref, n(7), e.context, opLoc);
            } catch (fault) {
                escaped = fault instanceof Error && fault === F;
            }

            if (hostFault) {
                check(escaped, "F10/R28 F identity " + stage);
            } else {
                exact(result, "F10/R28 Q identity " + stage);
            }
            clean(e, a, "F10/R28 entry guards", seeded ? 1 : 0, seeded ? 4 : 0);
            saved(ref, base, stage === "Set" ? s("x") : raw, "F10 fault cache");
            const before = e.steps;
            enabled = false;
            key.mode = "success";
            a.observation.factoryFault = false;
            a.observation.setMode = "success";
            const target = new GuestObject();
            bind(a, "o", o(target));

            const recovery = run(e, "o.x = 7;");

            expect(recovery, n(7), "F10 Recovery " + stage);
            descriptor(target, "x", n(7), true, true, true, "F10 recovered write");
            check(e.steps === before + 5, "F10 recovery exact five additional ticks");
            clean(e, a, "F10 recovered guards", seeded ? 1 : 0, seeded ? 4 : 0);
        }
    }
}
{
    const a = new ObservedRealm();
    const e = new Evaluator(a);
    let parent = new GuestObject();
    seed(parent, "x", n(1));
    for (let index = 0; index < 1000; index++) {
        parent = new GuestObject(parent);
    }
    a.booleanPrototype.setPrototypeOf(parent);
    const base = b(true);

    const result = putValue(reference(base), n(7), e.context, opLoc);

    error(result, "property is not writable: x", "F12 LongPrototypeChain");
    check(
        e.steps === 0 && e.calls === 0 && sameValue(parent.get("x", e.context, loc), n(1)),
        "F12 iterative/no ticks",
    );
    primitiveState(a, base, "F12");
}

// R1-R16/R19: each row carries literal independently derived counts/locations.
const resourceRows = [
    {
        name: "R1 Primitive",
        mode: "primitive",
        maxSteps: 100000,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 1,
        message: "property is not writable: x",
        column: 1,
    },
    {
        name: "R2 Statement",
        mode: "primitive",
        maxSteps: 0,
        calls: 64,
        depth: 0,
        steps: 1,
        peak: 0,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 1,
    },
    {
        name: "R3 Assignment",
        mode: "primitive",
        maxSteps: 1,
        calls: 64,
        depth: 0,
        steps: 2,
        peak: 2,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 1,
    },
    {
        name: "R4 Base",
        mode: "primitive",
        maxSteps: 2,
        calls: 64,
        depth: 0,
        steps: 3,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 1,
    },
    {
        name: "R5 Key",
        mode: "primitive",
        maxSteps: 3,
        calls: 64,
        depth: 0,
        steps: 4,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 3,
    },
    {
        name: "R6 RHS",
        mode: "primitive",
        maxSteps: 4,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 8,
    },
    {
        name: "R7 Exact",
        mode: "primitive",
        maxSteps: 5,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 1,
        message: "property is not writable: x",
        column: 1,
    },
    {
        name: "R8 Nullish null",
        mode: "null",
        maxSteps: 5,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "cannot convert null or undefined to object",
        column: 1,
    },
    {
        name: "R8 Nullish undefined",
        mode: "undefined",
        maxSteps: 5,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "cannot convert null or undefined to object",
        column: 1,
    },
    {
        name: "R9 Canonical",
        mode: "canonical",
        maxSteps: 100000,
        calls: 64,
        depth: 0,
        steps: 6,
        peak: 3,
        hooks: 1,
        boxes: 1,
        message: "property is not writable: x",
        column: 1,
    },
    {
        name: "R10 OrdinaryFirst",
        mode: "first",
        maxSteps: 100000,
        calls: 64,
        depth: 0,
        steps: 7,
        peak: 3,
        hooks: 1,
        boxes: 1,
        message: "property is not writable: x",
        column: 1,
    },
    {
        name: "R11 OrdinarySecond",
        mode: "second",
        maxSteps: 100000,
        calls: 64,
        depth: 0,
        steps: 8,
        peak: 3,
        hooks: 2,
        boxes: 1,
        message: "property is not writable: x",
        column: 1,
    },
    {
        name: "R12 KeyTick",
        mode: "canonical",
        maxSteps: 5,
        calls: 64,
        depth: 0,
        steps: 6,
        peak: 3,
        hooks: 0,
        boxes: 1,
        message: "execution step limit exceeded",
        column: 1,
    },
    {
        name: "R13 CallGuard",
        mode: "canonical",
        maxSteps: 100000,
        calls: 0,
        depth: 0,
        steps: 6,
        peak: 3,
        hooks: 0,
        boxes: 1,
        message: "call depth limit exceeded",
        column: 1,
    },
    {
        name: "R14 SeededDepth",
        mode: "primitive",
        maxSteps: 100000,
        calls: 64,
        depth: 256,
        steps: 1,
        peak: 257,
        hooks: 0,
        boxes: 0,
        message: "evaluation nesting limit exceeded",
        column: 1,
    },
    {
        name: "R15 ChildDepth",
        mode: "primitive",
        maxSteps: 100000,
        calls: 64,
        depth: 255,
        steps: 2,
        peak: 257,
        hooks: 0,
        boxes: 0,
        message: "evaluation nesting limit exceeded",
        column: 1,
    },
    {
        name: "R16 StepWins",
        mode: "primitive",
        maxSteps: 1,
        calls: 64,
        depth: 255,
        steps: 2,
        peak: 257,
        hooks: 0,
        boxes: 0,
        message: "execution step limit exceeded",
        column: 1,
    },
    {
        name: "R19 ObjectControl",
        mode: "object",
        maxSteps: 100000,
        calls: 64,
        depth: 0,
        steps: 5,
        peak: 3,
        hooks: 0,
        boxes: 0,
        message: "",
        column: 1,
    },
];
for (const row of resourceRows) {
    const realm = new ObservedRealm();
    const e = new Measured(realm, row.maxSteps, row.calls);
    e.depth = row.depth;
    const target = new GuestObject();
    const key = new GuestObject();
    let hooks = 0;
    const hook = fn(realm, (_r, _a, _c, _l) => {
        hooks++;
        return normal(s("x"));
    });
    if (row.mode === "first" || row.mode === "second") {
        seed(
            key,
            "toString",
            row.mode === "first"
                ? hook
                : fn(realm, (_r, _a, _c, _l) => {
                      hooks++;
                      return normal(o(key));
                  }),
        );
        seed(key, "valueOf", hook);
    } else {
        seed(key, wellKnownToPrimitive, hook);
    }
    bind(
        realm,
        "p",
        row.mode === "null"
            ? nil
            : row.mode === "undefined"
              ? U
              : row.mode === "object"
                ? o(target)
                : b(true),
    );
    bind(realm, "k", row.mode === "primitive" || row.mode === "object" ? s("x") : o(key));
    const assignment = expression("p[k] = 7;");

    const result = row.depth === 0 ? run(e, "p[k] = 7;") : e.evaluate(assignment, realm.global, U);

    if (row.message === "") {
        expect(result, n(7), row.name);
        descriptor(target, "x", n(7), true, true, true, row.name + " property");
    } else {
        error(
            result,
            row.message,
            row.name,
            { line: 1, column: row.column },
            row.message.endsWith("exceeded") ? "RangeError" : "TypeError",
        );
    }
    check(
        e.steps === row.steps &&
            e.peak === row.peak &&
            hooks === row.hooks &&
            realm.observation.boxes.length === row.boxes,
        row.name + " literal counts",
    );
    clean(e, realm, row.name, 0, row.depth);
    if (row.message.endsWith("exceeded")) {
        check(realm.observation.sets === 0, row.name + " no Set");
    }
}
{
    const c = new CacheScenario();
    const base = b(true);
    const primitive = reference(base);
    const canonical = reference(base, c.raw);

    error(
        putValue(primitive, n(7), c.e.context, opLoc),
        "property is not writable: x",
        "R17 Direct primitive",
    );
    check(c.e.steps === 0, "R17 zero ticks");
    error(
        putValue(canonical, n(7), c.e.context, opLoc),
        "property is not writable: x",
        "R17 Direct canonical",
    );
    check(c.e.steps === 1, "R17 one tick");
    error(
        putValue(canonical, n(8), c.e.context, opLoc),
        "property is not writable: x",
        "R17 Direct repeat",
    );

    check(
        c.e.steps === 1 && c.hooks === 1 && c.realm.observation.boxes.length === 3,
        "R17 cached key/fresh boxes",
    );
    check(
        c.realm.observation.boxes[0] !== c.realm.observation.boxes[1] &&
            c.realm.observation.boxes[1] !== c.realm.observation.boxes[2],
        "R17 distinct boxes",
    );
}
{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm, 9);
    bind(realm, "p", b(true));
    bind(realm, "k", s("x"));

    const first = run(e, "p[k] = 7;");
    check(e.steps === 5, "R18 first steps");
    const second = run(e, "p[k] = 7;");

    error(first, "property is not writable: x", "R18 Monotonic first", loc);
    error(
        second,
        "execution step limit exceeded",
        "R18 Monotonic second",
        { line: 1, column: 8 },
        "RangeError",
    );
    check(
        e.steps === 10 && realm.observation.boxes.length === 1,
        "R18 retained work/no second box",
    );
    clean(e, realm, "R18");
}

// R20 HostRecursive / R21 HostSmall / R22 HostDefault and
// R23 GuestRecursive / R24 GuestSmall / R25 GuestDefault use literal rows.
const recursionRows = [
    { guest: false, limit: 0, steps: 6, peak: 3, boxes: 1, column: 1 },
    { guest: false, limit: 1, steps: 11, peak: 4, boxes: 2, column: 1 },
    { guest: false, limit: 2, steps: 16, peak: 5, boxes: 3, column: 1 },
    { guest: false, limit: 64, steps: 326, peak: 67, boxes: 65, column: 1 },
    { guest: true, limit: 0, steps: 6, peak: 3, boxes: 1, column: 1 },
    { guest: true, limit: 1, steps: 12, peak: 5, boxes: 2, column: 23 },
    { guest: true, limit: 2, steps: 18, peak: 7, boxes: 3, column: 23 },
    { guest: true, limit: 64, steps: 390, peak: 131, boxes: 65, column: 23 },
];
for (const row of recursionRows) {
    for (const foreign of [false, true]) {
        for (const stepFirst of [false, true]) {
            if (stepFirst && (!row.guest || row.limit !== 2)) {
                continue;
            }
            const a = new ObservedRealm();
            const home = foreign ? new ObservedRealm() : a;
            // Omit maxCalls entirely for both actual constructor-default64 cases.
            const e = row.limit === 64 ? new Measured(a) : new Measured(a, 100000, row.limit);
            if (stepFirst) {
                e.maxSteps = 17;
            }
            const key = new GuestObject();
            bind(a, "p", b(true));
            bind(a, "k", o(key));
            bind(home, "p", b(true));
            bind(home, "k", o(key));
            const assignment = expression("p[k] = 7;");
            if (row.guest) {
                const setup = new Evaluator(home);
                expect(program(setup, "function h() { return p[k] = 7; }"), U, "R23 setup");
                seed(key, wellKnownToPrimitive, binding(home, "h"));
            } else {
                seed(
                    key,
                    wellKnownToPrimitive,
                    fn(home, (_r, _a, context, _l) => {
                        check(context.realm === home, "R20 hook Realm");
                        return e.evaluate(assignment, home.global, U);
                    }),
                );
            }

            const result = run(e, "p[k] = 7;");

            const name = row.guest ? "R23/R24/R25 GuestRecursive" : "R20/R21/R22 HostRecursive";
            error(
                result,
                stepFirst ? "execution step limit exceeded" : "call depth limit exceeded",
                name,
                { line: 1, column: row.column },
                "RangeError",
            );
            check(
                e.steps === row.steps && e.peak === row.peak && e.invocations === row.limit,
                name + " literal counts",
            );
            const boxes =
                a.observation.boxes.length + (foreign ? home.observation.boxes.length : 0);
            check(
                boxes === row.boxes && a.observation.sets === 0 && home.observation.sets === 0,
                name + " boxes/no Set",
            );
            if (foreign) {
                check(
                    a.observation.boxes.length === 1 && home.observation.boxes.length === row.limit,
                    "R27 RecursiveRealm counts",
                );
                check(
                    a.observation.boxes[0].getPrototypeOf() === a.booleanPrototype,
                    "R27 first A",
                );
                for (const box of home.observation.boxes) {
                    check(box.getPrototypeOf() === home.booleanPrototype, "R27 nested B");
                }
            }
            clean(e, a, "R27/R28 recursive cleanup");
            if (stepFirst) {
                const target = new GuestObject();
                bind(a, "o", o(target));

                const retry = run(e, "o.x = 7;");

                error(
                    retry,
                    "execution step limit exceeded",
                    "R26 StepBeforeCall / R29 Exhaustion",
                    loc,
                    "RangeError",
                );
                check(
                    e.steps === 19 && target.getOwnProperty("x") === undefined,
                    "R29 no reset/no write",
                );
                expect(run(new Evaluator(a), "o.x = 7;"), n(7), "R29 fresh evaluator recovery");
                descriptor(target, "x", n(7), true, true, true, "R29 recovered write");
            }
        }
    }
}
// C1-C6 run through the CLI with literal records in run-guests.mjs.
// C7 SourceRetention is runtime-read, including the original comment bytes.
{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const source = readFileSync("test/fixtures/property-assignment-retention.js", "utf8");

    expect(program(e, source), U, "C7 declaration");
    const result = run(e, "f.toString();");

    expect(result, s("function f() { /*keep*/ p[k] = 7; }"), "C7 SourceRetention");
}
const parseRows = [
    { source: "p.x **= 1;", column: 5, message: "unsupported operator: **" },
    { source: "p.x++;", column: 4, message: "unsupported operator: ++" },
    { source: "++p.x;", column: 1, message: "unsupported operator: ++" },
    { source: "p.x &&= 1;", column: 7, message: "unsupported or unexpected syntax: =" },
];
for (const row of parseRows) {
    const parsed = parse(row.source);
    check(
        parsed.error !== null &&
            parsed.error.phase === "parse" &&
            parsed.error.name === "SyntaxError" &&
            parsed.error.message === row.message &&
            parsed.error.loc.line === 1 &&
            parsed.error.loc.column === row.column,
        "C8 Unsupported " + row.source,
    );
}
// C9 Preserve is independently checked by the retained baseline audit.
// C10 NewDriver: this file is a separate static-only/coverage/native entry.

{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const key = new GuestObject();
    let calls = 0;
    seed(
        key,
        wellKnownToPrimitive,
        fn(realm, (_r, _a, _c, _l): Completion => {
            throw F;
        }),
    );
    bind(realm, "p", nil);
    bind(realm, "k", o(key));
    bind(
        realm,
        "rhs",
        fn(realm, (_r, _a, _c, _l) => {
            calls++;
            return normal(n(7));
        }),
    );

    const result = run(e, "p[k] = rhs();");

    error(result, nullish, "R30 NullishRHSCost", loc);
    // Coordinator-reviewed correction: identifier callees use reference/GetValue,
    // so only statement/assignment/base/key/call-expression charge ticks here.
    check(e.steps === 5 && calls === 1 && realm.observation.boxes.length === 0, "R30 exact cost");
    clean(e, realm, "R30");
}

console.log("property-assignment ok");
