class Box {}
type Value = { kind: "string"; value: string } | { kind: "object"; object: Box };
type Reference = { kind: "binding"; name: string } | { kind: "property"; key: Value; readonly strict?: boolean };
function object(): Value { return { kind: "object", object: new Box() }; }
function cache(ref: Reference): void { if (ref.kind === "property") ref.key = { kind: "string", value: "saved" }; }
const ref = { kind: "property" as const, key: object() };
cache(ref);
console.log(ref.key.kind);
