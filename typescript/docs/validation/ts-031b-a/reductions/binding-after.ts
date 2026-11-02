type Value = { kind: "number"; value: number } | { kind: "undefined" };
type Binding = { initialized: boolean; mutable: boolean; value: Value };
const bindings = new Map<string, Binding>();
const value: Value = { kind: "number", value: 8 };
const binding: Binding = { initialized: true, mutable: true, value };
bindings.set("x", binding);
console.log(bindings.get("x") === binding);
