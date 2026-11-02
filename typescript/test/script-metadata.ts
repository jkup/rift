import { readFileSync } from "node:fs";
import { inspectScript } from "../src/script-metadata.js";
import { parse, auditScriptReturns } from "../src/parser.js";

// Runtime source input, not guest execution. Also expose full legacy records so
// the host can compare native partial ASTs/diagnostics against the frozen base.
const text = readFileSync(process.argv[2], "utf8");
const unit = { id: process.argv[3], text };
const metadata = inspectScript(unit);
if (metadata.unit.id !== unit.id || metadata.unit.text !== text) throw new Error("source identity");
unit.id = "changed by host";
unit.text = "changed by host";
if (metadata.unit.id !== process.argv[3] || metadata.unit.text !== text) throw new Error("source snapshot");
const next = inspectScript({ id: "separate unit", text: "function f(){}" });
if (next.kind !== "complete" || next.strictness.strict || next.functions[0].strictness.strict) throw new Error("strictness leaked between units");
if (process.argv[4] === "summary") {
    // Deep-chain stress cases must not recursively stringify the legacy AST.
    // Preserve full AST equality output for the unchanged baseline matrix.
    console.log(JSON.stringify({ metadata, parseError: parse(text).error, audit: auditScriptReturns(text) }));
} else console.log(JSON.stringify({ metadata, parse: parse(text), audit: auditScriptReturns(text) }));
