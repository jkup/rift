class SymbolKey { constructor(readonly description: string) {} }
type Key = string | SymbolKey;
function keysEqual(actual: Key[], expected: string[]): boolean {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) return false;
    return true;
}
console.log(keysEqual(["message"], ["message"]));
console.log(keysEqual([new SymbolKey("message")], ["message"]));
console.log(keysEqual(["name", "message"], ["message", "name"]));
console.log(keysEqual(["message", "extra"], ["message"]));
