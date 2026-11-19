class Box {}
type Value = { kind: "string"; value: string } | { kind: "object"; object: Box };
type Reference = { kind: "binding"; name: string } | { kind: "property"; base: Value; key: Value };
type EngineReference = Reference | { kind: "script-property"; reference: Reference; strict: boolean };
type Result = { kind: "normal"; value: Value } | { kind: "throw"; value: Value };
const payload: Value = { kind: "object", object: new Box() };
const abrupt: Result = { kind: "throw", value: payload };
let conversions = 0;
function key(ref: Reference): void { if(ref.kind === "property" && ref.key.kind === "object") { conversions++; ref.key = { kind: "string", value: "saved" }; } }
function put(ref: Reference, value: Value, succeeds: boolean, throws: boolean, strict = true): Result {
    key(ref);
    if (throws) return abrupt;
    if (ref.kind === "binding" || (!succeeds && strict)) return { kind: "throw", value };
    return { kind: "normal", value };
}
function remove(ref: Reference, succeeds: boolean, throws: boolean, strict = true): Result {
    key(ref);
    if (throws) return abrupt;
    if (!succeeds && strict) return { kind: "throw", value: payload };
    return { kind: "normal", value: payload };
}
function read(ref: EngineReference): Value {
    const inner = ref.kind === "script-property" ? ref.reference : ref;
    key(inner);
    if (inner.kind !== "property") throw new Error("property");
    return inner.base;
}
function write(ref: EngineReference, value: Value): Result {
    return ref.kind === "script-property" ? put(ref.reference, value, false, false, ref.strict) : put(ref, value, false, false);
}
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const inner: Reference = { kind: "property", base: payload, key: { kind: "object", object: new Box() } };
const wrapped: EngineReference = { kind: "script-property", reference: inner, strict: false };
check(read(wrapped) === payload, "control 1");
check(wrapped.reference === inner && inner.key.kind === "string" && conversions === 1, "control 2");
const assigned = write(wrapped, payload);
check(assigned.kind === "normal" && assigned.value === payload && conversions === 1, "control 3");
check(put(inner, payload, false, false).kind === "throw", "control 4");
check(remove(inner, false, false).kind === "throw", "control 5");
check(remove(inner, false, false, false).kind === "normal", "control 6");
check(put(inner, payload, false, true, false) === abrupt && remove(inner, false, true, false) === abrupt, "control 7");
check(put({kind:"binding",name:"missing"}, payload, false, false, false).kind === "throw", "control 8");
function object(): Value { return {kind:"object",object:new Box()}; }
const inferred = { kind: "property" as const, base: object(), key: object() };
key(inferred);check(inferred.key.kind === "string", "inferred");
console.log("PASS wrapper identity cached mutation receiver default strict sloppy abrupt binding");
