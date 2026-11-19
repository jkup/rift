import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import type { Expr } from "../src/syntax.js";
import { Environment } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import {
    prepareBoundedScript,
    prepareStrictScript,
    type ExecutableScript,
} from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    sameValue,
    type Value,
    type ValueCompletion,
    type Completion,
    type ThrowCompletion,
    type Builtin,
    type OperationContext,
    type PropertyKey,
    type PropertyDescriptorUpdate,
} from "../src/runtime.js";
import { GuestNumber } from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownHasInstance } from "../src/symbols.js";
import "../src/script-environment.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
const loc = { line: 1, column: 1 };
function prepare(text: string, realm: Realm, id = "T"): ExecutableScript {
    const p = prepareBoundedScript({ id, text }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare " + p.kind + ": " + text);
    }
    return p.record;
}
function idle(s: ScriptSession): void {
    const i = s.inspect();
    check(i.active === null && i.calls === 0 && i.depth === 0, "idle");
}
function run(text: string, r: Realm, s = createScriptSession(), id = "T"): ValueCompletion {
    const result = evaluateScript(s, prepare(text, r, id));
    idle(s);
    return result.completion;
}
function define(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function obj(o: GuestObject): Value {
    return { kind: "object", object: o };
}
function number(n: number): Value {
    return { kind: "number", value: n };
}
function builtin(r: Realm, name: string, cb: Builtin): Value {
    return obj(r.createBuiltin(name, 1, cb));
}
function own(r: Realm, name: string): Value {
    const d = r.globalObject.getOwnProperty(name);
    if (d === undefined || d.kind !== "data") {
        throw new Error("missing " + name);
    }
    return d.value;
}
function scalar(v: Value): string {
    if (v.kind === "number" || v.kind === "string" || v.kind === "boolean") {
        return "" + v.value;
    }
    return v.kind;
}
function recorder(r: Realm, values: Value[]): void {
    define(
        r,
        "out",
        builtin(r, "out", (_t, a, _c, _l): ValueCompletion => {
            values.push(a[0]);
            return normal();
        }),
    );
}
function expect(c: ValueCompletion, value: Value, label: string): void {
    check(c.type === "normal" && sameValue(c.value, value), label);
}
function throws(c: ValueCompletion, name: string): void {
    check(c.type === "throw" && c.diagnostic.name === name, "throw " + name);
}
function context(r: Realm): OperationContext {
    return {
        realm: r,
        tick: (_l) => normal(),
        call: (_v, _t, _a, _l): ValueCompletion => {
            throw new Error("setup call");
        },
    };
}
function property(r: Realm, o: GuestObject, key: PropertyKey, d: PropertyDescriptorUpdate): void {
    const c = o.defineOwnProperty(key, d, context(r), loc);
    check(c.type === "normal" && c.value, "define property");
}

function logCase(id: string, source: string, expected: string): void {
    const r = fresh(),
        out: Value[] = [];
    recorder(r, out);
    check(run(source, r).type === "normal", id + " completion");
    check(out.map(scalar).join(",") === expected, id + " output");
    console.log("PASS " + id);
}
function matchingConstructorSlot(o: GuestObject): boolean {
    const callable = o.callable;
    const constructorSlot = o.constructorSlot;
    if (callable === null || callable.kind !== "script-guest" || constructorSlot === null) {
        return false;
    }
    return constructorSlot === callable;
}
function object(v: Value): GuestObject {
    if (v.kind !== "object") {
        throw new Error("object expected");
    }
    return v.object;
}
function constructor(r: Realm, text = '"use strict";\nfunction C(){}'): Value {
    check(run(text, r, createScriptSession(), "H").type === "normal", "helper");
    return own(r, "C");
}
function shell(r: Realm, c: Value): GuestObject {
    const f = object(c).callable;
    if (f?.kind !== "script-guest") {
        throw new Error("constructor");
    }
    return new GuestObject(r.functionPrototype, false, f, f);
}
function getter(r: Realm, o: GuestObject, key: PropertyKey, cb: Builtin): void {
    property(r, o, key, { get: builtin(r, "getter", cb), configurable: true });
}
function hostFault(cb: () => void, message: string): void {
    let caught = false;
    try {
        cb();
    } catch (e) {
        if (!(e instanceof Error) || !e.message.includes(message)) {
            throw e;
        }
        caught = true;
    }
    check(caught, "expected host fault " + message);
}
const input = readFileSync(process.argv[2], "utf8"),
    ir = fresh(),
    iv: Value[] = [];
recorder(ir, iv);
const n = input.includes("11") ? 11 : 7;
check(
    input ===
        "function C(x){this.x=x;}var c=new C(" +
            n +
            ");out(c.x);out(c instanceof C);out(c.constructor===C);c.x;\n",
    "exact input",
);
expect(run(input, ir), number(n), "runtime source");
check(iv.map(scalar).join(",") === n + ",true,true", "runtime outputs");
console.log("PASS runtime source");
for (const strict of [false, true]) {
    const p = strict ? '"use strict";' : "";
    logCase(
        "C01",
        p +
            "function C(x){this.x=x;}var c=new C(7);out(c.x);out(c instanceof C);out(c.constructor===C);",
        "7,true,true",
    );
    const r = fresh();
    run(p + "function C(x){this.x=x;}var c=new C(7);", r);
    const d = object(own(r, "c")).getOwnProperty("x");
    check(d?.kind === "data" && d.writable && d.enumerable && d.configurable, "C01 flags");
    for (const v of [
        number(7),
        { kind: "null" } as Value,
        UNDEFINED,
        { kind: "boolean", value: true } as Value,
        { kind: "string", value: "x" } as Value,
        { kind: "symbol", value: new GuestSymbol("s") } as Value,
    ]) {
        const a = fresh();
        define(a, "v", v);
        expect(
            run(p + "function C(){return v;}new C() instanceof C;", a),
            { kind: "boolean", value: true },
            "C02",
        );
        const b = fresh();
        define(b, "v", v);
        const c = run(p + "function C(){}C.prototype=v;new C();", b);
        check(
            c.type === "normal" && object(c.value).getPrototypeOf() === b.objectPrototype,
            "C05 fallback",
        );
    }
    const a = fresh(),
        b = fresh();
    constructor(a, p + "function C(){return o;}");
    for (const o of [
        new GuestObject(a.objectPrototype),
        a.createArray(),
        new GuestNumber(7, a.numberPrototype),
        object(constructor(b)),
        new GuestObject(b.objectPrototype),
    ]) {
        define(a, "o", obj(o));
        expect(run("new C();", a), obj(o), "C03 override");
    }
    logCase(
        "C04",
        p + "function C(){}var a=new C;var b=new C();out(a===b);out(a instanceof C);",
        "false,true",
    );
    logCase(
        "C06",
        p +
            "function C(){}var p={};C.prototype=p;var a=new C();C.prototype={};out(a instanceof C);",
        "false",
    );
    logCase(
        "C15",
        p + "function C(){if(!(this instanceof C))return new C();this.x=7;}out(C().x);",
        "7",
    );
    expect(run(p + "new (function(){return {x:7};})().x;", fresh()), number(7), "C16");
    logCase(
        "C17",
        p + "function C(f){this.f=f;}var c=new C(function(){return 11;});out(c.f());",
        "11",
    );
    expect(
        run(p + "function f(){return 7;}function C(){return f;}new C()();", fresh()),
        number(7),
        "C18",
    );
}
console.log("PASS C02 C03 C05 C16 C18 strict twins");
{
    const r = fresh(),
        log: string[] = [],
        o = new GuestObject(r.objectPrototype);
    let received: Value = UNDEFINED;
    define(
        r,
        "body",
        builtin(r, "body", (t, a, _c, _l): ValueCompletion => {
            log.push("C");
            received = a[0];
            check(sameValue(a[1], number(7)) && sameValue(a[2], number(11)), "arguments");
            return normal();
        }),
    );
    const c = constructor(r, "function C(x,y){body(this,x,y);}");
    getter(r, o, "C", (t, _a, _c, _l): ValueCompletion => {
        check(sameValue(t, obj(o)), "getter receiver");
        log.push("G");
        return normal(c);
    });
    define(r, "o", obj(o));
    for (const [name, label, value] of [
        ["a", "A", 7],
        ["b", "B", 11],
    ] as [string, string, number][]) {
        define(
            r,
            name,
            builtin(r, name, (_t, _a, _c, _l): ValueCompletion => {
                log.push(label);
                return normal(number(value));
            }),
        );
    }
    const result = run("new o.C(a(),b());", r);
    check(
        result.type === "normal" &&
            sameValue(result.value, received) &&
            object(received) !== o &&
            o.getOwnProperty("x") === undefined,
        "C07",
    );
    check(log.join(",") === "G,A,B,C", "C08 order");
    log.length = 0;
    define(
        r,
        "choose",
        builtin(r, "choose", (_t, _a, _c, _l): ValueCompletion => {
            log.push("choose");
            return normal(c);
        }),
    );
    run("new (choose())(a(),b());", r);
    check(log.join(",") === "choose,A,B,C", "C09");
    for (const v of [
        number(7),
        builtin(r, "f", (_t, _a, _c, _l): ValueCompletion => {
            throw new Error("body forbidden");
        }),
        obj(r.functionPrototype),
        own(r, "Math"),
        obj(new GuestObject()),
    ]) {
        if (v.kind === "object") {
            property(r, v.object, "prototype", {
                value: obj(new GuestObject()),
                configurable: true,
            });
        }
        define(r, "f", v);
        log.length = 0;
        throws(run("new f(a());", r), "TypeError");
        check(log.join(",") === "A", "C10/C11 arguments first");
    }
}
console.log("PASS C07-C11");
{
    const a = fresh(),
        b = fresh(),
        c = constructor(a),
        k = shell(a, c),
        p = new GuestObject();
    let gets = 0;
    getter(a, k, "prototype", (t, _a, _c, _l): ValueCompletion => {
        gets++;
        check(sameValue(t, obj(k)), "C12 receiver");
        property(a, k, "prototype", { value: number(9) });
        return normal(obj(p));
    });
    define(b, "K", obj(k));
    const v = run("new K();", b);
    check(
        v.type === "normal" && object(v.value).getPrototypeOf() === p && gets === 1,
        "C12 single get",
    );
    const v2 = run("new K();", b);
    check(
        v2.type === "normal" && object(v2.value).getPrototypeOf() === a.objectPrototype,
        "C13 fallback",
    );
    for (const calleeStrict of [false, true]) {
        for (const callerStrict of [false, true]) {
            constructor(a, (calleeStrict ? '"use strict";' : "") + "function C(){return this;}");
            define(b, "C", own(a, "C"));
            const q = run((callerStrict ? '"use strict";' : "") + "new C();", b);
            check(
                q.type === "normal" &&
                    object(q.value).getPrototypeOf() ===
                        object(
                            object(own(a, "C")).getOwnProperty("prototype")!.kind === "data"
                                ? (
                                      object(own(a, "C")).getOwnProperty("prototype") as {
                                          kind: "data";
                                          value: Value;
                                      }
                                  ).value
                                : UNDEFINED,
                        ),
                "C14 receiver",
            );
        }
    }
}
console.log("PASS C12-C14");
{
    const r = fresh(),
        c = constructor(r),
        proto = object(c).getOwnProperty("prototype");
    if (proto?.kind !== "data") {
        throw new Error("prototype");
    }
    const p = object(proto.value);
    define(r, "x", obj(new GuestObject(p)));
    expect(run("x instanceof C;", r), { kind: "boolean", value: true }, "I01");
    define(r, "x", obj(new GuestObject()));
    expect(run("x instanceof C;", r), { kind: "boolean", value: false }, "I01 false");
    const k = shell(r, c);
    getter(r, k, "prototype", (_t, _a, _c, _l): ValueCompletion => {
        throw new Error("forbidden getter");
    });
    define(r, "K", obj(k));
    expect(run("7 instanceof K;", r), { kind: "boolean", value: false }, "I02");
    const log: string[] = [];
    define(
        r,
        "left",
        builtin(r, "left", (_t, _a, _c, _l): ValueCompletion => {
            log.push("L");
            return normal(obj(k));
        }),
    );
    define(
        r,
        "right",
        builtin(r, "right", (_t, _a, _c, _l): ValueCompletion => {
            log.push("R");
            return normal(number(1));
        }),
    );
    throws(run("left() instanceof right();", r), "TypeError");
    check(log.join(",") === "L,R", "I03");
    for (const result of [
        obj(new GuestObject()),
        number(0),
        { kind: "null" } as Value,
        UNDEFINED,
    ]) {
        const o = new GuestObject();
        let count = 0;
        const x = obj(new GuestObject());
        define(r, "x", x);
        getter(r, o, wellKnownHasInstance, (t, _a, _c, _l): ValueCompletion => {
            check(sameValue(t, obj(o)), "I05 getter receiver");
            count++;
            return normal(
                builtin(r, "hook", (t, args, _c, _l): ValueCompletion => {
                    check(
                        sameValue(t, obj(o)) && args.length === 1 && sameValue(args[0], x),
                        "I04 hook",
                    );
                    count++;
                    property(r, o, wellKnownHasInstance, { value: number(9) });
                    return normal(result);
                }),
            );
        });
        define(r, "o", obj(o));
        expect(
            run("x instanceof o;", r),
            { kind: "boolean", value: result.kind === "object" },
            "I04 result",
        );
        check(count === 2, "I05 once");
    }
    property(r, k, wellKnownHasInstance, { value: number(7), configurable: true });
    throws(run("x instanceof K;", r), "TypeError");
    for (const absent of [UNDEFINED, { kind: "null" } as Value]) {
        property(r, k, wellKnownHasInstance, { value: absent });
        expect(run("7 instanceof K;", r), { kind: "boolean", value: false }, "I07 primitive");
        property(r, k, "prototype", { value: obj(p) });
        define(r, "x", obj(new GuestObject(p)));
        expect(run("x instanceof K;", r), { kind: "boolean", value: true }, "I07 object");
        const o = new GuestObject();
        property(r, o, wellKnownHasInstance, { value: absent });
        define(r, "o", obj(o));
        throws(run("x instanceof o;", r), "TypeError");
    }
    for (const v of [
        number(7),
        UNDEFINED,
        { kind: "null" } as Value,
        { kind: "string", value: "" } as Value,
        { kind: "boolean", value: false } as Value,
        { kind: "symbol", value: new GuestSymbol("s") } as Value,
    ]) {
        property(r, k, "prototype", { value: v });
        throws(run("x instanceof K;", r), "TypeError");
    }
    const method = r.functionPrototype.getOwnProperty(wellKnownHasInstance);
    if (method?.kind !== "data") {
        throw new Error("method");
    }
    define(r, "method", method.value);
    const o = new GuestObject();
    getter(r, o, "prototype", (_t, _a, _c, _l): ValueCompletion => {
        throw new Error("noncallable prototype");
    });
    define(r, "o", obj(o));
    expect(run("method.call(o,x);", r), { kind: "boolean", value: false }, "I10");
    const unrelated = new GuestObject();
    unrelated.bootstrapDefine("constructor", { value: c });
    define(r, "x", obj(unrelated));
    expect(run("x instanceof C;", r), { kind: "boolean", value: false }, "I12");
    define(r, "x", obj(new GuestObject(p)));
    p.internalDelete("constructor");
    expect(run("x instanceof C;", r), { kind: "boolean", value: true }, "I12 no constructor");
}
console.log("PASS I01-I10 I12");
{
    const a = fresh(),
        b = fresh(),
        ca = constructor(a);
    constructor(b);
    define(b, "A", ca);
    define(b, "a", (run("new C();", a) as { type: "normal"; value: Value }).value);
    logCase("I11 grammar", "function C(){}out(new C instanceof C);", "true");
    const out: Value[] = [];
    recorder(b, out);
    run("out(a instanceof A);out(a instanceof C);C.prototype=A.prototype;out(a instanceof C);", b);
    check(out.map(scalar).join(",") === "true,false,true", "I11");
    for (const r of [a, b]) {
        const c = own(r, "C"),
            o = object(c),
            d = o.getOwnProperty("prototype");
        check(
            matchingConstructorSlot(o) &&
                d?.kind === "data" &&
                d.writable &&
                !d.enumerable &&
                !d.configurable,
            "D01 D05",
        );
        const m = r.functionPrototype.getOwnProperty(wellKnownHasInstance);
        check(m?.kind === "data" && !m.writable && !m.enumerable && !m.configurable, "D02 flags");
        if (m?.kind !== "data") {
            throw new Error("method");
        }
        const f = object(m.value);
        check(
            f.constructorSlot === null &&
                f.getPrototypeOf() === r.functionPrototype &&
                f.getOwnProperty("prototype") === undefined,
            "D02 callable",
        );
        for (const key of ["name", "length"]) {
            const d = f.getOwnProperty(key);
            check(
                d?.kind === "data" && !d.writable && !d.enumerable && d.configurable,
                "method descriptor",
            );
            if (d?.kind === "data") {
                check(
                    scalar(d.value) === (key === "name" ? "[Symbol.hasInstance]" : "1"),
                    "method metadata",
                );
            }
        }
        expect(run("typeof Symbol;", r), { kind: "string", value: "function" }, "D04");
        define(r, "hasInstanceKey", { kind: "symbol", value: wellKnownHasInstance });
        throws(run('"use strict";C[hasInstanceKey]=7;', r), "TypeError");
        check(
            run("C[hasInstanceKey]=7;", r).type === "normal" &&
                o.getOwnProperty(wellKnownHasInstance) === undefined,
            "D03 sloppy",
        );
    }
    const ma = a.functionPrototype.getOwnProperty(wellKnownHasInstance),
        mb = b.functionPrototype.getOwnProperty(wellKnownHasInstance);
    check(
        ma?.kind === "data" && mb?.kind === "data" && !sameValue(ma.value, mb.value),
        "different Realm methods",
    );
    const legacy = new Realm((_s: string) => {});
    check(
        legacy.functionPrototype.getOwnProperty(wellKnownHasInstance) === undefined,
        "legacy unchanged",
    );
}
console.log("PASS I11 D01-D05");
const negatives = [
    "class C{}",
    "function C(){new.target;}",
    "new C(...a);",
    "new C(7,);",
    "new C?.();",
    "new new C();",
    "new (function(){return arguments;})();",
    "new C(function(){const x=1;});",
    "new C();try{}finally{}",
    "new C();for(let i=0;;){}",
    "new (function named(){})();",
    "new C();function f(a,a){}",
    "new C();with(o){}",
    "new C();eval('1');",
    "new -1;",
    "new C();let f=()=>1;",
];
for (const source of negatives) {
    for (const strict of [false, true]) {
        const r = fresh(),
            out: Value[] = [];
        recorder(r, out);
        const s = createScriptSession();
        const prefix = strict ? '"use strict";' : "";
        const p = prepareBoundedScript({ id: "N", text: prefix + "out(9);" + source }, r);
        if (source === "new (function named(){})();") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "named constructor prepares",
            );
            const result = run(prefix + source, r, s);
            check(
                result.type === "normal" && result.value.kind === "object",
                "named constructor executes",
            );
            expect(
                run("typeof named;", r, s),
                { kind: "string", value: "undefined" },
                "constructor name stays private",
            );
        } else if (source === "new C();function f(a,a){}" && !strict) {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "duplicate parameter preparation is inert",
            );
            check(
                run("function C(){}" + source, r, s).type === "normal",
                "original duplicate source executes",
            );
            expect(run("f.length;", r, s), number(2), "duplicate parameter arity");
        } else if (source === "function C(){new.target;}") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "new.target preparation is inert",
            );
            check(
                run(prefix + source, r, s).type === "normal",
                "original new.target source executes",
            );
            expect(run("C();", r, s), UNDEFINED, "new.target does not change implicit return");
            expect(
                run("new C() instanceof C;", r, s),
                { kind: "boolean", value: true },
                "new.target constructor executes",
            );
        } else if (source === "new C();eval('1');") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "eval after constructor prepares",
            );
            expect(
                run(prefix + "function C(){}" + source, r, s),
                number(1),
                "eval after constructor executes",
            );
        } else if (source === "new (function(){return arguments;})();") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "arguments constructor prepares",
            );
            const result = run(prefix + source, r, s);
            check(
                result.type === "normal" && result.value.kind === "object",
                "constructor returns arguments object",
            );
            if (result.type === "normal") {
                define(r, "result", result.value);
                expect(run("result.length;", r, s), number(0), "constructed arguments length");
            }
        } else if (source === "new C(...a);") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "spread constructor prepares",
            );
            check(
                run(prefix + "function C(x){}var a=[7];" + source, r, s).type === "normal",
                "spread constructor executes",
            );
        } else if (source === "new C(7,);") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "trailing constructor comma prepares",
            );
            check(
                run(prefix + "function C(x){out(x);}" + source, r, s).type === "normal" &&
                    out.length === 1 &&
                    sameValue(out[0], number(7)),
                "trailing constructor comma executes",
            );
        } else if (source === "new C(function(){const x=1;});") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "const constructor argument prepares",
            );
            check(
                run(prefix + "function C(f){f();}" + source, r, s).type === "normal",
                "const constructor argument executes",
            );
        } else if (source === "new C();try{}finally{}") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "finally after constructor prepares",
            );
            check(
                run(prefix + "function C(){}" + source, r, s).type === "normal",
                "finally after constructor executes",
            );
        } else if (source === "new C();let f=()=>1;") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "arrow after constructor prepares",
            );
            check(
                run(prefix + "function C(){}" + source, r, s).type === "normal",
                "arrow after constructor executes",
            );
            expect(run("f();", r, s), number(1), "arrow after constructor value");
        } else if (source === "new C();for(let i=0;;){}") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "lexical for after constructor prepares",
            );
            const result = run(
                prefix + "function C(){}" + source,
                r,
                createScriptSession({ maxSteps: 100, maxCalls: 64 }),
            );
            check(
                result.type === "throw" && result.origin.kind === "resource-limit",
                "lexical for bounded after construction",
            );
        } else if (source === "class C{}") {
            check(
                p.kind === "ready" && out.length === 0 && s.inspect().steps === 0,
                "class construction preparation is inert",
            );
            check(run(prefix + source, r, s).type === "normal", "original base class executes");
            expect(
                run("new C() instanceof C;", r, s),
                { kind: "boolean", value: true },
                "class construction",
            );
        } else {
            check(
                p.kind !== "ready" && out.length === 0 && s.inspect().steps === 0,
                "negative " + source,
            );
        }
    }
}
check(
    prepareStrictScript({ id: "strict", text: "new C();" }, fresh()).kind !== "ready",
    "strict entry",
);
for (const source of ['"use strict";new f();', "function f(){return 7;}new C();"]) {
    const r = fresh();
    throws(run(source, r), "ReferenceError");
    if (!source.startsWith('"')) {
        check(object(own(r, "f")).constructorSlot !== null, "original hoisting");
    }
}
console.log("PASS N01-N16 original negative migrations");

