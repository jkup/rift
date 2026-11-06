function keys(value: object, expected: string[]): boolean {
    const actual: (string | symbol)[] = Reflect.ownKeys(value);
    let count = 0;
    for (const key of actual) if (typeof key === "string") {
        const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && descriptor.enumerable) {
            if (!expected.includes(key)) return false;
            count++;
        }
    }
    return count === expected.length;
}
console.log(keys({ mode: process.argv[2] }, ["mode"]));
