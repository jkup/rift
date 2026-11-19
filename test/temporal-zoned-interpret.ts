import { parseTemporalZonedDateTime } from "../src/temporal/temporal-zoned-parse.js";
import {
    interpretTemporalZonedDateTime,
    type TemporalOffsetOption,
} from "../src/temporal/temporal-zoned-interpret.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function interpret(text: string, option: TemporalOffsetOption): bigint | null {
    const parsed = parseTemporalZonedDateTime(text);
    if (parsed === null) {
        throw new Error("parse " + text);
    }
    return interpretTemporalZonedDateTime(parsed, option);
}
const options: TemporalOffsetOption[] = ["reject", "prefer", "ignore", "use"];
for (const option of options) {
    check(interpret("1970-01-01T00:00Z[+05:30]", option) === 0n, "Z exact " + option);
    check(interpret("1970-01-01[+05:30]", option) === -19800000000000n, "start of day " + option);
    check(interpret("1970-01-01T00:00[+05:30]", option) === -19800000000000n, "wall " + option);
    check(
        interpret("1970-01-01T00:00+05:30[+05:30]", option) === -19800000000000n,
        "match " + option,
    );
    check(interpret("1970-01-01T00:00:00.000000001-00[UTC]", option) === 1n, "precision " + option);
}
check(interpret("1970-01-01T00:00+01[+05:30]", "reject") === null, "reject mismatch");
check(interpret("1970-01-01T00:00+01[+05:30]", "prefer") === -19800000000000n, "prefer wall");
check(interpret("1970-01-01T00:00+01[+05:30]", "ignore") === -19800000000000n, "ignore offset");
check(interpret("1970-01-01T00:00+01[+05:30]", "use") === -3600000000000n, "use offset");
check(
    interpret("1970-01-01T00:00+00:00:00.000000001[UTC]", "reject") === null,
    "reject subminute mismatch",
);
check(interpret("1970-01-01T00:00+00:00:00.000000001[UTC]", "use") === -1n, "use subminute offset");
check(
    interpret("-271821-04-19T00:01[-23:59]", "reject") === -8640000000000000000000n,
    "minimum shifted local",
);
check(
    interpret("+275760-09-13T23:59[+23:59]", "reject") === 8640000000000000000000n,
    "maximum shifted local",
);
check(interpret("-271821-04-19T00:00:59.999999999[-23:59]", "reject") === null, "before minimum");
check(interpret("+275760-09-13T23:59:00.000000001[+23:59]", "reject") === null, "after maximum");
check(interpret("-271821-04-19[-23:59]", "use") === null, "invalid day start");
check(interpret("+999999-12-31[UTC]", "reject") === null, "wide parsed year");
check(
    interpret("+275760-09-13T23:59+23:59[UTC]", "use") === 8640000000000000000000n,
    "use applies before bounds",
);
check(
    interpret("+275760-09-13T23:59+23:59[UTC]", "ignore") === null,
    "ignore preserves zone bounds",
);
check(
    interpret("-271821-04-19T12:00-23:59[-23:59]", "reject") === null,
    "reject checks unbalanced ISO day",
);
check(
    interpret("-271821-04-19T12:00-23:59[-23:59]", "prefer") === null,
    "prefer checks unbalanced ISO day",
);
check(
    interpret("-271821-04-19T12:00-23:59[-23:59]", "ignore") !== null,
    "ignore balances before day check",
);
check(
    interpret("-271821-04-19T12:00-23:59[-23:59]", "use") !== null,
    "use balances before day check",
);
console.log("temporal zoned interpret passed");
