#!/usr/bin/env node
// Read-only inventory of the legacy custom JavaScript tests under test/.
//
// Usage (from the repository root):
//   node typescript/tools/assistance/custom-test-audit/inventory.mjs          # summary tables
//   node typescript/tools/assistance/custom-test-audit/inventory.mjs --json   # per-file records
//
// Classification is static text matching, not execution. It reads files only and never writes.
// Signals are heuristics: a comment mentioning "FAIL" counts as a marker, for example. The audit
// document explains which signals were spot-checked by hand.

import fs from "node:fs";
import path from "node:path";

const TEST_DIR = "test";

// Ordered: the first matching rule wins. Patterns match the path relative to test/.
const AREA_RULES = [
    ["debug scripts", /^debug-/],
    ["temporal", /temporal/],
    ["regexp", /regexp|match-replace-search/],
    ["promise/async/generators/iterators", /promise|async|await|generator|iterator/],
    ["gc/memory", /gc|finalization|weakref|memory-safety/],
    ["keyed collections", /(^|[-/])(map|set|weakmap|weakset)[-_.]/],
    ["arrays", /array/],
    ["strings/templates", /string|template|escape|uri|tolocalestring/i],
    ["exceptions/errors", /try-catch|throw|exception|error|typeerror/],
    ["loops/control flow", /^for-|while|switch|labeled|let-const-loops|break|continue/],
    ["functions/closures", /function|arrow|default-param|rest-param|arguments|^functions\//],
    ["classes/this/new", /class|this-|new-operator|constructor-name/],
    [
        "objects/properties",
        /object|propert|hasownproperty|getter-setter|descriptor|defineproperties|method-lengths/i,
    ],
    [
        "operators",
        /arithmetic|bitwise|comparison|compound|exponent|increment|modulo|unary|comma|logical|overflow/,
    ],
    ["primitives (boolean/number/symbol/math)", /boolean|number|numeric|symbol|math/],
    ["scope/declarations/destructuring/spread", /scop|let-const|destructuring|spread/],
    ["eval/json", /eval|json/],
];

function areaOf(relativePath) {
    for (const [area, pattern] of AREA_RULES) {
        if (pattern.test(relativePath)) return area;
    }
    return "other / mixed status scripts";
}

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
    )) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

// Text the legacy harness (test-runner.js) treats as failure: a line containing "FAIL:", "❌" or
// "Error:", or a nonzero exit status. Everything else is invisible to it.
function signalsOf(source) {
    const code = source
        .split("\n")
        .filter((line) => !/^\s*\/\//.test(line))
        .join("\n");
    const has = (re) => re.test(code);
    return {
        throwingAssert: has(/function\s+assert\w*\s*\([^)]*\)\s*\{[^}]{0,200}?\bthrow\b/),
        throwsError: has(/\bthrow\s+new\s+\w*Error\b/),
        // `if (check) throw new Error(...)`, possibly with a brace and newline before `throw`.
        throwsOnCheck: has(/\bif\s*\([^\n]*\)\s*\{?\s*throw\s+new\s+\w*Error\b/),
        throwsPrimitive: has(/\bthrow\s+["'`\d]/),
        detectedFailMarker: has(/FAIL:|❌/),
        undetectedFailMarker: has(/FAIL(?!:)|✗/),
        passMarker: has(/PASS|✅|✓/),
        // A top-level (column 0) log whose literal starts a PASS/✅ claim: printed regardless of outcome.
        unconditionalPassMarker: has(/^console\.log\(["'][^"']*(✅|PASS)/m),
        printsComparisons: has(/console\.log\([^;\n]*(===|!==|==|!=)/),
        gcHelpers: has(/\bgc\(\)|\bgcStats\(\)|\bcreateArray\(\)|\bcreateTempObjects\(\)/),
        temporal: has(/\bTemporal\./),
        promiseOrAsync: has(/\bPromise\b|\basync\b|\bawait\b/),
        weakOrFinalization: has(/\bWeakRef\b|\bFinalizationRegistry\b/),
        evalCall: has(/\beval\s*\(/),
        locale: has(/toLocale\w*\(|\bIntl\./),
        unsupportedClaim: has(/UNSUPPORTED|not yet (supported|implemented)|SKIP:/i),
    };
}

// Primary category: how a failure in this file could become visible.
function categoryOf(s) {
    if (s.throwingAssert || s.throwsOnCheck) return "assertion-bearing (throws)";
    if (s.detectedFailMarker) return "assertion-bearing (prints FAIL:/❌)";
    if (s.undetectedFailMarker) return "marker-only, invisible to harness (FAIL without colon/✗)";
    if (s.printsComparisons) return "output-only (prints comparison booleans)";
    return "output-only (demo/trace)";
}

function inventory() {
    return walk(TEST_DIR, []).map((file) => {
        const relative = path.relative(TEST_DIR, file).split(path.sep).join("/");
        const isJs = relative.endsWith(".js");
        const source = isJs ? fs.readFileSync(file, "utf8") : "";
        const signals = isJs ? signalsOf(source) : null;
        return {
            file: `test/${relative}`,
            directory: path.dirname(relative) === "." ? "(root)" : path.dirname(relative),
            harnessRuns: isJs && !relative.split("/").includes("skipped") && !path.basename(relative).startsWith("temp_"),
            lines: isJs ? source.split("\n").length : 0,
            area: isJs ? areaOf(relative) : "non-JS",
            category: isJs ? categoryOf(signals) : "non-JS",
            signals,
        };
    });
}

function countBy(records, key) {
    const counts = new Map();
    for (const r of records) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function printTable(title, rows) {
    console.log(`\n## ${title}\n`);
    for (const [name, count] of rows) console.log(`${String(count).padStart(4)}  ${name}`);
}

const records = inventory();
if (process.argv.includes("--json")) {
    console.log(JSON.stringify(records, null, 2));
} else {
    const js = records.filter((r) => r.area !== "non-JS");
    const run = js.filter((r) => r.harnessRuns);
    console.log(`files under test/: ${records.length}; .js: ${js.length}; run by npm test: ${run.length}`);
    printTable("By directory (all .js)", countBy(js, (r) => r.directory));
    printTable("By area (run by npm test)", countBy(run, (r) => r.area));
    printTable("By failure-visibility category (run by npm test)", countBy(run, (r) => r.category));
    const flags = Object.keys(run[0].signals);
    printTable(
        "Signal counts (run by npm test; a file may have several)",
        flags.map((f) => [f, run.filter((r) => r.signals[f]).length]).sort((a, b) => b[1] - a[1]),
    );
}
