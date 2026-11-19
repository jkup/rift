import { dateMakeDay } from "../src/date-calendar.js";
import { dateMakeDate, dateTimeClip, dateTimeFields } from "../src/date-time.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
check(dateMakeDay(1970, 0, 1) === 0, "epoch day");
check(
    dateMakeDay(1969, 12, 1) === 0 && dateMakeDay(1970, -1, 1) === -31,
    "month overflow and borrow",
);
check(dateMakeDay(1970, 0, 0) === -1 && dateMakeDay(1970, 0, -1) === -2, "day overflow");
check(
    dateMakeDay(2000, 1, 29) === 11016 && dateMakeDay(2000, 1, 30) === 11017,
    "leap day and overflow",
);
check(dateMakeDay(1900, 1, 29) === dateMakeDay(1900, 2, 1), "century not leap");
check(dateMakeDay(2000.9, 1.9, 29.9) === 11016, "truncate inputs independently");
check(dateMakeDay(0, 0, 1) === -719528, "year zero does not apply constructor rule");
check(dateMakeDay(-1, -1, 1) === dateMakeDay(-2, 11, 1), "negative year and month");
check(
    dateMakeDay(-271821, 3, 20) === -100000000 && dateMakeDay(275760, 8, 13) === 100000000,
    "full endpoints",
);
check(
    dateMakeDay(1000000000000, -12000000000000, 1) === -719528,
    "large month/year cancellation before calendar calculation",
);
check(
    dateMakeDay(-1000000000000, 12000000000000, 1) === -719528,
    "negative large month/year cancellation",
);
for (const invalid of [NaN, Infinity, -Infinity]) {
    check(
        Number.isNaN(dateMakeDay(invalid, 0, 1)) &&
            Number.isNaN(dateMakeDay(1970, invalid, 1)) &&
            Number.isNaN(dateMakeDay(1970, 0, invalid)),
        "nonfinite input",
    );
}
check(Number.isNaN(dateMakeDay(1e308, 0, 1)), "nonfinite intermediate time");
for (const year of [
    -271820, -400, -100, -4, -1, 0, 1, 4, 100, 400, 1900, 1970, 2000, 2020, 275759,
]) {
    for (let month = 0; month < 12; month++) {
        const fields = dateTimeFields(dateTimeClip(dateMakeDate(dateMakeDay(year, month, 1), 0)));
        check(
            fields !== null && fields.year === year && fields.month === month && fields.day === 1,
            "calendar field roundtrip",
        );
    }
}
console.log("date calendar passed");
