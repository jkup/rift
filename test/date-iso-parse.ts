import { parseDateISO } from "../src/date-iso-parse.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
for (const text of [
    "1970",
    "1970-01",
    "1970-01-01",
    "1970T00:00",
    "1970-01T00:00Z",
    "1970-01-01T00:00:00.000Z",
    "1970-01-01T01:00+01:00",
    "1969-12-31T23:00-01:00",
    "+001970-01-01T00:00Z",
]) {
    check(parseDateISO(text) === 0, "epoch form " + text);
}
check(parseDateISO("1969-12-31T23:59:59.999Z") === -1, "negative millisecond");
check(parseDateISO("2000-02-29T00:00:00.123Z") === 951782400123, "leap date");
check(parseDateISO("2020-02-30") === 1583020800000, "valid DD field overflows February");
check(
    parseDateISO("1970-01-01T24:00") === 86400000 &&
        parseDateISO("1970-01-01T24:00:00.000Z") === 86400000,
    "end of day midnight",
);
check(parseDateISO("0000-01-01") === -62167219200000, "literal year zero");
check(parseDateISO("-000001-01-01") === -62198755200000, "negative expanded year");
check(parseDateISO("-271821-04-20T00:00:00.000Z") === -8640000000000000, "minimum endpoint");
check(parseDateISO("+275760-09-13T00:00:00.000Z") === 8640000000000000, "maximum endpoint");
check(
    parseDateISO("+275760-09-13T01:00+01:00") === 8640000000000000,
    "offset before clipping maximum",
);
check(
    parseDateISO("-271821-04-19T23:00-01:00") === -8640000000000000,
    "offset before clipping minimum",
);
for (const text of [
    "",
    "197",
    "19700",
    "1970-1",
    "1970-01-1",
    "1970-00-01",
    "1970-13-01",
    "1970-01-00",
    "1970-01-32",
    "-000000-01-01",
    "+01970-01-01",
    "1970-01-01T25:00",
    "1970-01-01T24:01",
    "1970-01-01T24:00:00.001",
    "1970-01-01T00:60",
    "1970-01-01T00:00:60",
    "1970-01-01T00:00:00.1",
    "1970-01-01T00:00:00.0000",
    "1970-01-01T00:00+24:00",
    "1970-01-01T00:00+01:60",
    "1970-01-01T00:00+0100",
    "1970-01-01Z",
    "1970-01-01[UTC]",
    "1970-01-01[u-ca=iso8601]",
    "1970-01-01T00:00Zjunk",
    "+275760-09-13T00:00:00.001Z",
    "-271821-04-19T23:59:59.999Z",
]) {
    check(Number.isNaN(parseDateISO(text)), "invalid ISO " + text);
}
console.log("date iso parse passed");
