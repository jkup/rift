import { roundZonedDateTimeDifference } from "../src/temporal/temporal-zoned-difference-round.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal/temporal-time-zone-parse.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const zone = parseTemporalTimeZoneIdentifier("UTC"),
    max = 8640000000000000000000n;
if (zone === null) {
    throw new Error("zone");
}
check(
    roundZonedDateTimeDifference(max, max, zone, "days", "days", 1, "trunc") === null,
    "zero day window overflows",
);
check(
    roundZonedDateTimeDifference(max, max, zone, "years", "months", 1, "trunc") === null,
    "zero month window overflows",
);
check(
    roundZonedDateTimeDifference(max, max, zone, "days", "seconds", 1, "trunc") === null,
    "calendar-largest time nudge checks next day",
);
const time = roundZonedDateTimeDifference(max, max, zone, "hours", "seconds", 1, "trunc");
check(time !== null && time.time === 0n, "time-largest zero remains exact");
const exact = roundZonedDateTimeDifference(max, max, zone, "days", "nanoseconds", 1, "trunc");
check(exact !== null && exact.time === 0n, "exact nanosecond fast path");
const realm = new Realm((_line: string) => {}, "script");
const prepared = prepareBoundedScript(
    {
        id: "zoned-zero",
        text: 'var z=new Temporal.ZonedDateTime(8640000000000000000000n,"UTC");z.until(z,{smallestUnit:"day"}).toString()==="PT0S"&&z.since(z,{smallestUnit:"month"}).toString()==="PT0S"',
    },
    realm,
);
if (prepared.kind !== "ready") {
    throw new Error("prepare");
}
const result = evaluateScript(createScriptSession(), prepared.record).completion;
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "public difference equality bypasses calendar windows",
);
console.log("temporal zoned zero round passed");
