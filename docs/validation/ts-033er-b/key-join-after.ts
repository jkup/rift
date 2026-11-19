class Key { constructor(readonly text: string) {} }
const keys: (string | Key)[] = ["name", "length"];
if (keys.length !== 2 || keys[0] !== "name" || keys[1] !== "length") throw new Error("keys");
console.log("name,length");
