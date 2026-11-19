import assert from "node:assert/strict";

export function parseTimeZoneFooter(source) {
    let rest = source;
    function take(pattern) {
        const match = pattern.exec(rest);
        assert(match, "Invalid timezone footer: " + source + " at " + rest);
        rest = rest.slice(match[0].length);
        return match[0];
    }
    function name() {
        take(/^(?:<[A-Za-z0-9+-]{3,}>|[A-Za-z]{3,})/);
    }
    function clock(maximum) {
        const text = take(/^[+-]?\d{1,3}(?::\d{1,2}(?::\d{1,2})?)?/);
        const sign = text[0] === "-" ? -1 : 1;
        const parts = text.replace(/^[+-]/, "").split(":").map(Number);
        assert(parts[0] <= maximum && (parts[1] ?? 0) < 60 && (parts[2] ?? 0) < 60);
        return sign * (parts[0] * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0));
    }
    function rule() {
        let kind,
            month = 0,
            week = 0,
            day;
        if (rest[0] === "M") {
            [month, week, day] = take(/^M\d{1,2}\.\d\.\d/)
                .slice(1)
                .split(".")
                .map(Number);
            assert(month >= 1 && month <= 12 && week >= 1 && week <= 5 && day <= 6);
            kind = 2;
        } else if (rest[0] === "J") {
            day = Number(take(/^J\d{1,3}/).slice(1));
            assert(day >= 1 && day <= 365);
            kind = 0;
        } else {
            day = Number(take(/^\d{1,3}/));
            assert(day <= 365);
            kind = 1;
        }
        let seconds = 7200;
        if (rest[0] === "/") {
            rest = rest.slice(1);
            seconds = clock(167);
        }
        return { kind, month, week, day, seconds };
    }
    name();
    const standard = -clock(24);
    if (rest === "") {
        return { standard, daylight: standard, start: null, end: null };
    }
    name();
    const daylight = rest[0] === "," ? standard + 3600 : -clock(24);
    take(/^,/);
    const start = rule();
    take(/^,/);
    const end = rule();
    assert.equal(rest, "");
    return { standard, daylight, start, end };
}
