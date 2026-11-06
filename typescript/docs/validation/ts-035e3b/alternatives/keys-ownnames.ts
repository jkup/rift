function keys(value: object, expected: string[]): boolean {
    let count = 0;
    for (const key of Object.getOwnPropertyNames(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && descriptor.enumerable) {
            if (!expected.includes(key)) return false;
            count++;
        }
    }
    return count === expected.length;
}
console.log(keys({ mode: process.argv[2] }, ["mode"]));
