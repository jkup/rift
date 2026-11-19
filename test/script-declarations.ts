import { readFileSync } from "node:fs";
import { planScriptDeclarations, selectFunctionDeclarations } from "../src/script-declarations.js";
import { parse, auditScriptReturns } from "../src/parser.js";
import { inspectScript } from "../src/script-metadata.js";
const text = readFileSync(process.argv[2], "utf8");
const unit = { id: process.argv[3], text };
const plan = planScriptDeclarations(unit);
unit.id = "mutated"; unit.text = "mutated";
if (plan.unit.id !== process.argv[3] || plan.unit.text !== text) throw new Error("detached unit");
const next = planScriptDeclarations({ id: "next", text: "var separate;" });
if (next.kind !== "complete" || next.strictness.strict || next.scopes.length !== 1 || next.declarations[0].id !== 0) throw new Error("plan isolation");
const detached = planScriptDeclarations({ id: "detached", text: '"use strict"; let kept=1; function f(a){}' });
if (detached.kind !== "complete") throw new Error("snapshot setup");
(detached.declarations[0].site as { name: string }).name = "changed";
(detached.declarations[0].site.loc as { column: number }).column = 99;
(detached.scopes[0].lexicalNames as string[]).push("changed");
(detached.functions[0].strictness as { strict: boolean }).strict = false;
(detached.strictness.directives[0].loc as { column: number }).column = 99;
const fresh = planScriptDeclarations({ id: "detached", text: '"use strict"; let kept=1; function f(a){}' });
if (fresh.kind !== "complete" || fresh.declarations[0].site.name !== "kept" || fresh.declarations[0].site.loc.column !== 19 || fresh.scopes[0].lexicalNames.length !== 1 || !fresh.functions[0].strictness.strict || fresh.strictness.directives[0].loc.column !== 1) throw new Error("snapshot mutation leaked");
const winners: (readonly number[])[] = [];
if (plan.kind === "complete") {
    for (const scope of plan.scopes) winners.push(selectFunctionDeclarations(scope, plan.declarations));
}
// Never stringify deep ASTs: the plan itself is flat even for long chains.
const parsed = parse(text);
console.log(JSON.stringify({ plan, winners, legacy: { error: parsed.error, rejection: parsed.rejection },
    audit: auditScriptReturns(text), metadata: inspectScript({ id: process.argv[3], text }) }));
