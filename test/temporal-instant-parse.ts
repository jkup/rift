import { parseTemporalInstant } from "../src/temporal/temporal-instant-parse.js";
import { formatUTCInstant } from "../src/temporal/temporal-time-format.js";
import { MAX_EPOCH_NANOSECONDS } from "../src/temporal/iso-calendar.js";
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
const zero = [
    "1970-01-01T00Z",
    "19700101t0000z",
    "19700101 00:00:00Z",
    "+001970-01-01T00:00Z",
    "1970-01-01T01+01",
    "1970-01-01T01:30+0130",
    "1969-12-31T23:00-01:00",
    "1970-01-01T00-00",
    "1970-01-01T00:00:00.123456789+00:00:00.123456789",
];
for (const text of zero) {
    check(parseTemporalInstant(text) === 0n, "zero: " + text);
}
for (const suffix of [
    "[UTC]",
    "[!Etc/GMT+1]",
    "[Unknown/Zone]",
    "[+0130]",
    "[!-00:00]",
    "[u-ca=iso8601]",
    "[!u-ca=unknown]",
    "[u-ca=one][u-ca=two]",
    "[x=value-123]",
    "[UTC][u-ca=iso8601][x=Y]",
    "[_x=1]",
]) {
    check(
        parseTemporalInstant("1970-01-01T00Z" + suffix) === 0n,
        "ignored valid annotation: " + suffix,
    );
}
const texts = [
    "1969-12-31T23:59:59.999999999Z",
    "1970-01-01T00:00:00.000000001Z",
    "1970-01-01T00:00:60.5Z",
    "1970-01-01T00:00:00+00:00:00.000000001",
    "1970-01-01T00:00:00-000000,000000001",
    "0000-01-01T00Z",
    "-000001-01-01T00Z",
    "2000-02-29T00Z",
    "1900-03-01T00Z",
];
const values = [
    -1n,
    1n,
    59500000000n,
    -1n,
    1n,
    -62167219200000000000n,
    -62198755200000000000n,
    951782400000000000n,
    -2203891200000000000n,
];
for (let i = 0; i < texts.length; i++) {
    check(parseTemporalInstant(texts[i]) === values[i], "fixed instant: " + texts[i]);
}
for (const text of ["+275760-09-13T00Z", "+275760-09-13T23:59:59.999999999+23:59:59.999999999"]) {
    check(
        parseTemporalInstant(text) === MAX_EPOCH_NANOSECONDS,
        "upper boundary offset before range",
    );
}
for (const text of ["-271821-04-20T00Z", "-271821-04-19T00:00:00.000000001-23:59:59.999999999"]) {
    check(
        parseTemporalInstant(text) === -MAX_EPOCH_NANOSECONDS,
        "lower boundary offset before range",
    );
}
const invalid = [
    "",
    "1970-01-01",
    "1970-01-01Z",
    "1970-01-01T00",
    "1970-01-01T00[UTC]",
    "1970-01-01T00Z ",
    "1970-0101T00Z",
    "197001-01T00Z",
    "1970-01-01T0000:00Z",
    "1970-01-01T00:0000Z",
    "1970-01-01T00:Z",
    "1970-01-01T24:00Z",
    "1970-01-01T00:60Z",
    "1970-01-01T00:00:61Z",
    "1970-01-01T00.5Z",
    "1970-01-01T00:00.5Z",
    "1970-01-01T00:00:00.Z",
    "1970-01-01T00:00:00.1234567890Z",
    "1970-01-01T00:00:00+24:00",
    "1900-02-29T00Z",
    "2000-02-30T00Z",
    "2000-04-31T00Z",
    "2000-00-01T00Z",
    "2000-01-00T00Z",
    "-000000-01-01T00Z",
    "−000001-01-01T00Z",
    "+1970-01-01T00Z",
    "197-01-01T00Z",
    "01970-01-01T00Z",
    "+275760-09-13T00:00:00.000000001Z",
    "-271821-04-19T23:59:59.999999999Z",
    "+999999-01-01T00Z",
];
for (const text of invalid) {
    check(parseTemporalInstant(text) === null, "invalid instant: " + text);
}
for (const suffix of [
    "[]",
    "[!]",
    "[UTC][UTC]",
    "[x=y][UTC]",
    "[!unknown=value]",
    "[u-ca=one][!u-ca=two]",
    "[!u-ca=one][u-ca=two]",
    "[u-ca=]",
    "[U-ca=iso8601]",
    "[x=-a]",
    "[x=a-]",
    "[x=a--b]",
    "[x=a_b]",
    "[x=a=b]",
    "[1x=a]",
    "[UTC",
    "[UTC]]",
    "[A//B]",
    "[/UTC]",
    "[UTC/]",
    "[1UTC]",
    "[+01:00:00]",
    "[+24]",
]) {
    check(
        parseTemporalInstant("1970-01-01T00Z" + suffix) === null,
        "invalid annotation: " + suffix,
    );
}
for (const value of [
    0n,
    1n,
    -1n,
    MAX_EPOCH_NANOSECONDS,
    -MAX_EPOCH_NANOSECONDS,
    1234567890123456789n,
    -1234567890123456789n,
]) {
    const text = formatUTCInstant(value, "auto");
    check(text !== null && parseTemporalInstant(text) === value, "formatter roundtrip");
}
console.log("temporal instant parse passed");
