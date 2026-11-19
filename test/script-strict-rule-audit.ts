import { readFileSync } from "node:fs";
import { auditBoundedScriptBlockFunctions, parse, parseDeclarationPlan, parseBoundedScriptDeclarationPlan, auditScriptReturns } from "../src/parser.js";

// All matrix sources, including both distinct fixtures, enter through runtime I/O.
const text = readFileSync(process.argv[2], "utf8");
const id = process.argv[3];
const unit = { id, text };
const audit = auditBoundedScriptBlockFunctions(text);
const legacy = parse(text);
const ordinary = { legacy: { error: legacy.error, rejection: legacy.rejection },
    returns: auditScriptReturns(text), declaration: parseDeclarationPlan(unit), bounded: parseBoundedScriptDeclarationPlan(unit) };

// A first site reused across three-name pairs must also be detached per pair.
const triple = '"use strict"; {function f(){} function f(){} function f(){}}';
const detached = auditBoundedScriptBlockFunctions(triple);
if (detached.kind !== "eligible" || detached.candidates.length !== 2) throw new Error("triple candidates");
(detached.candidates[0].first as { name: string }).name = "changed";
(detached.candidates[0].first.loc as { column: number }).column = 999;
if (detached.candidates[1].first.name !== "f" || detached.candidates[1].first.loc.column !== 25) throw new Error("shared candidate site");
const fresh = auditBoundedScriptBlockFunctions(triple);
if (fresh.kind !== "eligible" || fresh.candidates[0].first.name !== "f" || fresh.candidates[0].first.loc.column !== 25) throw new Error("audit isolation");
console.log(JSON.stringify({ audit, ordinary }));
