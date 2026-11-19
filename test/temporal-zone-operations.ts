import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { GuestTemporalZonedDateTime } from "../src/temporal-zoned-date-time-object.js";
import {
    namedTemporalTimeZone,
    timeZoneEquals,
    timeZoneOffsetNanoseconds,
} from "../src/temporal-time-zone-operations.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";
import { parseTemporalZonedDateTime } from "../src/temporal-zoned-parse.js";
import { interpretTemporalZonedDateTime } from "../src/temporal-zoned-interpret.js";
import { formatUTCOffset } from "../src/utc-offset.js";
const realm = new Realm((_line: string) => {}, "script");
const basic = readFileSync("test/fixtures/temporal-zone-operations.txt", "utf8").trim().split("\n");
const calendar = readFileSync("test/fixtures/temporal-zone-operations-calendar.txt", "utf8")
    .trim()
    .split("\n");
if (basic.length !== 137 || calendar.length !== 970) {
    throw new Error("consumer denominator");
}
const lines = basic.concat(calendar);
for (let index = 0; index < lines.length; index++) {
    const fields = lines[index].split("\t"),
        zone = namedTemporalTimeZone(fields[0]);
    if (zone === null) {
        throw new Error("seed timezone");
    }
    const object = new GuestTemporalZonedDateTime(
        BigInt(fields[1]),
        zone,
        realm.temporalZonedDateTimePrototype,
    );
    realm.globalObject.bootstrapDefine("z", {
        value: { kind: "object", object },
        writable: true,
        enumerable: true,
        configurable: true,
    });
    const prepared = prepareBoundedScript(
        { id: "timezone-consumer-" + index, text: fields[2] },
        realm,
    );
    if (prepared.kind !== "ready") {
        throw new Error("prepare consumer " + index);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("consumer " + index + ": " + fields[2]);
    }
}
const interpretations = readFileSync("test/fixtures/temporal-zone-operations-interpret.txt", "utf8")
    .trim()
    .split("\n");
if (interpretations.length !== 4) {
    throw new Error("interpretation denominator");
}
for (const line of interpretations) {
    const fields = line.split("\t"),
        bracket = fields[0].indexOf("[");
    const zone = namedTemporalTimeZone(fields[0].slice(bracket + 1, -1)),
        parsed = parseTemporalZonedDateTime(fields[0].slice(0, bracket) + "[UTC]");
    if (zone === null || parsed === null) {
        throw new Error("interpretation control");
    }
    const actual = interpretTemporalZonedDateTime(
        {
            dateTime: parsed.dateTime,
            timeZone: zone,
            startOfDay: parsed.startOfDay,
            offsetBehaviour: parsed.offsetBehaviour,
            offsetNanoseconds: parsed.offsetNanoseconds,
            matchMinutes: parsed.matchMinutes,
        },
        "reject",
    );
    if (actual !== BigInt(fields[1])) {
        throw new Error("historical offset matching");
    }
}
const utc = namedTemporalTimeZone("UTC"),
    utcAlias = namedTemporalTimeZone("Etc/GMT"),
    fixed = parseTemporalTimeZoneIdentifier("+00:00"),
    eastern = namedTemporalTimeZone("US/Eastern"),
    newYork = namedTemporalTimeZone("America/New_York");
if (utc === null || utcAlias === null || fixed === null || eastern === null || newYork === null) {
    throw new Error("identity controls");
}
if (
    !timeZoneEquals(utc, utcAlias) ||
    timeZoneEquals(utc, fixed) ||
    !timeZoneEquals(eastern, newYork)
) {
    throw new Error("zone identity");
}
if (
    timeZoneOffsetNanoseconds(newYork, 1710053999999999999n) !== -18000000000000n ||
    timeZoneOffsetNanoseconds(newYork, 1710054000000000000n) !== -14400000000000n
) {
    throw new Error("exact offset transition");
}
if (
    parseTemporalTimeZoneIdentifier("America/New_York") === null ||
    parseTemporalTimeZoneIdentifier("Invalid/Zone") !== null
) {
    throw new Error("named-zone admission");
}
if (
    formatUTCOffset(-1000000000n, "minute") !== "+00:00" ||
    formatUTCOffset(-2670000000000n, "minute") !== "-00:45" ||
    formatUTCOffset(1n) !== "+00:00:00.000000001"
) {
    throw new Error("offset formatting");
}
console.log("temporal zone operations passed");
