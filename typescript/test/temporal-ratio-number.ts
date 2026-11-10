import { temporalRatioToNumber } from "../src/temporal-ratio-number.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const numerators=[0n,1n,1n,2n,9007199254740993n,9007199254740995n,9007199254740993n,9007199254740993n,9007199254740995n,18014398509481983n,86400000000001n,9007199254740991999999999n];
const denominators=[1n,3n,86400000000000n,3n,1n,1n,3n,9007199254740992n,9007199254740992n,9007199254740992n,86400000000000n,1000000000n];
const expected=[0,0.3333333333333333,1.1574074074074074e-14,0.6666666666666666,9007199254740992,9007199254740996,3002399751580331,1,1.0000000000000004,2,1.0000000000000115,9007199254740992];
for(let i=0;i<numerators.length;i++) {
    const numerator=numerators[i],denominator=denominators[i];
    if(numerator===undefined||denominator===undefined)throw new Error("ratio case index");
    for(const sign of [1,-1])check(temporalRatioToNumber(BigInt(sign)*numerator,denominator)===sign*expected[i],"signed ratio "+i);
}
check(1/temporalRatioToNumber(0n,1n)===Infinity,"positive zero");
for(let exponent=-60;exponent<=80;exponent++) {
    const numerator=exponent>=0?1n<<BigInt(exponent):1n;
    const denominator=exponent>=0?1n:1n<<BigInt(-exponent);
    check(temporalRatioToNumber(numerator,denominator)===2**exponent,"power of two "+exponent);
}
for(let whole=1;whole<=100;whole++) {
    const n=BigInt(whole)*86400000000000n;
    check(temporalRatioToNumber(n,86400000000000n)===whole,"exact day "+whole);
}
console.log("temporal ratio number passed");
