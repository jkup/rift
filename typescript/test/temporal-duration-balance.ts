import { balanceDurationTime, largestDurationUnit, type DurationUnit } from "../src/temporal-duration-balance.js";
import { durationTimeNanoseconds, type DurationFields } from "../src/temporal-duration.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const zero: DurationFields = { years:0, months:0, weeks:0, days:0, hours:0, minutes:0, seconds:0, milliseconds:0, microseconds:0, nanoseconds:0 };
const units: DurationUnit[] = ["years","months","weeks","days","hours","minutes","seconds","milliseconds","microseconds","nanoseconds"];
const amount = 93784005006007n;
const expected = [
    [1,2,3,4,5,6,7], [1,2,3,4,5,6,7], [1,2,3,4,5,6,7], [1,2,3,4,5,6,7],
    [0,26,3,4,5,6,7], [0,0,1563,4,5,6,7], [0,0,0,93784,5,6,7],
    [0,0,0,0,93784005,6,7], [0,0,0,0,0,93784005006,7], [0,0,0,0,0,0,93784005006007],
];
for (let i=0;i<units.length;i++) {
    for (const sign of [1,-1]) {
        const result = balanceDurationTime(BigInt(sign)*amount,zero,units[i]);
        check(result !== null, "valid balance "+units[i]);
        if (result === null) throw new Error("balance");
        const actual = [result.days,result.hours,result.minutes,result.seconds,result.milliseconds,result.microseconds,result.nanoseconds];
        for (let j=0;j<actual.length;j++) check(actual[j]===sign*expected[i][j],"field "+units[i]+" "+j);
        check(BigInt(result.days)*86400000000000n+durationTimeNanoseconds(result)===BigInt(sign)*amount,"exact reconstruction");
    }
    const value: DurationFields = { years:i===0?1:0, months:i===1?1:0, weeks:i===2?1:0, days:i===3?1:0,
        hours:i===4?1:0, minutes:i===5?1:0, seconds:i===6?1:0, milliseconds:i===7?1:0, microseconds:i===8?1:0, nanoseconds:i===9?1:0 };
    check(largestDurationUnit(value)===units[i],"largest "+units[i]);
}
check(largestDurationUnit(zero)==="nanoseconds","blank largest");
const calendar = { ...zero, years:1, months:2, weeks:3, days:4 };
const carried = balanceDurationTime(amount,calendar,"years");
check(carried!==null&&carried.years===1&&carried.months===2&&carried.weeks===3&&carried.days===5,"calendar preservation");
check(balanceDurationTime(-1n,calendar,"seconds")===null,"mixed signs rejected");
const unsafe = balanceDurationTime(9007199254740993n,zero,"nanoseconds");
check(unsafe!==null&&unsafe.nanoseconds===9007199254740992,"Number field storage rounds once");
const exact = balanceDurationTime(9007199254740993n,zero,"seconds");
check(exact!==null&&exact.seconds===9007199&&exact.milliseconds===254&&exact.microseconds===740&&exact.nanoseconds===993,"seconds preserve exact remainder");
const bound=9007199254740992000000000n;
check(balanceDurationTime(bound,zero,"seconds")===null&&balanceDurationTime(-bound,zero,"seconds")===null,"time boundary");
const edge=balanceDurationTime(bound-1n,zero,"seconds");
check(edge!==null&&edge.seconds===9007199254740991&&edge.milliseconds===999&&edge.microseconds===999&&edge.nanoseconds===999,"one below boundary");
console.log("temporal duration balance passed");
