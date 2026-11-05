import { readFileSync } from "node:fs";
import { auditBoundedScriptLexicalStatements, auditBoundedScriptNumericAssignments, auditBoundedScriptStrictParameters, auditBoundedScriptBlockFunctions, parse, parseDeclarationPlan, parseBoundedScriptDeclarationPlan, parseBoundedScriptPreparation, auditScriptReturns } from "../src/parser.js";
import type { DeclarationNodes, LexicalStatementCandidate } from "../src/script-declarations.js";
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
    bounded: parseBoundedScriptDeclarationPlan(unit, boundedNodes), D1: auditBoundedScriptBlockFunctions(text), D3: auditBoundedScriptStrictParameters(text), D5: auditBoundedScriptNumericAssignments(text), preparation: parseBoundedScriptPreparation(unit, prepNodes) };
const before = JSON.stringify(ordinary);
const retainedBefore = [snapshot(strictNodes), snapshot(boundedNodes), snapshot(prepNodes)];
const audit = auditBoundedScriptLexicalStatements(text);
// Both independent runtime files are read even for literal matrix rows.
const left = readFileSync(process.argv[4], "utf8");
const right = readFileSync(process.argv[5], "utf8");
const leftNodes = newNodes(), rightNodes = newNodes();
parseBoundedScriptPreparation({ id: "runtime", text: left }, leftNodes);
parseBoundedScriptPreparation({ id: "runtime", text: right }, rightNodes);
if (leftNodes.source === rightNodes.source || leftNodes.source.text !== left || rightNodes.source.text !== right) throw new Error("runtime parsed source identities");
const leftBefore = JSON.stringify(auditBoundedScriptLexicalStatements(left));
const rightBefore = JSON.stringify(auditBoundedScriptLexicalStatements(right));
if (JSON.stringify(auditBoundedScriptLexicalStatements(right)) !== rightBefore ||
    JSON.stringify(auditBoundedScriptLexicalStatements(left)) !== leftBefore) throw new Error("runtime reverse order");
if (JSON.stringify(auditBoundedScriptLexicalStatements(left)) !== leftBefore ||
    JSON.stringify(auditBoundedScriptLexicalStatements(right)) !== rightBefore) throw new Error("runtime forward order");
const chain = "if(true) let a; else let b;";
const detached = auditBoundedScriptLexicalStatements(chain);
if (detached.kind !== "eligible" || detached.candidates.length !== 2) throw new Error("two candidates");
const pristine = JSON.stringify(detached);
(detached.candidates[0].keyword as { text: string }).text = "changed";
(detached.candidates[0].keyword.loc as { column: number }).column = 999;
(detached.candidates[0] as { context: string }).context = "changed";
if (detached.candidates[1].keyword.text !== "let" || detached.candidates[1].keyword.loc.column === 999) throw new Error("shared candidate site");
(detached.candidates as LexicalStatementCandidate[]).pop();
const fresh = auditBoundedScriptLexicalStatements(chain);
if (fresh.kind !== "eligible" || JSON.stringify(fresh) !== pristine || fresh === detached || fresh.candidates === detached.candidates || fresh.candidates[0] === detached.candidates[0] || fresh.candidates[0].keyword === detached.candidates[0].keyword || fresh.candidates[0].keyword.loc === detached.candidates[0].keyword.loc) throw new Error("audit isolation");
if (JSON.stringify(auditBoundedScriptLexicalStatements(text)) !== JSON.stringify(audit)) throw new Error("source call order");
// Retained assignments must be the actual tree nodes, with grouping affecting
// anonymous-function naming exactly as before this audit exists.
const identityNodes = newNodes();
const identity = parseBoundedScriptPreparation({ id: "identity", text: "var x; x=function(){}; (x)=function(){};" }, identityNodes);
if (identity.kind !== "complete" || identityNodes.body.length !== 3) throw new Error("identity preparation");
const first = identityNodes.body[1], second = identityNodes.body[2];
if (first.kind !== "expression" || second.kind !== "expression") throw new Error("identity statements");
if (identityNodes.assignmentNameEligible.get(first.expression) !== true || identityNodes.assignmentNameEligible.get(second.expression) !== false) throw new Error("assignment name identities");
const root = identityNodes.scopes.get(0);
if (root === undefined || root.body !== identityNodes.body) throw new Error("scope body identity");
for (const [, declaration] of identityNodes.declarations) {
    if (!identityNodes.body.includes(declaration.node)) throw new Error("declaration node identity");
}
const otherNodes = newNodes();
parseBoundedScriptPreparation({ id: "identity", text: "var x; x=function(){}; (x)=function(){};" }, otherNodes);
if (otherNodes.source === identityNodes.source || otherNodes.body === identityNodes.body) throw new Error("source identity isolation");
if (JSON.stringify(ordinary) !== before) throw new Error("ordinary mutation");
const after = { legacy: parse(text), returns: auditScriptReturns(text), declaration: parseDeclarationPlan(unit),
    bounded: parseBoundedScriptDeclarationPlan(unit), D1: auditBoundedScriptBlockFunctions(text), D3: auditBoundedScriptStrictParameters(text), D5: auditBoundedScriptNumericAssignments(text), preparation: parseBoundedScriptPreparation(unit, newNodes()) };
if (JSON.stringify(after) !== before) throw new Error("ordinary result after audit");
if (JSON.stringify(retainedBefore) !== JSON.stringify([snapshot(strictNodes), snapshot(boundedNodes), snapshot(prepNodes)])) throw new Error("retained mutation");
console.log(JSON.stringify({ audit, ordinary, runtime: [{ text: left, audit: auditBoundedScriptLexicalStatements(left) }, { text: right, audit: auditBoundedScriptLexicalStatements(right) }], nodes: [snapshot(strictNodes), snapshot(boundedNodes), snapshot(prepNodes)] }));
