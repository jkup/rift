function value(flag: boolean): bigint | null { const values: bigint[] = [2n]; return flag ? (values[0] as bigint) : null; }
function test(flag: boolean): bigint | null { const result = value(flag); if (result === null) return null; return 3n - result; }
console.log(String(test(true)), String(test(false)));
