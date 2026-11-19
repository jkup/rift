// Probe: how built-in functions could be represented. Option A is a table of
// host function values with a uniform signature; option B is a numeric
// built-in id and a switch. Both must keep identity when stored and passed.

type Value = { kind: "number"; value: number } | { kind: "string"; value: string };

type NativeFunction = (thisValue: Value, args: Value[]) => Value;

class BuiltinFunction {
    name: string;
    length: number;
    impl: NativeFunction;
    constructor(name: string, length: number, impl: NativeFunction) {
        this.name = name;
        this.length = length;
        this.impl = impl;
    }
}

function arg(args: Value[], i: number): Value {
    return i < args.length ? args[i] : { kind: "number", value: NaN };
}

function toNum(v: Value): number {
    return v.kind === "number" ? v.value : Number(v.value);
}

// Option A: function values in a Map.
const table: Map<string, BuiltinFunction> = new Map();
table.set(
    "max",
    new BuiltinFunction("max", 2, (_t, args) => {
        let best = -Infinity;
        for (const a of args) {
            best = Math.max(best, toNum(a));
        }
        return { kind: "number", value: best };
    }),
);
table.set(
    "concat",
    new BuiltinFunction("concat", 1, (t, args) => {
        let s = t.kind === "string" ? t.value : String(t.value);
        for (const a of args) {
            s += a.kind === "string" ? a.value : String(a.value);
        }
        return { kind: "string", value: s };
    }),
);

// A closure-producing factory: each built-in captures its own state.
function makeCounter(start: number): BuiltinFunction {
    let count = start;
    // Declare the full signature: an arrow with fewer parameters is adapted
    // through scriptc's dynamic tier.
    return new BuiltinFunction("counter", 0, (_thisValue, _args) => {
        count += 1;
        return { kind: "number", value: count };
    });
}
table.set("counter", makeCounter(10));

function show(v: Value): string {
    return v.kind === "number" ? String(v.value) : JSON.stringify(v.value);
}

const none: Value = { kind: "number", value: 0 };
const maxFn = table.get("max");
if (maxFn !== undefined) {
    console.log(
        maxFn.name,
        maxFn.length,
        show(
            maxFn.impl(none, [
                { kind: "number", value: 3 },
                { kind: "string", value: "7" },
            ]),
        ),
    );
    console.log("missing arg:", show(arg([], 0)));
}
const concat = table.get("concat");
if (concat !== undefined) {
    console.log(
        show(
            concat.impl({ kind: "string", value: "a" }, [
                { kind: "number", value: 1 },
                { kind: "string", value: "b" },
            ]),
        ),
    );
}
const counter = table.get("counter");
if (counter !== undefined) {
    counter.impl(none, []);
    console.log("counter:", show(counter.impl(none, [])));
    // Identity survives storage in another container.
    const list: BuiltinFunction[] = [counter];
    console.log("identity:", list[0] === counter, list[0].impl === counter.impl);
}

// Option B: numeric ids and a switch.
const enum BuiltinId {
    MathAbs,
    MathFloor,
    StringLength,
}

function callBuiltin(id: BuiltinId, args: Value[]): Value {
    switch (id) {
        case BuiltinId.MathAbs:
            return { kind: "number", value: Math.abs(toNum(arg(args, 0))) };
        case BuiltinId.MathFloor:
            return { kind: "number", value: Math.floor(toNum(arg(args, 0))) };
        case BuiltinId.StringLength: {
            const a = arg(args, 0);
            return { kind: "number", value: a.kind === "string" ? a.value.length : 0 };
        }
    }
}

console.log(
    "by id:",
    show(callBuiltin(BuiltinId.MathAbs, [{ kind: "number", value: -4 }])),
    show(callBuiltin(BuiltinId.MathFloor, [{ kind: "number", value: -1.5 }])),
    show(callBuiltin(BuiltinId.StringLength, [{ kind: "string", value: "hello" }])),
);
