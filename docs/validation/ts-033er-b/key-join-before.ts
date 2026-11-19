class Key { constructor(readonly text: string) {} }
const keys: (string | Key)[] = ["name", "length"];
console.log(keys.join());
