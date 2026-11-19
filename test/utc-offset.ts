import { parseUTCOffset, formatUTCOffsetMinutes } from "../src/time-zone/utc-offset.js";
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
const forms = [
    "+00",
    "-00",
    "+0000",
    "-00:00",
    "+01",
    "-01",
    "+0130",
    "-01:30",
    "+01:02:03",
    "-010203",
    "+01:02:03.123456789",
    "-010203,123456789",
    "+00:00:00.000000001",
    "-00:00:00.000000001",
    "+23:59:59.999999999",
];
const values = [
    0n,
    0n,
    0n,
    0n,
    3600000000000n,
    -3600000000000n,
    5400000000000n,
    -5400000000000n,
    3723000000000n,
    -3723000000000n,
    3723123456789n,
    -3723123456789n,
    1n,
    -1n,
    86399999999999n,
];
for (let i = 0; i < forms.length; i++) {
    check(parseUTCOffset(forms[i]) === values[i], "fixed offset " + forms[i]);
}
for (let digits = 1; digits <= 9; digits++) {
    const fraction = "123456789".slice(0, digits);
    const expected = BigInt(fraction + "0".repeat(9 - digits));
    check(parseUTCOffset("+00:00:00." + fraction) === expected, "fraction precision " + digits);
}
for (let minute = -1439; minute <= 1439; minute++) {
    const text = formatUTCOffsetMinutes(minute);
    check(
        text !== null && parseUTCOffset(text, false) === BigInt(minute) * 60000000000n,
        "minute roundtrip",
    );
}
check(
    formatUTCOffsetMinutes(0) === "+00:00" && formatUTCOffsetMinutes(-0) === "+00:00",
    "normalized zero",
);
check(
    formatUTCOffsetMinutes(330) === "+05:30" && formatUTCOffsetMinutes(-210) === "-03:30",
    "fixed minute formatting",
);
for (const text of ["+01", "+0102", "-01:02"]) {
    check(parseUTCOffset(text, false) !== null, "minute-only grammar");
}
for (const text of ["+010203", "+01:02:03", "+01:02:03.0"]) {
    check(parseUTCOffset(text, false) === null, "minute-only rejects seconds");
}
for (const text of [
    "",
    "Z",
    "UTC",
    "00",
    "+0",
    "+1",
    "+001",
    "+24",
    "-24:00",
    "+00:60",
    "+00:00:60",
    "+01:",
    "+01:0",
    "+0102:03",
    "+01:0203",
    "+01.5",
    "+01:02.5",
    "+01:02:03.",
    "+01:02:03.1234567890",
    "+01:02:03.1a",
    "+01:02:03e1",
    " +00",
    "+00 ",
    "+00\n",
    "−01:00",
    "+０１:00",
    "+00[UTC]",
    "++01",
    "+01:02:03:04",
    "+000000000000000000000000000000",
]) {
    check(parseUTCOffset(text) === null, "reject offset " + text);
}
for (const minute of [NaN, Infinity, -Infinity, 1440, -1440, 0.5]) {
    check(formatUTCOffsetMinutes(minute) === null, "reject minute formatting");
}
console.log("utc offset passed");
