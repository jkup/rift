class SymbolKey { constructor(readonly description: string) {} }
type Key = string | SymbolKey;
const keys: Key[] = ["message"];
console.log(keys.join(",") === "message");
