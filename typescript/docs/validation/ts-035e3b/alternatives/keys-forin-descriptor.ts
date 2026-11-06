function keys(value: object, expected: string[]): boolean {
    let count = 0;
    for (const key in value) if (Object.getOwnPropertyDescriptor(value, key) !== undefined) {
        if (!expected.includes(key)) return false;
        count++;
    }
    return count === expected.length;
}
console.log(keys({ mode: process.argv[2] }, ["mode"]));
