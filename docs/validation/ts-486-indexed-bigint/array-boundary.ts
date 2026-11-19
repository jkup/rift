function boundary(flag: boolean): bigint | null { return value(flag) as bigint | null; }
function value(flag: boolean): bigint | null { const values: bigint[] = [2n]; return flag ? values[0] : null; }
function test(flag: boolean): bigint | null { const result = boundary(flag); if (result === null) return null; return 3n - result; }
console.log(String(test(true)), String(test(false)));
