// Reduced from F2: PropertyKey[] includes identity-bearing symbol objects.
class Key { constructor(readonly label: string) {} }
const keys: (string | Key)[] = [process.argv[2] ?? "name", new Key("symbol")];
console.log(keys.join(","));
