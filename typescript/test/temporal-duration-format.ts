import { formatTemporalDuration } from "../src/temporal-duration-format.js";
import type { DurationFields } from "../src/temporal-duration.js";
function check(ok:boolean,message:string):void {if(!ok)throw new Error(message);}
function duration(years=0,months=0,weeks=0,days=0,hours=0,minutes=0,seconds=0,milliseconds=0,microseconds=0,nanoseconds=0):DurationFields {
    return {years,months,weeks,days,hours,minutes,seconds,milliseconds,microseconds,nanoseconds};
}
check(formatTemporalDuration(duration())==='PT0S','zero');
check(formatTemporalDuration(duration(-0))==='PT0S','negative zero');
check(formatTemporalDuration(duration(1))==='P1Y','years');
check(formatTemporalDuration(duration(0,2))==='P2M','months');
check(formatTemporalDuration(duration(0,0,3))==='P3W','weeks');
check(formatTemporalDuration(duration(0,0,0,4))==='P4D','days');
check(formatTemporalDuration(duration(0,0,0,0,5))==='PT5H','hours');
check(formatTemporalDuration(duration(0,0,0,0,0,6))==='PT6M','minutes');
check(formatTemporalDuration(duration(1,2,3,4,5,6,7,8,9,10))==='P1Y2M3W4DT5H6M7.00800901S','all fields');
check(formatTemporalDuration(duration(-1,-2,-3,-4,-5,-6,-7,-8,-9,-10))==='-P1Y2M3W4DT5H6M7.00800901S','negative fields');
check(formatTemporalDuration(duration(0,0,0,0,0,0,3600))==='PT3600S','do not balance seconds into hours');
check(formatTemporalDuration(duration(0,0,0,0,25,90))==='PT25H90M','preserve larger fields');
check(formatTemporalDuration(duration(0,0,0,0,0,0,0,1000,1000,1000))==='PT1.001001S','balance subseconds into seconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,0,9007199254740992))==='PT9007199254740.992S','unsafe milliseconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,0,0,9007199254740992))==='PT9007199254.740992S','unsafe microseconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,0,0,0,9007199254740992))==='PT9007199.254740992S','unsafe nanoseconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,9007199254740991,999,999,999))==='PT9007199254740991.999999999S','maximum exact seconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,-9007199254740991,-999,-999,-999))==='-PT9007199254740991.999999999S','negative maximum exact seconds');
const value=duration(0,0,0,0,0,0,7,123,456,789);
const expected=['PT7S','PT7.1S','PT7.12S','PT7.123S','PT7.1234S','PT7.12345S','PT7.123456S','PT7.1234567S','PT7.12345678S','PT7.123456789S'];
for(let i=0;i<expected.length;i++)check(formatTemporalDuration(value,i)===expected[i],'precision '+i);
check(formatTemporalDuration(duration(1),0)==='P1YT0S','explicit zero digits forces seconds');
check(formatTemporalDuration(duration(1),9)==='P1YT0.000000000S','explicit digits force seconds');
check(formatTemporalDuration(duration(0,0,0,0,0,0,0,100))==='PT0.1S','trim fraction zeros');
for(const digits of [-1,10,0.5,NaN,Infinity])check(formatTemporalDuration(value,digits)===null,'invalid precision');
check(formatTemporalDuration(duration(1,-1))===null,'invalid signs');
check(formatTemporalDuration(duration(0,0,0,0,0,0,Infinity))===null,'invalid value');
console.log('temporal duration format passed');