const traces: {
    id: number;
    helper: string;
    source: string;
    units: string[];
    lines: number[];
    columns: number[];
}[] = [
    {
        id: 1,
        helper: '"use strict";\nfunction C(){}',
        source: "new C();",
        units: ["T", "T", "T", "T", "H"],
        lines: [1, 1, 1, 1, 2],
        columns: [1, 1, 5, 1, 1],
    },
    {
        id: 2,
        helper: '"use strict";\nfunction C(){\nreturn 7;\n}',
        source: "new C();",
        units: ["T", "T", "T", "T", "H", "H", "H"],
        lines: [1, 1, 1, 1, 2, 3, 3],
        columns: [1, 1, 5, 1, 1, 1, 8],
    },
    {
        id: 3,
        helper: '"use strict";\nfunction C(x){\nreturn x;\n}',
        source: "new C(o);",
        units: ["T", "T", "T", "T", "T", "H", "H", "H", "H", "H"],
        lines: [1, 1, 1, 1, 1, 2, 2, 2, 3, 3],
        columns: [1, 1, 5, 7, 1, 1, 12, 12, 1, 8],
    },
    {
        id: 4,
        helper: "function C(){\nreturn 7;\n}",
        source: "new C();",
        units: ["T", "T", "T", "T", "H", "H", "H", "H"],
        lines: [1, 1, 1, 1, 1, 1, 2, 2],
        columns: [1, 1, 5, 1, 1, 1, 1, 8],
    },
    {
        id: 5,
        helper: '"use strict";\nfunction C(){}',
        source: "new o.C(a(),b());",
        units: ["T", "T", "T", "T", "T", "T", "T", "T", "H"],
        lines: [1, 1, 1, 1, 1, 1, 1, 1, 2],
        columns: [1, 1, 5, 5, 7, 9, 13, 1, 1],
    },
    {
        id: 6,
        helper: "",
        source: "new 7(a());",
        units: ["T", "T", "T", "T"],
        lines: [1, 1, 1, 1],
        columns: [1, 1, 5, 7],
    },
    {
        id: 7,
        helper: '"use strict";\nfunction C(){}',
        source: "new K();",
        units: ["T", "T", "T", "T", "H"],
        lines: [1, 1, 1, 1, 2],
        columns: [1, 1, 5, 1, 1],
    },
    {
        id: 8,
        helper: '"use strict";\nfunction C(){\nthrow 7;\n}',
        source: "new C();",
        units: ["T", "T", "T", "T", "H", "H", "H"],
        lines: [1, 1, 1, 1, 2, 3, 3],
        columns: [1, 1, 5, 1, 1, 1, 7],
    },
    {
        id: 9,
        helper: "",
        source: "x instanceof C;",
        units: ["T", "T", "T", "T", "T"],
        lines: [1, 1, 1, 1, 1],
        columns: [1, 1, 1, 14, 1],
    },
    {
        id: 10,
        helper: "",
        source: "x instanceof C;",
        units: ["T", "T", "T", "T", "T", "T"],
        lines: [1, 1, 1, 1, 1, 1],
        columns: [1, 1, 1, 14, 1, 1],
    },
    {
        id: 11,
        helper: "",
        source: "x instanceof o;",
        units: ["T", "T", "T", "T"],
        lines: [1, 1, 1, 1],
        columns: [1, 1, 1, 14],
    },
    {
        id: 12,
        helper: "",
        source: "7 instanceof C;",
        units: ["T", "T", "T", "T"],
        lines: [1, 1, 1, 1],
        columns: [1, 1, 1, 14],
    },
];
function restoredContext(c: OperationContext | null, r: Realm): void {
    if (c !== null) {
        check(c.realm === r, "prefix restored caller Realm");
    }
}
let prefixCount = 0;
for (const trace of traces) {
    for (const seed of [0, 7]) {
        for (let k = 0; k <= trace.lines.length; k++) {
            const a = fresh(),
                r = fresh(),
                s = createScriptSession({ maxSteps: seed + k, maxCalls: 64 }),
                log: string[] = [],
                o = new GuestObject(r.objectPrototype);
            let observedContext: OperationContext | null = null;
            let c: Value = UNDEFINED;
            const expectedObject = obj(o);
            if (trace.helper !== "") {
                c = constructor(a, trace.helper);
            } else if (trace.id === 9 || trace.id === 10 || trace.id === 12) {
                c = constructor(a);
            }
            if (c.kind === "object") {
                define(r, "C", c);
            }
            define(r, "o", expectedObject);
            if (trace.id === 5) {
                getter(r, o, "C", (t, _args, ctx, _l): ValueCompletion => {
                    observedContext = ctx;
                    check(sameValue(t, expectedObject) && ctx.realm === r, "prefix callee getter");
                    log.push("G");
                    return normal(c);
                });
            }
            if (trace.id === 5 || trace.id === 6) {
                for (const name of ["a", "b"]) {
                    define(
                        r,
                        name,
                        builtin(r, name, (_t, _args, ctx, _l): ValueCompletion => {
                            observedContext = ctx;
                            check(ctx.realm === r, "prefix arg Realm");
                            log.push(name === "a" ? "A" : "B");
                            return normal(number(name === "a" ? 7 : 11));
                        }),
                    );
                }
            }
            if (trace.id === 7 || trace.id === 12) {
                const target = shell(a, c);
                getter(a, target, "prototype", (t, _args, ctx, _l): ValueCompletion => {
                    observedContext = ctx;
                    check(
                        sameValue(t, obj(target)) && ctx.realm === a && s.inspect().calls === 2,
                        "reserved construction depth",
                    );
                    if (trace.id === 12) {
                        throw new Error("primitive-left prototype read");
                    }
                    log.push("G");
                    return normal(number(7));
                });
                define(r, trace.id === 7 ? "K" : "C", obj(target));
            }
            let prototype: GuestObject | null = null;
            if (trace.id === 9 || trace.id === 10) {
                const d = object(c).getOwnProperty("prototype");
                if (d?.kind !== "data") {
                    throw new Error("prefix prototype");
                }
                prototype = object(d.value);
                const chain = trace.id === 9 ? prototype : new GuestObject();
                define(r, "x", obj(new GuestObject(chain)));
            }
            if (trace.id === 11) {
                const x = obj(new GuestObject());
                define(r, "x", x);
                getter(r, o, wellKnownHasInstance, (t, _args, ctx, _l): ValueCompletion => {
                    observedContext = ctx;
                    check(sameValue(t, expectedObject) && ctx.realm === r, "prefix hook getter");
                    log.push("G");
                    return normal(
                        builtin(r, "hook", (t, args, _ctx, _loc): ValueCompletion => {
                            observedContext = _ctx;
                            check(
                                sameValue(t, expectedObject) &&
                                    args.length === 1 &&
                                    sameValue(args[0], x),
                                "prefix hook args",
                            );
                            log.push("H");
                            return normal(number(7));
                        }),
                    );
                });
            }
            if (seed === 7) {
                check(run("0;0;0;", r, s, "seed").type === "normal", "seed six");
                check(
                    run(";", r, s, "seed").type === "normal" && s.inspect().steps === 7,
                    "seed seven",
                );
            }
            const record = prepare(trace.source, r),
                result = evaluateScript(s, record),
                completion = result.completion;
            idle(s);
            prefixCount++;
            restoredContext(observedContext, r);
            const count = trace.lines.length;
            check(
                s.inspect().steps === seed + (k < count ? k + 1 : k),
                "prefix steps P" + trace.id + " k" + k,
            );
            check(result.phase === "body", "prefix phase");
            if (k < count) {
                check(
                    completion.type === "throw" &&
                        completion.origin.kind === "resource-limit" &&
                        completion.origin.guardCode === "steps" &&
                        completion.origin.count === seed + k + 1 &&
                        completion.origin.limit === seed + k,
                    "prefix resource P" + trace.id,
                );
                if (completion.type === "throw") {
                    check(
                        completion.diagnostic.loc.line === trace.lines[k] &&
                            completion.diagnostic.loc.column === trace.columns[k],
                        "prefix loc P" + trace.id + " k" + k,
                    );
                    const abrupt = s.inspect().lastAbrupt;
                    check(
                        abrupt !== null &&
                            abrupt.unitId === trace.units[k] &&
                            abrupt.realm ===
                                (trace.units[k] === "H" ||
                                ((trace.id === 9 || trace.id === 10) && k >= 4)
                                    ? a
                                    : r),
                        "prefix source Realm P" + trace.id + " k" + k + " unit " + abrupt?.unitId,
                    );
                }
            } else if (trace.id === 6) {
                throws(completion, "TypeError");
            } else if (trace.id === 8) {
                check(
                    completion.type === "throw" &&
                        completion.origin.kind === "guest" &&
                        sameValue(completion.value, number(7)) &&
                        s.inspect().lastAbrupt?.unitId === "H",
                    "P08 throw",
                );
                if (completion.type === "throw") {
                    check(
                        completion.diagnostic.loc.line === 3 &&
                            completion.diagnostic.loc.column === 1,
                        "P08 loc",
                    );
                }
            } else if (trace.id === 3) {
                expect(completion, expectedObject, "P03 exact override");
            } else if (trace.id >= 9) {
                expect(
                    completion,
                    { kind: "boolean", value: trace.id === 9 || trace.id === 11 },
                    "instanceof prefix result",
                );
            } else {
                check(
                    completion.type === "normal" && completion.value.kind === "object",
                    "prefix receiver",
                );
                if (completion.type === "normal") {
                    const receiver = object(completion.value);
                    const d = object(c).getOwnProperty("prototype");
                    check(d?.kind === "data", "helper prototype");
                    if (d?.kind === "data") {
                        check(
                            receiver.getPrototypeOf() ===
                                (trace.id === 7 ? a.objectPrototype : object(d.value)),
                            "prefix receiver prototype",
                        );
                    }
                    check(
                        receiver.ownPropertyKeys().length === 0 && receiver.isExtensible(),
                        "fresh receiver properties",
                    );
                }
            }
            let expected = "";
            if (trace.id === 5) {
                expected = (k >= 5 ? "G" : "") + (k >= 6 ? ",A" : "") + (k >= 7 ? ",B" : "");
            }
            if (trace.id === 6 && k >= 4) {
                expected = "A";
            }
            if (trace.id === 7 && k >= 3) {
                expected = "G";
            }
            if (trace.id === 11 && k >= 4) {
                expected = "G,H";
            }
            check(log.join(",") === expected, "prefix effects P" + trace.id + " k" + k + " " + log);
        }
    }
}
check(prefixCount === 172, "prefix count");
console.log("PASS 172 fresh/seven-seeded prefixes");
function sameFrame(
    a: ReturnType<ScriptSession["inspect"]>,
    b: ReturnType<ScriptSession["inspect"]>,
): void {
    const x = a.active,
        y = b.active;
    check(
        x !== null && y !== null && a.calls === b.calls && a.depth === b.depth,
        "active frame restoration",
    );
    if (x === null || y === null) {
        throw new Error("missing frame");
    }
    check(
        x.realm === y.realm &&
            x.record === y.record &&
            x.scopeId === y.scopeId &&
            x.lexical === y.lexical &&
            x.variable === y.variable &&
            x.strict === y.strict &&
            sameValue(x.thisValue, y.thisValue) &&
            x.function === y.function &&
            x.privateEnvironment === y.privateEnvironment &&
            x.phase === y.phase,
        "exact restored frame",
    );
}
function sentinel(): ThrowCompletion {
    return {
        type: "throw",
        origin: { kind: "guest" },
        value: obj(new GuestObject()),
        diagnostic: {
            phase: "runtime",
            name: "Sentinel",
            message: "sentinel",
            loc: { line: 900, column: 9 },
        },
    };
}
const abruptRows = [1, 2, 3, 4, 7, 8, 9, 10];
for (const row of abruptRows) {
    for (const host of [false, true]) {
        for (const caught of [false, true]) {
            const r = fresh(),
                s = createScriptSession(),
                q = sentinel(),
                error = new Error("hostSentinel"),
                log: string[] = [],
                out: Value[] = [];
            recorder(r, out);
            const fault: Builtin = (_t, _args, ctx, _loc): Completion => {
                check(ctx.realm === r, "abrupt callback Realm");
                if (host) {
                    throw error;
                }
                return q;
            };
            const a = builtin(r, "a", (t, args, ctx, l): Completion => {
                log.push("A");
                return row === 2 ? fault(t, args, ctx, l) : normal(number(7));
            });
            const b = builtin(r, "b", (t, args, ctx, l): Completion => {
                log.push("B");
                return row === 3 ? fault(t, args, ctx, l) : normal(number(11));
            });
            define(r, "a", a);
            define(r, "b", b);
            define(
                r,
                "fault",
                builtin(r, "fault", (t, args, ctx, l): Completion => {
                    log.push("F");
                    return fault(t, args, ctx, l);
                }),
            );
            const c = constructor(
                    r,
                    row === 7
                        ? '"use strict";\nfunction C(){\nfault();\n}'
                        : '"use strict";\nfunction C(){}',
                ),
                o = new GuestObject(r.objectPrototype),
                k = shell(r, c);
            define(r, "o", obj(o));
            define(r, "K", obj(k));
            define(r, "x", obj(new GuestObject()));
            let source = "new C(a(),b());",
                expected = row === 2 ? "A" : "A,B";
            if (row === 1) {
                getter(r, o, "C", (t, args, ctx, l): Completion => {
                    log.push("G");
                    return fault(t, args, ctx, l);
                });
                source = "new o.C(a(),b());";
                expected = "G";
            }
            if (row === 4 || row === 10) {
                getter(r, k, "prototype", (t, args, ctx, l): Completion => {
                    log.push("P");
                    return fault(t, args, ctx, l);
                });
                source = row === 4 ? "new K();" : "x instanceof K;";
                expected = "P";
            }
            if (row === 7) {
                source = "new C();";
                expected = "F";
            }
            if (row === 8 || row === 9) {
                getter(r, o, wellKnownHasInstance, (t, args, ctx, l): Completion => {
                    log.push("G");
                    if (row === 8) {
                        return fault(t, args, ctx, l);
                    }
                    return normal(
                        builtin(r, "hook", (t, args, ctx, l): Completion => {
                            log.push("H");
                            return fault(t, args, ctx, l);
                        }),
                    );
                });
                source = "x instanceof o;";
                expected = row === 8 ? "G" : "G,H";
            }
            const text = caught ? "try{" + source + "}catch(e){out(e);}" : source;
            let escaped = false;
            try {
                const result = run(text, r, s);
                if (host) {
                    throw new Error("host fault swallowed");
                }
                if (caught) {
                    check(
                        result.type === "normal" && out.length === 1 && sameValue(out[0], q.value),
                        "catch sentinel value",
                    );
                } else {
                    check(result === q, "A exact completion");
                    const abrupt = s.inspect().lastAbrupt;
                    check(
                        abrupt !== null &&
                            abrupt.realm === r &&
                            abrupt.unitId === (row === 7 ? "H" : "T") &&
                            abrupt.loc.line === 900 &&
                            abrupt.loc.column === 9,
                        "A diagnostic provenance",
                    );
                }
            } catch (e) {
                if (!(e instanceof Error) || e !== error) {
                    throw e;
                }
                escaped = true;
            }
            check(escaped === host && (!host || out.length === 0), "A host bypass catch");
            check(log.join(",") === expected, "A ordering " + row);
            idle(s);
            expect(run("7;", r, s, "after"), number(7), "A cleanup reuse");
            check(s.inspect().lastAbrupt === null, "A reset");
        }
    }
}
console.log("PASS A01-A04 A07-A10 guest/host/catch identity");
for (const row of [1, 4, 8, 9, 10]) {
    const a = fresh(),
        b = fresh(),
        s = createScriptSession(),
        q = obj(new GuestObject());
    define(a, "q", q);
    run("function getter(){throw q;}", a, createScriptSession(), "G");
    const g = own(a, "getter"),
        c = constructor(b),
        k = shell(b, c),
        o = new GuestObject(b.objectPrototype);
    define(b, "K", obj(k));
    define(b, "o", obj(o));
    define(b, "x", obj(new GuestObject()));
    let source = "new K();";
    if (row === 1) {
        property(b, o, "C", { get: g });
        source = "new o.C();";
    }
    if (row === 4 || row === 10) {
        property(b, k, "prototype", { get: g });
        if (row === 10) {
            source = "x instanceof K;";
        }
    }
    if (row === 8) {
        property(b, o, wellKnownHasInstance, { get: g });
        source = "x instanceof o;";
    }
    if (row === 9) {
        property(b, o, wellKnownHasInstance, { value: g });
        source = "x instanceof o;";
    }
    const cpl = run(source, b, s);
    check(
        cpl.type === "throw" &&
            cpl.origin.kind === "guest" &&
            sameValue(cpl.value, q) &&
            s.inspect().lastAbrupt?.unitId === "G" &&
            s.inspect().lastAbrupt?.realm === a,
        "A guest getter source " + row,
    );
}
for (const row of [5, 6, 11]) {
    for (const caught of [false, true]) {
        const r = fresh(),
            out: Value[] = [];
        recorder(r, out);
        constructor(
            r,
            row === 6 ? '"use strict";\nfunction C(x){return x;}' : '"use strict";\nfunction C(){}',
        );
        define(r, "o", obj(new GuestObject()));
        define(r, "x", obj(new GuestObject()));
        let source: string;
        if (row === 6) {
            source = "new C(o);";
        } else if (row === 11) {
            source = "x instanceof C;";
        } else {
            source = "new C();";
        }
        const limit = (row === 6 ? 7 : 4) + (caught ? 2 : 0),
            s = createScriptSession({ maxSteps: limit, maxCalls: 64 });
        const c = run(caught ? "try{" + source + "}catch(e){out(e);}" : source, r, s);
        check(
            c.type === "throw" && c.origin.kind === "resource-limit" && out.length === 0,
            "A resource bypass",
        );
        if (!caught && c.type === "throw") {
            check(
                c.diagnostic.loc.line === (row === 11 ? 1 : 2) &&
                    c.diagnostic.loc.column === (row === 6 ? 12 : 1),
                "A resource loc",
            );
        }
    }
}
console.log("PASS A05 A06 A11 resources and guest getter provenance");
// Consumed propagation identity must not pin a reused completion to an old unit.
{
    const a = fresh(),
        b = fresh(),
        s = createScriptSession(),
        q = sentinel(),
        c = constructor(a),
        k = shell(a, c);
    getter(a, k, "prototype", (_t, _args, _ctx, _l): ValueCompletion => q);
    define(a, "K", obj(k));
    define(b, "K", obj(k));
    const out: Value[] = [];
    recorder(a, out);
    check(
        run("try{new K();}catch(e){out(e);}", a, s, "TA").type === "normal" &&
            sameValue(out[0], q.value),
        "X01 first catch",
    );
    check(
        run("new K();", b, s, "TB") === q && s.inspect().lastAbrupt?.unitId === "TB",
        "X01 new source",
    );
    check(s.inspect().lastAbrupt?.realm === a, "getter defining Realm");
    const value = obj(new GuestObject());
    define(a, "q", value);
    constructor(a, "function C(){throw q;}");
    define(b, "C", own(a, "C"));
    const record = prepare("new C();", b);
    const result = evaluateScript(s, record);
    check(
        result.phase === "body" &&
            result.completion.type === "throw" &&
            sameValue(result.completion.value, value) &&
            s.inspect().lastAbrupt?.unitId === "H" &&
            s.inspect().lastAbrupt?.realm === a,
        "X02 defining body source",
    );
    idle(s);
    const values: Value[] = [];
    recorder(b, values);
    check(
        run("try{new C();}catch(e){out(e);}", b, s).type === "normal" &&
            sameValue(values[0], value),
        "X11 catch body",
    );
    expect(run("7;", b, s), number(7), "X11 next unit");
    check(s.inspect().lastAbrupt === null, "X11 reset");
}
console.log("PASS X01 X02 X11 source and consumed history");
for (const mode of [0, 1, 2]) {
    const a = fresh(),
        b = fresh(),
        sa = createScriptSession(),
        sb = createScriptSession(),
        q = sentinel(),
        error = new Error("nested host");
    let outerContext: OperationContext | null = null,
        innerContext: OperationContext | null = null;
    define(
        b,
        "leaf",
        builtin(b, "leaf", (_t, _args, ctx, _loc): ValueCompletion => {
            innerContext = ctx;
            check(ctx.realm === b && sb.inspect().calls === 1, "nested Realm");
            if (mode === 1) {
                return q;
            }
            if (mode === 2) {
                throw error;
            }
            return normal(number(11));
        }),
    );
    define(
        a,
        "bridge",
        builtin(a, "bridge", (_t, _args, ctx, _loc): ValueCompletion => {
            outerContext = ctx;
            const before = sa.inspect();
            let escaped = false;
            try {
                const result = run("leaf();", b, sb, "B");
                if (mode === 1) {
                    check(result === q, "nested guest identity");
                } else {
                    expect(result, number(11), "nested normal");
                }
            } catch (e) {
                if (!(e instanceof Error) || e !== error) {
                    throw e;
                }
                escaped = true;
            }
            check(escaped === (mode === 2), "nested host identity");
            const after = sa.inspect();
            sameFrame(before, after);
            check(
                after.active?.record === before.active?.record &&
                    after.calls === before.calls &&
                    after.depth === before.depth &&
                    after.steps === before.steps &&
                    ctx.realm === a,
                "X03 outer restoration",
            );
            return normal(number(7));
        }),
    );
    constructor(a, "function C(){bridge();}");
    check(run("new C();", a, sa).type === "normal", "nested construction");
    idle(sa);
    idle(sb);
    check(outerContext !== null && innerContext !== null, "captured contexts");
}
console.log("PASS X03 nested normal/guest/host cleanup");
for (const site of [0, 1, 2]) {
    const r = fresh(),
        s = createScriptSession(),
        c = constructor(r, "function C(){bridge();}"),
        k = shell(r, c),
        o = new GuestObject(),
        target = prepare("side();", r, "nested");
    let calls = 0,
        side = 0,
        retained: OperationContext | null = null;
    define(
        r,
        "side",
        builtin(r, "side", (_t, _a, _c, _l): ValueCompletion => {
            side++;
            return normal();
        }),
    );
    const callback: Builtin = (_t, _args, ctx, _loc): ValueCompletion => {
        calls++;
        retained = ctx;
        hostFault(() => {
            evaluateScript(s, target);
        }, "active");
        return normal(obj(r.objectPrototype));
    };
    define(r, "bridge", builtin(r, "bridge", callback));
    getter(r, k, "prototype", callback);
    property(r, o, wellKnownHasInstance, { value: builtin(r, "hook", callback) });
    define(r, "K", obj(k));
    define(r, "o", obj(o));
    let source: string;
    if (site === 0) {
        source = "new K();";
    } else if (site === 1) {
        source = "new C();";
    } else {
        source = "7 instanceof o;";
    }
    check(run(source, r, s).type === "normal", "X04 outer success");
    check(side === 0 && calls === (site === 0 ? 2 : 1), "X04 no nested effects");
    const other = fresh(),
        os = createScriptSession();
    define(
        other,
        "check",
        builtin(other, "check", (_t, _a, _c, _l): ValueCompletion => {
            const ctx = retained;
            if (ctx === null) {
                throw new Error("retained");
            }
            const before = s.inspect().steps,
                otherBefore = os.inspect().steps;
            hostFault(() => {
                ctx.call(c, UNDEFINED, [], loc);
            }, "inactive Script session");
            check(
                s.inspect().steps === before && os.inspect().steps === otherBefore,
                "X05 no ticks",
            );
            return normal();
        }),
    );
    run("check();", other, os);
    idle(s);
    idle(os);
}
console.log("PASS X04 X05 reentry and captured idle context");
{
    const r = fresh(),
        other = fresh(),
        s = createScriptSession(),
        c = constructor(r),
        k = shell(r, c);
    let calls = 0;
    const m = r.functionPrototype.getOwnProperty(wellKnownHasInstance);
    if (m?.kind !== "data") {
        throw new Error("method");
    }
    const method = object(m.value).callable;
    if (method?.kind !== "builtin") {
        throw new Error("builtin");
    }
    hostFault(() => {
        method.invoke(UNDEFINED, [], context(r), loc);
    }, "Script execution unavailable");
    let guarded: Value = UNDEFINED;
    guarded = builtin(r, "permit", (receiver, args, ctx, l): ValueCompletion => {
        calls++;
        const fn = object(guarded).callable;
        if (fn?.kind !== "builtin") {
            throw new Error("guard");
        }
        const before = s.inspect();
        hostFault(() => {
            fn.invoke(receiver, args, ctx, l);
        }, "Script execution unavailable");
        hostFault(() => {
            fn.invoke(receiver, args, context(r), l);
        }, "Script execution unavailable");
        hostFault(() => {
            fn.invoke(receiver, args, context(other), l);
        }, "Script execution unavailable");
        hostFault(() => {
            method.invoke(receiver, args, ctx, l);
        }, "Script execution unavailable");
        hostFault(() => {
            fn.invoke(number(7), args, ctx, l);
        }, "Script execution unavailable");
        hostFault(() => {
            fn.invoke(receiver, args.slice(), ctx, l);
        }, "Script execution unavailable");
        hostFault(() => {
            fn.invoke(receiver, args, ctx, { line: l.line, column: l.column });
        }, "Script execution unavailable");
        check(
            s.inspect().steps === before.steps &&
                s.inspect().calls === before.calls &&
                s.inspect().active?.record === before.active?.record,
            "X07 tuple denied no state",
        );
        return normal(obj(r.objectPrototype));
    });
    property(r, k, "prototype", { get: guarded });
    define(r, "K", obj(k));
    check(run("new K();", r, s).type === "normal" && calls === 1, "X07 legitimate once");
    const fn = object(c).callable;
    if (fn?.kind !== "script-guest") {
        throw new Error("script");
    }
    const otherC = constructor(other),
        otherFn = object(otherC).callable;
    if (otherFn?.kind !== "script-guest") {
        throw new Error("script");
    }
    for (const bad of [
        new GuestObject(r.functionPrototype, false, fn, otherFn),
        new GuestObject(r.functionPrototype, false, null, fn),
    ]) {
        let gets = 0;
        getter(r, bad, "prototype", (_t, _a, _c, _l): ValueCompletion => {
            gets++;
            return normal();
        });
        define(r, "K", obj(bad));
        hostFault(() => {
            run("new K();", r, s);
        }, "invalid Script constructor metadata");
        check(gets === 0, "X08 before prototype");
        idle(s);
    }
    const legacy = new Realm((_l: string) => {}),
        foreign = obj(
            legacy.createBuiltin("foreign", 0, (_t, _a, _c, _l): ValueCompletion => normal()),
        );
    let lookups = 0;
    getter(r, object(foreign), wellKnownHasInstance, (_t, _a, _c, _l): ValueCompletion => {
        lookups++;
        return normal();
    });
    property(r, r.globalObject, "foreign", { value: foreign, writable: true, configurable: true });
    define(r, "method", m.value);
    hostFault(() => {
        run("7 instanceof foreign;", r, s);
    }, "cross-profile callable invocation");
    hostFault(() => {
        run("method.call(foreign,7);", r, s);
    }, "cross-profile callable invocation");
    check(lookups === 0, "profile before property");
}
console.log("PASS X06 X07 X08 permits slots and profiles");
for (const limit of [0, 1, 64]) {
    for (const hook of [false, true]) {
        const r = fresh(),
            s = createScriptSession({ maxSteps: 100000, maxCalls: limit });
        let source = "new C();";
        if (hook) {
            run("function h(x){return x instanceof o;}", r);
            const o = new GuestObject();
            property(r, o, wellKnownHasInstance, { value: own(r, "h") });
            define(r, "o", obj(o));
            source = "7 instanceof o;";
        } else {
            constructor(r, "function C(){return new C();}");
        }
        const c = run(source, r, s);
        check(
            c.type === "throw" &&
                c.origin.kind === "resource-limit" &&
                c.origin.guardCode === "calls" &&
                c.origin.count === limit &&
                c.origin.limit === limit,
            "X09 call guard",
        );
        idle(s);
    }
}
for (const hook of [false, true]) {
    const r = fresh(),
        out: Value[] = [];
    recorder(r, out);
    if (hook) {
        run("function h(x){return x instanceof o;}", r);
        const o = new GuestObject();
        property(r, o, wellKnownHasInstance, { value: own(r, "h") });
        define(r, "o", obj(o));
    } else {
        constructor(r, "function C(){return new C();}");
    }
    const c = run("try{" + (hook ? "7 instanceof o;" : "new C();") + "}catch(e){out(e);}", r);
    check(
        c.type === "throw" && c.origin.kind === "resource-limit" && out.length === 0,
        "X09 uncaught resource",
    );
}
console.log("PASS X09 default64 recursion and resource catch bypass");
for (const strict of [false, true]) {
    const a = fresh(),
        b = fresh(),
        c = constructor(a, (strict ? '"use strict";' : "") + "function C(){return this;}"),
        k = shell(a, c);
    let called: Value = number(1),
        contextRealm: Realm | null = null;
    getter(a, k, "prototype", (_t, _args, ctx, l): ValueCompletion => {
        const result = ctx.call(c, UNDEFINED, [], l);
        check(result.type === "normal", "X12 ordinary call");
        if (result.type === "normal") {
            called = result.value;
        }
        contextRealm = ctx.realm;
        return normal(number(7));
    });
    define(b, "K", obj(k));
    const result = run("new K();", b);
    check(
        result.type === "normal" &&
            object(result.value).getPrototypeOf() === a.objectPrototype &&
            contextRealm === a,
        "X12 outer constructor",
    );
    check(sameValue(called, strict ? UNDEFINED : a.globalThisValue), "X12 call this binding");
}
console.log("PASS X12 ordinary call from prototype getter");
// Parser/source and evaluator resource guards retain their exact limits.
for (const count of [126, 128]) {
    const source = "(".repeat(count) + "new C()" + ")".repeat(count) + ";",
        r = fresh(),
        p = prepareBoundedScript({ id: "depth", text: source }, r);
    if (count === 126) {
        check(p.kind === "ready", "parse supported depth");
    } else {
        check(
            p.kind === "blocked" &&
                p.rejection.kind === "resource-limit" &&
                p.rejection.guardCode === "parse-depth",
            "parse depth128",
        );
    }
}
for (const count of [100000, 100001]) {
    const source = "new C();" + " ".repeat(count - 8),
        p = prepareBoundedScript({ id: "length", text: source }, fresh());
    if (count === 100000) {
        check(p.kind === "ready", "source boundary");
    } else {
        check(
            p.kind === "blocked" && p.rejection.kind === "resource-limit",
            "source over boundary",
        );
    }
}
{
    const r = fresh();
    constructor(r);
    for (const count of [253, 254]) {
        const source = "new C()" + ".p".repeat(count) + ";",
            s = createScriptSession(),
            c = run(source, r, s);
        if (count === 254) {
            check(
                c.type === "throw" &&
                    c.origin.kind === "resource-limit" &&
                    c.origin.guardCode === "evaluation-depth" &&
                    c.origin.limit === 256,
                "evaluation depth256",
            );
        } else {
            throws(c, "TypeError");
        }
    }
    const s = createScriptSession(),
        c = run("while(true){new C();}", r, s);
    check(
        c.type === "throw" &&
            c.origin.kind === "resource-limit" &&
            c.origin.guardCode === "steps" &&
            c.origin.limit === 100000 &&
            s.inspect().steps === 100001,
        "default100000",
    );
}
for (const source of ["new C();", "x instanceof C;"]) {
    const p = parse(source);
    check(p.error !== null, "legacy source rejection");
}
{
    const r = new Realm((_line: string) => {}),
        e = new Evaluator(r),
        env = new Environment(null);
    let effects = 0;
    const side = obj(
        r.createBuiltin("side", 0, (_t, _a, _ctx, _l): ValueCompletion => {
            effects++;
            return normal();
        }),
    );
    env.bindings.set("side", { initialized: true, mutable: true, value: side });
    const call: Expr = {
        kind: "call",
        loc,
        callee: { kind: "identifier", loc, name: "side" },
        args: [],
    };
    const construct: Expr = { kind: "new", loc, callee: call, args: [call] };
    const instance: Expr = { kind: "binary", loc, op: "instanceof", left: call, right: call };
    hostFault(() => {
        e.evaluate(construct, env, UNDEFINED);
    }, "Script construction unavailable");
    hostFault(() => {
        e.evaluate(instance, env, UNDEFINED);
    }, "Script instanceof unavailable");
    check(effects === 0 && e.calls === 0 && e.depth === 0, "legacy AST no operands");
}
console.log("PASS X10 limits and legacy boundaries");
// Publication, descriptor identity, and callee-owned Realm checks supplement
// the literal rows without changing any historical expected record.
{
    const a = fresh(),
        b = fresh(),
        sink = new GuestObject(b.objectPrototype);
    define(a, "sink", obj(sink));
    let seen: Value = UNDEFINED;
    define(
        a,
        "capture",
        builtin(a, "capture", (_t, args, ctx, _l): ValueCompletion => {
            check(ctx.realm === a, "C13 defining body Realm");
            seen = args[0];
            return normal();
        }),
    );
    constructor(a, "function C(){capture(this);sink.saved=this;throw 7;}");
    define(b, "C", own(a, "C"));
    const c = run("new C();", b);
    check(c.type === "throw" && sameValue(c.value, number(7)), "body abrupt");
    const saved = sink.getOwnProperty("saved");
    check(
        saved?.kind === "data" && sameValue(saved.value, seen) && seen.kind === "object",
        "body side effect retained",
    );
    check(b.globalObject.getOwnProperty("result") === undefined, "no instance publication");
    constructor(a, "function C(){}");
    const f = object(own(a, "C")),
        pd = f.getOwnProperty("prototype");
    if (pd?.kind !== "data") {
        throw new Error("prototype");
    }
    const cd = object(pd.value).getOwnProperty("constructor");
    check(
        cd?.kind === "data" &&
            cd.writable &&
            !cd.enumerable &&
            cd.configurable &&
            sameValue(cd.value, own(a, "C")),
        "D01 constructor descriptor",
    );
    const result = run("new C();", a);
    check(
        result.type === "normal" &&
            object(result.value).getOwnProperty("constructor") === undefined,
        "C04 inherited constructor",
    );
    const hook = builtin(a, "hook", (_t, _args, _ctx, _loc): ValueCompletion => normal(number(1)));
    property(a, f, wellKnownHasInstance, { value: hook });
    expect(run("7 instanceof C;", a), { kind: "boolean", value: true }, "D03 define own hook");
    const strict = prepareStrictScript(
        { id: "strict-construction", text: '"use strict";function C(){this.x=7;}new C().x;' },
        b,
    );
    check(strict.kind === "ready", "strict entry positive");
    if (strict.kind === "ready") {
        expect(
            evaluateScript(createScriptSession(), strict.record).completion,
            number(7),
            "strict entry runtime",
        );
    }
}
console.log("PASS publication descriptors defining Realm and strict entry");
for (const strict of [false, true]) {
    const p = strict ? '"use strict";' : "";
    logCase(
        "grammar chains",
        p +
            "function C(){this.x=7;}var ns={C:C};out(new ns.C instanceof C);out(new ns.C().x);out((new C).x);out(new C().x);",
        "true,7,7,7",
    );
    throws(run(p + "function C(){}new (new C())();", fresh()), "TypeError");
    logCase(
        "retained function source",
        p +
            "function C(f){this.f=f;}var c=new C(function(){return 11;});out(c.f.name);out(c.f.toString());",
        ",function(){return 11;}",
    );
    logCase(
        "NoIn instanceof",
        p + "function C(){}var x=new C;for(var yes=x instanceof C;yes;yes=false){out(yes);}",
        "true",
    );
}
console.log("PASS constructor grammar and original source associations");
for (const text of ["new", "-", "+", "!", "delete", "typeof", "void"]) {
    expect(run('"' + text + '";', fresh()), { kind: "string", value: text }, "literal primary");
    const r = fresh();
    let args = 0;
    define(
        r,
        "arg",
        builtin(r, "arg", (_t, _a, _c, _l): ValueCompletion => {
            args++;
            return normal();
        }),
    );
    throws(run('new "' + text + '"(arg());', r), "TypeError");
    check(args === 1, "literal constructor evaluates arguments");
}
console.log("PASS new keyword versus string literal grammar");
{
    const a = fresh(),
        r = fresh(),
        log: string[] = [],
        p = new GuestObject(a.objectPrototype);
    let bodyThis: Value = UNDEFINED;
    define(
        a,
        "body",
        builtin(a, "body", (_t, args, ctx, _l): ValueCompletion => {
            check(ctx.realm === a, "body owner");
            bodyThis = args[0];
            log.push("C");
            return normal();
        }),
    );
    const c = constructor(a, "function C(x,y){body(this);this.x=x;this.y=y;}"),
        k = shell(a, c),
        o = new GuestObject();
    getter(a, p, "constructor", (_t, _args, _ctx, _l): ValueCompletion => {
        throw new Error("prototype.constructor read");
    });
    getter(a, k, "prototype", (t, _args, ctx, _l): ValueCompletion => {
        check(sameValue(t, obj(k)) && ctx.realm === a, "prototype receiver");
        log.push("P");
        return normal(obj(p));
    });
    getter(r, o, "C", (t, _args, _ctx, _l): ValueCompletion => {
        check(sameValue(t, obj(o)), "callee receiver");
        log.push("G");
        return normal(obj(k));
    });
    define(r, "o", obj(o));
    for (const name of ["a", "b"]) {
        define(
            r,
            name,
            builtin(r, name, (_t, _args, _ctx, _l): ValueCompletion => {
                log.push(name === "a" ? "A" : "B");
                return normal(number(name === "a" ? 7 : 11));
            }),
        );
    }
    const result = run("new o.C(a(),b());", r);
    check(
        result.type === "normal" &&
            sameValue(result.value, bodyThis) &&
            object(result.value).getPrototypeOf() === p &&
            log.join(",") === "G,A,B,P,C",
        "complete construction order",
    );
    define(r, "K", obj(k));
    log.length = 0;
    const s = createScriptSession({ maxSteps: 100000, maxCalls: 0 }),
        limited = run("new K();", r, s);
    check(
        limited.type === "throw" &&
            limited.origin.kind === "resource-limit" &&
            limited.origin.guardCode === "calls" &&
            log.length === 0,
        "call limit before prototype",
    );
}
console.log("PASS callee arguments prototype allocation body order");
