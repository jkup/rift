import { roundDateDifference } from "../src/temporal-date-round.js";
import type { ISODate } from "../src/iso-calendar.js";
import type { DateDifferenceUnit } from "../src/iso-calendar-difference.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";

function expect(start: ISODate, end: ISODate, largest: DateDifferenceUnit, smallest: DateDifferenceUnit, increment: number, mode: TemporalRoundingMode, expected: number[]): void {
    const result = roundDateDifference(start,end,largest,smallest,increment,mode);
    if(result===null||result.years!==expected[0]||result.months!==expected[1]||result.weeks!==expected[2]||result.days!==expected[3])
        throw new Error(largest+"/"+smallest+"/"+increment+"/"+mode+": "+(result===null?"null":result.years+","+result.months+","+result.weeks+","+result.days));
}
const jan31={year:2023,month:1,day:31}, feb28={year:2023,month:2,day:28};
expect(jan31,feb28,"month","day",1,"ceil",[0,0,0,28]);
expect(jan31,feb28,"month","day",2,"ceil",[0,0,0,28]);
expect(jan31,feb28,"month","day",10,"ceil",[0,1,0,0]);
expect(jan31,feb28,"month","day",10,"trunc",[0,0,0,20]);
expect(jan31,feb28,"month","month",1,"trunc",[0,1,0,0]);
expect({year:2020,month:2,day:29},{year:2021,month:2,day:28},"year","month",1,"trunc",[1,0,0,0]);
expect({year:2023,month:1,day:1},{year:2023,month:12,day:31},"year","month",1,"ceil",[1,0,0,0]);
expect({year:2024,month:1,day:1},{year:2023,month:1,day:2},"year","month",1,"floor",[-1,0,0,0]);
const first={year:2024,month:1,day:1}, fourth={year:2024,month:1,day:4};
for(const mode of ["ceil","expand","halfCeil","halfExpand","halfEven"] as const) expect(first,fourth,"day","day",2,mode,[0,0,0,4]);
for(const mode of ["floor","trunc","halfFloor","halfTrunc"] as const) expect(first,fourth,"day","day",2,mode,[0,0,0,2]);
for(const mode of ["floor","expand","halfFloor","halfExpand","halfEven"] as const) expect(fourth,first,"day","day",2,mode,[0,0,0,-4]);
for(const mode of ["ceil","trunc","halfCeil","halfTrunc"] as const) expect(fourth,first,"day","day",2,mode,[0,0,0,-2]);
expect(first,{year:2024,month:1,day:7},"week","day",10,"ceil",[0,0,1,0]);
expect(first,{year:2024,month:1,day:8},"week","day",2,"ceil",[0,0,1,0]);
expect(first,{year:2024,month:1,day:11},"month","week",1,"ceil",[0,0,2,0]);
expect(first,{year:2024,month:1,day:11},"day","day",1000000000,"ceil",[0,0,0,1000000000]);
const maximum={year:275760,month:9,day:13}, nearMaximum={year:275760,month:9,day:12};
expect(nearMaximum,maximum,"day","day",2,"ceil",[0,0,0,2]);
for(const unit of ["year","month","week","day"] as const) expect(maximum,maximum,unit,unit,1000000000,"ceil",[0,0,0,0]);
if(roundDateDifference(nearMaximum,maximum,"month","month",1,"trunc")!==null)throw new Error("calendar window range");
if(roundDateDifference(first,fourth,"day","day",0,"trunc")!==null)throw new Error("invalid increment");
console.log("temporal date round passed");
