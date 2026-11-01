// Probe: the host surface a CLI needs: argv, reading a UTF-8 source file,
// stdout vs stderr, and exit status.

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (path === undefined) {
    console.error("usage: host <file>");
    process.exit(2);
}

const source = readFileSync(path, "utf8");
console.log("chars:", source.length, "lines:", source.split("\n").length);
console.log("first line:", source.split("\n")[0]);
console.log("has escaped lone surrogate text:", source.includes("\\uD800"));
console.error("this goes to stderr");
process.exitCode = 3;
