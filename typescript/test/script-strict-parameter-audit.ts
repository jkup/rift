import { readFileSync } from "node:fs";
import { auditBoundedScriptStrictParameters, auditBoundedScriptBlockFunctions, parse, parseDeclarationPlan, parseBoundedScriptDeclarationPlan, parseBoundedScriptPreparation, auditScriptReturns } from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import type { Expr, Stmt } from "../src/syntax.js";
function newNodes(): DeclarationNodes {
    return { assignmentNameEligible: new Map(), source: { text: "" }, body: [], scopes: new Map(), declarations: new Map() };
}
function snapshot(n: DeclarationNodes): string {
    const scopes: { id: number; node: Stmt | Expr | null; body: Stmt[] }[] = [];
    for (const [id, value] of n.scopes) scopes.push({ id, node: value.node, body: value.body });
    const declarations: { id: number; node: Stmt; initializer: Expr | null }[] = [];
    for (const [id, value] of n.declarations) declarations.push({ id, node: value.node, initializer: value.initializer });
    const assignments: { node: Expr; eligible: boolean }[] = [];
    for (const [node, eligible] of n.assignmentNameEligible) assignments.push({ node, eligible });
    return JSON.stringify({ source: n.source, body: n.body, scopes, declarations, assignments });
}
const text = readFileSync(process.argv[2], "utf8");
const id = process.argv[3];
const unit = { id, text };
const strictNodes = newNodes(), boundedNodes = newNodes(), prepNodes = newNodes();
const ordinary = { legacy: parse(text), returns: auditScriptReturns(text), declaration: parseDeclarationPlan(unit, strictNodes),
    bounded: parseBoundedScriptDeclarationPlan(unit, boundedNodes), D1: auditBoundedScriptBlockFunctions(text), D2: parseBoundedScriptPreparation(unit, prepNodes) };
const before = JSON.stringify(ordinary);
const audit = auditBoundedScriptStrictParameters(text);
// Both independent runtime files are read even for literal matrix rows.
const left = readFileSync("test/fixtures/script-strict-parameter-audit/a.js", "utf8");
const right = readFileSync("test/fixtures/script-strict-parameter-audit/b.js", "utf8");
const leftBefore = JSON.stringify(auditBoundedScriptStrictParameters(left));
const rightBefore = JSON.stringify(auditBoundedScriptStrictParameters(right));
if (JSON.stringify(auditBoundedScriptStrictParameters(right)) !== rightBefore ||
    JSON.stringify(auditBoundedScriptStrictParameters(left)) !== leftBefore) throw new Error("runtime reverse order");
if (JSON.stringify(auditBoundedScriptStrictParameters(left)) !== leftBefore ||
    JSON.stringify(auditBoundedScriptStrictParameters(right)) !== rightBefore) throw new Error("runtime forward order");
const triple = 'function f(a,a,a){"use strict";}';
const detached = auditBoundedScriptStrictParameters(triple);
if (detached.kind !== "eligible" || detached.candidates.length !== 2) throw new Error("triple candidates");
(detached.candidates[0] as { functionStart: number }).functionStart = 900;
(detached.candidates[0].first as { name: string }).name = "changed";
(detached.candidates[0].first.loc as { column: number }).column = 999;
if (detached.candidates[1].first.name !== "a" || detached.candidates[1].first.loc.column !== 12) throw new Error("shared candidate site");
const fresh = auditBoundedScriptStrictParameters(triple);
if (fresh.kind !== "eligible" || fresh.candidates[0].first.name !== "a" || fresh.candidates[0].first.loc.column !== 12 || fresh.candidates[0].functionStart !== 0) throw new Error("audit isolation");
if (JSON.stringify(auditBoundedScriptStrictParameters(text)) !== JSON.stringify(audit)) throw new Error("reverse source order");
if (JSON.stringify(auditBoundedScriptStrictParameters(triple)) !== JSON.stringify(fresh)) throw new Error("forward source order");
if (JSON.stringify(ordinary) !== before) throw new Error("ordinary mutation");
const after = { legacy: parse(text), returns: auditScriptReturns(text), declaration: parseDeclarationPlan(unit),
    bounded: parseBoundedScriptDeclarationPlan(unit), D1: auditBoundedScriptBlockFunctions(text), D2: parseBoundedScriptPreparation(unit, newNodes()) };
if (JSON.stringify(after) !== before) throw new Error("ordinary result after audit");
console.log(JSON.stringify({ audit, ordinary, nodes: [snapshot(strictNodes), snapshot(boundedNodes), snapshot(prepNodes)] }));
