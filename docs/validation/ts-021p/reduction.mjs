// Independently check the smallest retained failure using literal rationals.
// binary64 0.3 = 5404319552844595 / 2^54; its predecessor is one 2^-54 below.
// Their midpoint is 10808639105689189 / 2^55. No floating-point operation here.
let numerator = 0n;
const digits = '0220022002200220022002200220022002';
for (const digit of digits) numerator = numerator * 3n + BigInt(digit);
const denominator = 3n ** BigInt(digits.length);
const difference = 10808639105689189n * denominator - numerator * (2n ** 55n);
console.log('rendered rational: ' + numerator + '/' + denominator);
console.log('lower midpoint: 10808639105689189/36028797018963968');
console.log('positive cross-product difference: ' + difference);
if (difference <= 0n) throw new Error('reduction did not reproduce');
console.log('CONFIRMED: rendered base-3 value lies below the binary64 rounding interval');
