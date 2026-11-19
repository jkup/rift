#!/usr/bin/env node
// Reference check: runs each example under Node as a classic (non-module)
// script and compares stdout byte-for-byte with manifest.json.
//
//   node typescript/fixtures/assistance/semantic-examples/verify-node.mjs
//
// The source is piped to a child `node --input-type=commonjs`, so the
// surrounding package's "type": "module" does not turn examples into strict
// ES modules. Node agreement is reference evidence, not proof Rift supports
// the example.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, "manifest.json"), "utf8"));

let failures = 0;
console.log(`node ${process.version}`);
for (const example of manifest.examples) {
    const source = fs.readFileSync(path.join(here, example.file), "utf8");
    const run = spawnSync(process.execPath, ["--input-type=commonjs"], {
        input: source,
        encoding: "utf8",
    });
    const ok = run.status === 0 && run.stderr === "" && run.stdout === example.stdout;
    if (!ok) failures = failures + 1;
    console.log(`${ok ? "ok  " : "FAIL"} [${example.group}] ${example.file}`);
    if (!ok) {
        console.log(`  status: ${run.status}`);
        console.log(`  expected: ${JSON.stringify(example.stdout)}`);
        console.log(`  actual:   ${JSON.stringify(run.stdout)}`);
        if (run.stderr) console.log(`  stderr:   ${JSON.stringify(run.stderr)}`);
    }
}
console.log(`${manifest.examples.length - failures}/${manifest.examples.length} match`);
process.exitCode = failures === 0 ? 0 : 1;
