import { parseTemporalDuration } from "../src/temporal-duration-parse.js";
import { formatTemporalDuration } from "../src/temporal-duration-format.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function parses(text: string, expected: string): void {
    const duration = parseTemporalDuration(text);
    check(
        duration !== null && formatTemporalDuration(duration) === expected,
        text + " => " + expected,
    );
}
parses("P1Y2M3W4DT5H6M7.00800901S", "P1Y2M3W4DT5H6M7.00800901S");
parses("-p1y2m3w4dt5h6m7,00800901s", "-P1Y2M3W4DT5H6M7.00800901S");
parses("+PT1S", "PT1S");
parses("P0Y", "PT0S");
parses("-PT0S", "PT0S");
parses("PT000000000000000000000001S", "PT1S");
parses("P1W2D", "P1W2D");
parses("PT1.5H", "PT1H30M");
parses("PT1.5M", "PT1M30S");
parses("PT1.5S", "PT1.5S");
parses("PT0.000000001H", "PT0.0000036S");
parses("PT0.000000001M", "PT0.00000006S");
parses("PT0.000000001S", "PT0.000000001S");
parses("PT1.999999999H", "PT1H59M59.9999964S");
parses("PT1.999999999M", "PT1M59.99999994S");
parses("PT46H66M71.50040904S", "PT46H66M71.50040904S");
parses("PT9007199254740991.999999999S", "PT9007199254740991.999999999S");
parses("-PT9007199254740991.999999999S", "-PT9007199254740991.999999999S");
parses("P4294967295Y4294967295M4294967295W", "P4294967295Y4294967295M4294967295W");
for (const text of [
    "",
    "P",
    "PT",
    "P1YT",
    "P1YTT1H",
    "1H",
    "T1H",
    " P1Y",
    "P1Y ",
    "P1Y2Y",
    "P1M1Y",
    "P1D1W",
    "PT1M1H",
    "PT1S1M",
    "P1H",
    "PT1D",
    "PT1Y",
    "P1.5D",
    "P1.5W",
    "P1.5M",
    "P1.5Y",
    "PT.5S",
    "PT1.S",
    "PT1,S",
    "PT1.1234567890S",
    "PT1.5H1M",
    "PT1.0M0S",
    "PT1.5S1S",
    "P-1Y",
    "PT+1S",
    "−PT1S",
    "PT1ſ",
    "PT1e3S",
    "PT1_000S",
    "P1Y[UTC]",
    "P4294967296Y",
    "P4294967296M",
    "P4294967296W",
    "PT9007199254740992S",
    "PT90071992547409911S",
    "P99999999999999999999999999999999999999Y",
]) {
    check(parseTemporalDuration(text) === null, "invalid " + text);
}
const zero = parseTemporalDuration("-P0Y0M0W0DT0H0M0.0S");
check(
    zero !== null && Object.is(zero.years, 0) && Object.is(zero.nanoseconds, 0),
    "positive zero fields",
);
const seconds = parseTemporalDuration("PT71.50040904S");
check(
    seconds !== null &&
        seconds.seconds === 71 &&
        seconds.milliseconds === 500 &&
        seconds.microseconds === 409 &&
        seconds.nanoseconds === 40,
    "fraction precision",
);
for (let digits = 1; digits <= 9; digits++) {
    parses("PT0." + "1".repeat(digits) + "S", "PT0." + "1".repeat(digits) + "S");
}
console.log("temporal duration parse passed");
