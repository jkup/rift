import { epochDayToISODate, isoDateToEpochDay, isoDayOfWeek, isISOLeapYear } from "../src/iso-calendar.js";
import { isoDateWithinLimits, isoDayOfYear, isoWeekOfYear } from "../src/iso-calendar-fields.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const cases = [
    [1970,1,1,1,1970,1], [2000,1,1,1,1999,52], [2000,12,31,366,2000,52],
    [2004,12,31,366,2004,53], [2005,1,1,1,2004,53], [2007,12,31,365,2008,1],
    [2009,12,31,365,2009,53], [2010,1,3,3,2009,53], [2010,1,4,4,2010,1],
    [2015,12,31,365,2015,53], [2016,1,3,3,2015,53], [2016,1,4,4,2016,1],
    [2019,12,30,364,2020,1], [2020,12,31,366,2020,53], [2021,1,1,1,2020,53],
    [1900,3,1,60,1900,9], [2000,3,1,61,2000,9], [0,1,1,1,-1,52],
];
for (const item of cases) {
    const date = { year:item[0], month:item[1], day:item[2] }, week = isoWeekOfYear(date);
    check(isoDayOfYear(date)===item[3],"ordinal "+item[0]+"-"+item[1]+"-"+item[2]);
    check(week!==null&&week.year===item[4]&&week.week===item[5],"week "+item[0]+"-"+item[1]+"-"+item[2]);
}
check(isoDateWithinLimits({year:-271821,month:4,day:19}),"minimum date");
check(!isoDateWithinLimits({year:-271821,month:4,day:18}),"before minimum");
check(isoDateWithinLimits({year:275760,month:9,day:13}),"maximum date");
check(!isoDateWithinLimits({year:275760,month:9,day:14}),"after maximum");
for (const date of [{year:2023,month:2,day:29},{year:2024,month:13,day:1},{year:1.5,month:1,day:1}])
    check(isoDayOfYear(date)===null&&isoWeekOfYear(date)===null&&!isoDateWithinLimits(date),"invalid date");
const first = isoDateToEpochDay({year:2000,month:1,day:1});
if (first===null) throw new Error("cycle start");
for (let offset=0;offset<146097;offset++) {
    const day=first+offset,date=epochDayToISODate(day);
    if(date===null)throw new Error("cycle date");
    const weekday=isoDayOfWeek(date),week=isoWeekOfYear(date),ordinal=isoDayOfYear(date);
    if(weekday===null||week===null||ordinal===null)throw new Error("cycle fields");
    const thursday=epochDayToISODate(day+4-weekday);
    if(thursday===null)throw new Error("week Thursday");
    check(week.year===thursday.year,"week belongs to Thursday year");
    const jan4=isoDateToEpochDay({year:week.year,month:1,day:4});
    if(jan4===null)throw new Error("January fourth");
    const jan4weekday=isoDayOfWeek({year:week.year,month:1,day:4});
    if(jan4weekday===null)throw new Error("January weekday");
    check(day===jan4-jan4weekday+1+(week.week-1)*7+weekday-1,"week reconstruction");
    const jan1=isoDateToEpochDay({year:date.year,month:1,day:1});
    check(jan1!==null&&ordinal===day-jan1+1&&ordinal<=(isISOLeapYear(date.year)?366:365),"ordinal reconstruction");
}
console.log("iso calendar fields passed");
