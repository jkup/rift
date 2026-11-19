import { parseBoundedScriptPreparation, parseBoundedScriptDeclarationPlan } from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function prepare(text: string, inheritedStrict = false) {
    const nodes: DeclarationNodes = {
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
        assignmentNameEligible: new Map(),
        argumentsScopes: new Set(),
    };
    return {
        plan: parseBoundedScriptPreparation({ id: "original", text }, nodes, inheritedStrict),
        nodes,
    };
}
function rejection(
    text: string,
    inherited: boolean,
    kind: "syntax-error" | "unsupported-syntax",
    code: string,
): void {
    const { plan } = prepare(text, inherited);
    if (plan.kind !== "blocked") {
        throw new Error("expected rejection: " + text);
    }
    check(plan.unit.text === text && plan.unit.id === "original", "rejected source identity");
    check(plan.rejection.kind === kind, "rejection kind: " + text);
    if (plan.rejection.kind === "syntax-error") {
        check(plan.rejection.ruleCode === code, "syntax rule: " + text);
    } else if (plan.rejection.kind === "unsupported-syntax") {
        check(plan.rejection.capabilityCode === code, "capability: " + text);
    }
}

for (const inherited of [false, true]) {
    const text = "\n/* original */ function f(a=1){return ()=>a;}";
    const { plan, nodes } = prepare(text, inherited);
    if (plan.kind !== "complete") {
        throw new Error("function preparation");
    }
    check(
        plan.unit.text === text && nodes.source.text === text && plan.consumedUnits === text.length,
        "source preserved",
    );
    check(
        !plan.strictness.ownStrict &&
            plan.strictness.inheritedStrict === inherited &&
            plan.strictness.strict === inherited,
        "root strictness",
    );
    check(plan.strictness.directives.length === 0, "no synthetic directive");
    check(
        plan.scopes.every((scope) => scope.strict === inherited),
        "nested strictness",
    );
    check(plan.functions.length === 2, "nested function count");
    const fn = plan.functions[0];
    check(
        text.slice(fn.start, fn.end) === "function f(a=1){return ()=>a;}",
        "original function span",
    );
    const declaration = plan.declarations[0];
    check(
        declaration.site.loc.line === 2 && declaration.site.loc.column === 25,
        "original declaration location",
    );
    const ordinary = parseBoundedScriptDeclarationPlan({ id: "ordinary", text });
    check(
        ordinary.kind === "complete" && !ordinary.strictness.strict,
        "ordinary planner unaffected",
    );
}
for (const inherited of [false, true]) {
    const { plan } = prepare("'use strict'\nfunction f(){return this;}", inherited);
    check(
        plan.kind === "complete" &&
            plan.strictness.ownStrict &&
            plan.strictness.inheritedStrict === inherited &&
            plan.strictness.strict,
        "own directive retained",
    );
}
const block = "{function f(){} function f(){}}";
rejection(block, false, "unsupported-syntax", "parse.declaration-statement");
rejection(block, true, "syntax-error", "duplicate-block-lexical-function");
const parameters = "\nfunction f(a,a){}";
check(prepare(parameters, false).plan.kind === "complete", "sloppy duplicate parameters admitted");
rejection(parameters, true, "syntax-error", "duplicate-strict-parameter");
const duplicate = prepare(parameters, true).plan;
check(
    duplicate.kind === "blocked" &&
        duplicate.diagnostic.loc.line === 2 &&
        duplicate.diagnostic.loc.column === 14,
    "duplicate parameter offset",
);
rejection(
    "function f(a,a){} var arguments;",
    true,
    "unsupported-syntax",
    "parse.binding-identifier",
);

for (const text of [
    "var arguments;",
    "arguments=1;",
    "function f(arguments){}",
    "try{}catch(arguments){}",
]) {
    check(prepare(text).plan.kind === "complete", "sloppy arguments accepted");
    rejection(text, true, "unsupported-syntax", "parse.binding-identifier");
}
check(prepare("var x;delete x;").plan.kind === "complete", "sloppy deletion");
rejection("var x;delete x;", true, "unsupported-syntax", "parse.delete-identifier");

// Retry audits must apply the same inherited scope restrictions as preparation.
rejection("42=1;", true, "syntax-error", "assignment-target");
rejection("42=1;var arguments;", false, "syntax-error", "assignment-target");
rejection("42=1;var arguments;", true, "unsupported-syntax", "parse.assignment-target");
rejection("if(false)let x;", true, "syntax-error", "lexical-declaration-statement");
rejection("if(false)let x;var arguments;", false, "syntax-error", "lexical-declaration-statement");
rejection(
    "if(false)let x;var arguments;",
    true,
    "unsupported-syntax",
    "parse.declaration-statement",
);
const legacy = "{function f(){}}";
const sloppy = prepare(legacy).plan,
    strict = prepare(legacy, true).plan;
check(
    sloppy.kind === "complete" && sloppy.legacyBlockFunctions?.length === 1,
    "sloppy Annex B function",
);
check(
    strict.kind === "complete" && strict.legacyBlockFunctions === undefined,
    "strict Annex B exclusion",
);
console.log("Inherited strictness passed");
