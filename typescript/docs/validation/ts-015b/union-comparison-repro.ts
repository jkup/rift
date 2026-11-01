type Value = { kind: "number"; value: number } | { kind: "object"; id: number };
type Throw = { type: "throw"; value: Value };
type Define = { type: "normal"; value: boolean } | Throw;
type Call = { type: "normal"; value: Value } | Throw;
function mixed(result: Define | Call, original: Value, assignment: boolean): boolean {
    return result.type === "normal" && (assignment ? result.value === original : result.value === true);
}
function exact(result: Define, captured: Call): boolean {
    return result === captured && result.type === "throw";
}
function normal(): Call { return { type: "normal", value: { kind: "number", value: 2 } }; }
function capturedNormal(result: Define): boolean {
    let captured: Call = normal();
    return result === captured && result.type === "throw";
}
console.log(capturedNormal({ type: "normal", value: true }));
console.log(mixed({ type: "normal", value: true }, { kind: "number", value: 2 }, false));
console.log(exact({ type: "normal", value: true }, { type: "normal", value: { kind: "number", value: 2 } }));
