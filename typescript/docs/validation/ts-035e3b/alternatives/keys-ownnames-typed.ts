function keys(value: object, expected: string[]): boolean {
    const actual: string[] = Object.getOwnPropertyNames(value);
    let count = 0;
    for (let n = 0; n < actual.length; n++) {
        const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, actual[n]);
        if (descriptor !== undefined && descriptor.enumerable) {
            if (!expected.includes(actual[n])) return false;
            count++;
        }
    }
    return count === expected.length;
}
console.log(keys({ mode: process.argv[2] }, ["mode"]));
