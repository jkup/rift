import { combineISODateTime, isoDateTimeWithinLimits } from "../src/iso-date-time.js";
import { isoDateTimeFromEpochNanoseconds, isoDateTimeToEpochNanoseconds, epochNanosecondsFromUTC, MAX_EPOCH_NANOSECONDS } from "../src/iso-calendar.js";
import { NANOSECONDS_PER_DAY } from "../src/temporal-time.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const midnight = {hour:0,minute:0,second:0,millisecond:0,microsecond:0,nanosecond:0};
const minDate = {year:-271821,month:4,day:19}, maxDate = {year:275760,month:9,day:13};
const minimum = combineISODateTime(minDate,midnight);
check(!isoDateTimeWithinLimits(minimum),"minimum midnight excluded");
check(isoDateTimeToEpochNanoseconds(minimum)===-MAX_EPOCH_NANOSECONDS-NANOSECONDS_PER_DAY,"internal minimum conversion");
const first = combineISODateTime(minDate,{hour:0,minute:0,second:0,millisecond:0,microsecond:0,nanosecond:1});
check(isoDateTimeWithinLimits(first),"minimum plus one nanosecond");
const last = combineISODateTime(maxDate,{hour:23,minute:59,second:59,millisecond:999,microsecond:999,nanosecond:999});
check(isoDateTimeWithinLimits(last),"maximum minus one nanosecond");
check(isoDateTimeToEpochNanoseconds(last)===MAX_EPOCH_NANOSECONDS+NANOSECONDS_PER_DAY-1n,"internal maximum conversion");
const after = combineISODateTime({year:275760,month:9,day:14},midnight);
check(!isoDateTimeWithinLimits(after),"maximum midnight excluded");
check(isoDateTimeToEpochNanoseconds(after)===MAX_EPOCH_NANOSECONDS+NANOSECONDS_PER_DAY,"internal excluded endpoint");
check(epochNanosecondsFromUTC(first)===null&&epochNanosecondsFromUTC(last)===null,"Instant range remains narrower");
for(const value of [-MAX_EPOCH_NANOSECONDS-NANOSECONDS_PER_DAY,-MAX_EPOCH_NANOSECONDS-1n,-MAX_EPOCH_NANOSECONDS,-1n,0n,1n,MAX_EPOCH_NANOSECONDS,MAX_EPOCH_NANOSECONDS+1n,MAX_EPOCH_NANOSECONDS+NANOSECONDS_PER_DAY-1n]) {
    const record=isoDateTimeFromEpochNanoseconds(value);
    check(record!==null,"bounded conversion");
    if(record===null)throw new Error("record");
    check(isoDateTimeToEpochNanoseconds(record)===value,"nanosecond round trip");
    check(isoDateTimeWithinLimits(record)===(value>-MAX_EPOCH_NANOSECONDS-NANOSECONDS_PER_DAY),"strict lower boundary");
}
for(let day=-100000000;day<=100000000;day+=100003) {
    const value=BigInt(day)*NANOSECONDS_PER_DAY+12345678901234n;
    const record=isoDateTimeFromEpochNanoseconds(value);
    check(record!==null&&isoDateTimeWithinLimits(record)&&isoDateTimeToEpochNanoseconds(record)===value,"signed broad-range round trip");
}
for(const date of [{year:2023,month:2,day:29},{year:2024,month:13,day:1},{year:2024,month:1,day:0},{year:1.5,month:1,day:1}])
    check(!isoDateTimeWithinLimits(combineISODateTime(date,midnight)),"invalid date");
for(const time of [
    {hour:24,minute:0,second:0,millisecond:0,microsecond:0,nanosecond:0},
    {hour:0,minute:60,second:0,millisecond:0,microsecond:0,nanosecond:0},
    {hour:0,minute:0,second:0,millisecond:0,microsecond:0,nanosecond:-1},
    {hour:0,minute:0,second:0,millisecond:0,microsecond:0,nanosecond:0.5},
]) check(!isoDateTimeWithinLimits(combineISODateTime({year:2024,month:1,day:1},time)),"invalid time");
console.log("iso date time passed");
