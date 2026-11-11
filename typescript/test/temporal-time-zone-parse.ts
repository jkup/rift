import { timeZoneOffsetNanoseconds } from "../src/temporal-time-zone-operations.js";
import { parseTemporalTimeZone } from "../src/temporal-time-zone-parse.js";
function check(text: string, identifier: string, minutes: number): void {
    const result = parseTemporalTimeZone(text);
    if (result === null || result.identifier !== identifier || timeZoneOffsetNanoseconds(result, 0n) !== BigInt(minutes) * 60000000000n) throw new Error(text);
}
for (const text of ["UTC", "utc", "UtC", "2020-02-29T12:34Z", "20200229t1234z", "2020-02-29[UTC]", "2020-02[UTC]", "--02-29[UTC]", "0229[UTC]", "2020-02-29T12:34:60.123456789Z", "+999999-12-31T00Z"]) check(text, "UTC", 0);
for (const text of ["+01", "+0100", "+01:00", "2020-01-01T00+01", "00:00+0100", "t00+01:00", "2020-01[+01]", "--01-01[+0100]"]) check(text, "+01:00", 60);
check("-00:00", "+00:00", 0);check("-2359", "-23:59", -1439);check("+23:59", "+23:59", 1439);
check("2020-01-01T00+01:23:45.123[UTC]", "UTC", 0);
check("2020-01-01T00Z[-02:30]", "-02:30", -150);
check("2020-01-01T00+01:00[!UTC][u-ca=unknown]", "UTC", 0);
check("12:34[UTC][!u-ca=hebrew]", "UTC", 0);
check("2020-01[UTC][x-test=value]", "UTC", 0);
check("2020-13[UTC]", "UTC", 0);
check("1130+01:00", "+01:00", 60);
check("202001+01:00", "+01:00", 60);
check("12-0130", "-01:30", -90);
check("2020-0130", "-01:30", -90);
for (const text of ["", "Z", "12Z", "T12:34Z", "2020-01", "2020-01[UTC][u-ca=hebrew]", "--02-29[UTC][u-ca=unknown]", " UTC", "UTC ", "Etc/UTC", "Europe/London", "+24", "+01:60", "+01:00:00", "-00:00:00.0", "2020-01-01", "2020-01-01Z", "2020-02-30T00Z", "2021-02-29[UTC]", "2020-24[UTC]", "--02-30[UTC]", "24:00Z", "12:60Z", "12:34:61Z", "2020-01-01T00+01:00:00", "12:34[UTC][UTC]", "12:34[UTC][!x-test=value]", "12:34[UTC][!u-ca=iso8601][u-ca=iso8601]", "12:34[u-ca=iso8601][UTC]", "12:34[+01:00:00]", "12:34[UTC]x", "-000000-01-01T00Z", "12:34[Europe/London]"]) {
    if (parseTemporalTimeZone(text) !== null) throw new Error("accepted " + text);
}
console.log("temporal time zone parse passed");
