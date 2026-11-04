class Box {}
type Value = { kind: "string"; value: string } | { kind: "object"; object: Box };
type Reference = { kind: "binding"; name: string } | { kind: "property"; base: Value; key: Value };
const payload: Value = { kind: "object", object: new Box() };
function cache(ref: Reference): void { if (ref.kind === "property") ref.key = {kind:"string",value:"saved"}; }
const inferred = { kind: "property" as const, base: payload, key: {kind:"object",object:new Box()} as Value };
cache(inferred);
console.log(inferred.key.kind);
