function keys(value: object, expected: string[]): boolean {
    const actual = Object.keys(value);
    return actual.length === expected.length && expected.every(key => actual.includes(key));
}
console.log(keys({ mode: "conformance" }, ["mode"]));
