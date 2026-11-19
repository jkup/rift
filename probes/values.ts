// Probe: a discriminated-union Value type, the representation the plan prefers.
// Exercises narrowing, switch dispatch on the tag, arrays of values, and a
// helper that returns the union.

type Value =
    | { kind: "undefined" }
    | { kind: "null" }
    | { kind: "boolean"; value: boolean }
    | { kind: "number"; value: number }
    | { kind: "string"; value: string }
    | { kind: "object"; object: GuestObject };

class GuestObject {
    className: string;
    constructor(className: string) {
        this.className = className;
    }
}

const UNDEFINED: Value = { kind: "undefined" };
const NULL: Value = { kind: "null" };

function num(value: number): Value {
    return { kind: "number", value };
}

function str(value: string): Value {
    return { kind: "string", value };
}

function bool(value: boolean): Value {
    return { kind: "boolean", value };
}

function typeOf(v: Value): string {
    switch (v.kind) {
        case "undefined":
            return "undefined";
        case "null":
            return "object";
        case "boolean":
            return "boolean";
        case "number":
            return "number";
        case "string":
            return "string";
        case "object":
            return "object";
    }
}

function toBoolean(v: Value): boolean {
    switch (v.kind) {
        case "undefined":
        case "null":
            return false;
        case "boolean":
            return v.value;
        case "number":
            return !(v.value === 0 || Number.isNaN(v.value));
        case "string":
            return v.value.length > 0;
        case "object":
            return true;
    }
}

function show(v: Value): string {
    if (v.kind === "number") return `num(${v.value})`;
    if (v.kind === "string") return `str(${JSON.stringify(v.value)})`;
    if (v.kind === "boolean") return `bool(${v.value})`;
    if (v.kind === "object") return `obj(${v.object.className})`;
    return v.kind;
}

const obj = new GuestObject("Point");
const values: Value[] = [
    UNDEFINED,
    NULL,
    bool(true),
    num(0),
    num(-0),
    num(NaN),
    num(42),
    str(""),
    str("hi"),
    { kind: "object", object: obj },
];

for (const v of values) {
    console.log(show(v), typeOf(v), toBoolean(v));
}

// Mutating a value array in place and reading back through the union.
values[3] = str("replaced");
console.log("after replace:", show(values[3]));

// Same object reachable from two Values: identity must be shared, not copied.
const a: Value = { kind: "object", object: obj };
const b: Value = { kind: "object", object: obj };
if (a.kind === "object" && b.kind === "object") {
    a.object.className = "Renamed";
    console.log("shared identity:", b.object.className, a.object === b.object);
}
