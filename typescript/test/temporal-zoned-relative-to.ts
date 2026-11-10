import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "zoned-relative", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error(text);
}
for (const text of [
    'new Temporal.Duration(0,1).total({unit:"days",relativeTo:"2020-01-31T12[+05:30]"})===29',
    'new Temporal.Duration(0,1).total({unit:"hours",relativeTo:{year:2020,month:1,day:31,hour:12,timeZone:"+05:30"}})===696',
    'new Temporal.Duration(0,0,0,0,12).total({unit:"days",relativeTo:"2020-01-01T00Z[+05:30]"})===0.5',
    'new Temporal.Duration().total({unit:"day",relativeTo:"2020-01-01[UTC]"})===0',
    'new Temporal.Duration().round({smallestUnit:"hour",relativeTo:"2020-01-01[UTC]"}).toString()==="PT0S"',
    'Temporal.Duration.compare("PT0S","PT0S",{relativeTo:"2020-01-01[UTC]"})===0',
    'Temporal.Duration.compare("P1M","P30D",{relativeTo:"2020-01-31T12[UTC]"})===-1',
    'Temporal.Duration.compare("P1D","PT24H",{relativeTo:"2020-01-31T12[-23:59]"})===0',
    'new Temporal.Duration(0,0,0,28,23,59,59,999,999,999).round({largestUnit:"month",smallestUnit:"second",relativeTo:"2020-01-31T12[UTC]"}).toString()==="P1M"',
    'new Temporal.Duration(0,0,0,0,49).round({largestUnit:"day",relativeTo:"2020-01-31T12[UTC]"}).toString()==="P2DT1H"',
    'new Temporal.Duration(0,0,0,0,-25).round({smallestUnit:"day",relativeTo:"2020-01-31T12[UTC]"}).toString()==="-P1D"',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"calendar",{get(){throw 1}});Object.defineProperty(z,"timeZoneId",{get(){throw 2}});new Temporal.Duration(0,0,0,1).total({unit:"hour",relativeTo:z})===24',
    'new Temporal.Duration(0,0,0,1).total({unit:"hour",relativeTo:{year:2020,month:1,day:1,timeZone:new Temporal.ZonedDateTime(0n,"UTC")}})===24',
    'Temporal.Duration.compare("PT1H","PT2H",{relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})===-1',
    'Temporal.Duration.compare("P1D","P1D",{relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})===0',
    'new Temporal.Duration().round({largestUnit:"day",relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")}).toString()==="PT0S"',
    'var log="";new Temporal.Duration().total({get relativeTo(){log+="r";return{get calendar(){log+="c"},year:2020,month:1,get day(){log+="d";return 1},get timeZone(){log+="z";return "UTC"}}},get unit(){log+="u";return "hour"}});log==="rcdzu"',
    'var log="";new Temporal.Duration().round({get largestUnit(){log+="l"},get relativeTo(){log+="r";return "2020-01-01[UTC]"},get roundingIncrement(){log+="i"},get roundingMode(){log+="m"},get smallestUnit(){log+="s";return "hour"}});log==="lrims"',
    'var t=false,ok=false;try{new Temporal.Duration().total({relativeTo:"2020-01-01T00+01:00[UTC]",get unit(){t=true;return "hour"}})}catch(e){ok=e instanceof RangeError}ok&&!t',
]) passes(text);
for (const expression of [
    'new Temporal.Duration().total({unit:"day",relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})',
    'new Temporal.Duration().round({smallestUnit:"day",relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})',
    'new Temporal.Duration().round({largestUnit:"day",smallestUnit:"second",relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})',
    'Temporal.Duration.compare("P1D","PT1H",{relativeTo:new Temporal.ZonedDateTime(8640000000000000000000n,"UTC")})',
    'new Temporal.Duration().total({unit:"hour",relativeTo:{year:2020,month:1,day:1,timeZone:"UTC",offset:"+01:00"}})',
    'new Temporal.Duration().round({smallestUnit:"hour",relativeTo:"2020-01-01[Invalid/Zone]"})',
]) passes('var ok=false;try{'+expression+'}catch(e){ok=e instanceof RangeError}ok');
console.log("temporal zoned relative to passed");
