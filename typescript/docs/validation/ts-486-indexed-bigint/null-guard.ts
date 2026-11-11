function value(flag: boolean): bigint | null { return flag ? 2n : null; }
function test(flag: boolean): bigint | null { const result = value(flag); if (result === null) return null; return 3n - result; }
console.log(String(test(true)), String(test(false)));
