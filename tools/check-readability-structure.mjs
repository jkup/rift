import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sourceFiles } from "./readability-policy.mjs";
import {
    measureStructure,
    structuralViolations,
    compareStructure,
    structureLimits,
} from "./readability-structure.mjs";

const path = ".readability-baseline.json";
const mode = process.argv[2];
if (
    process.argv.length > 3 ||
    (mode !== undefined && mode !== "--ratchet" && mode !== "--initialize")
) {
    throw new Error("usage: check-readability-structure.mjs [--ratchet|--initialize]");
}
const files = sourceFiles();
const actual = structuralViolations(
    files.flatMap((file) => measureStructure(file, readFileSync(file, "utf8"))),
);
if (mode === "--initialize" && existsSync(path)) {
    throw new Error("Refusing to replace an existing structural baseline");
}
const baseline = mode === "--initialize" ? null : JSON.parse(readFileSync(path, "utf8"));
if (
    baseline !== null &&
    (baseline.version !== 1 || JSON.stringify(baseline.limits) !== JSON.stringify(structureLimits))
) {
    throw new Error("Baseline version or structural limits differ; review the policy change");
}
const errors = baseline === null ? [] : compareStructure(actual, baseline.entries);
const growth = errors.filter(
    (error) => !error.startsWith("Reduce baseline") && !error.startsWith("Remove resolved"),
);
if (mode === "--initialize" || (mode === "--ratchet" && growth.length === 0)) {
    writeFileSync(
        path,
        JSON.stringify(
            {
                version: 1,
                limits: structureLimits,
                policy: "Existing measured exceptions only. New or larger violations fail; --ratchet only reduces allowances. Review baseline edits as policy changes.",
                entries: actual,
            },
            null,
            4,
        ) + "\n",
    );
    console.log(
        `Structural baseline: ${actual.length} measured exceptions in ${files.length} files`,
    );
} else {
    for (const error of errors) {
        console.error(error);
    }
    console.log(
        `Structure: ${files.length} files, ${actual.length} existing exceptions, ${errors.length} violations`,
    );
    process.exitCode = errors.length === 0 ? 0 : 1;
}
