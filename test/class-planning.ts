import { parseBoundedScriptDeclarationPlan, parse } from "../src/parser.js";
import { validateScriptAssociations } from "../src/script-associations.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import type { ClassExpr } from "../src/syntax.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const text =
    "class C { constructor(x){this.x=x} get value(){return this.x} static read(){return C} }";
const plan = parseBoundedScriptDeclarationPlan({ id: "class-plan", text });
if (plan.kind !== "complete") {
    throw new Error(JSON.stringify(plan));
}
check(
    plan.declarations[0].kind === "class" && plan.declarations[0].site.name === "C",
    "outer class declaration",
);
check(
    plan.scopes[1].kind === "class" &&
        plan.scopes[1].strict &&
        plan.scopes[1].lexicalNames[0] === "C",
    "strict inner scope",
);
check(
    plan.functions.length === 3 &&
        plan.functions.every((fn) => fn.strictness.strict && fn.strictness.inheritedStrict),
    "strict methods",
);
for (const source of [
    "class C{};let C;",
    "class C{constructor(){} constructor(){}}",
    "class C{get constructor(){}}",
    "class C{static prototype(){}}",
    "class C{m(a,a){}}",
    "class eval{}",
    "if(true)class C{}",
    "class C extends B{}",
    "class C{x=1}",
    "class C{static{}}",
]) {
    if (source === "class C extends B{}") {
        const inherited = parseBoundedScriptDeclarationPlan({ id: "derived-class", text: source });
        check(
            inherited.kind === "complete" &&
                inherited.declarations[0].kind === "class" &&
                inherited.functions.length === 0,
            "default derived planning retains original source",
        );
    } else if (source === "class C{x=1}") {
        const initialized = parseBoundedScriptDeclarationPlan({
            id: "initialized-class",
            text: source,
        });
        check(
            initialized.kind === "complete" &&
                initialized.scopes.some(
                    (scope) => scope.kind === "field-initializer" && scope.strict,
                ),
            "initializer scope retains original source",
        );
    } else if (source === "class C{static{}}") {
        const block = parseBoundedScriptDeclarationPlan({ id: "static-block", text: source });
        check(
            block.kind === "complete" &&
                block.scopes.some((scope) => scope.kind === "static-block" && scope.strict),
            "static block retains original source",
        );
    } else {
        check(
            parseBoundedScriptDeclarationPlan({ id: "invalid-class", text: source }).kind !==
                "complete",
            "reject " + source,
        );
    }
}
check(parse(text).error !== null, "legacy class boundary");
function validateName(edit: (node: ClassExpr) => void, rejected: boolean): void {
    const nodes: DeclarationNodes = {
        assignmentNameEligible: new Map(),
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
    };
    const result = parseBoundedScriptDeclarationPlan(
        { id: "escaped-name", text: "class aw\\u0061it{}" },
        nodes,
    );
    const entry = nodes.scopes.get(1);
    if (result.kind !== "complete" || entry?.node?.kind !== "class") {
        throw new Error("class name setup");
    }
    edit(entry.node);
    let failed = false;
    try {
        validateScriptAssociations(result, nodes);
    } catch {
        failed = true;
    }
    check(failed === rejected, "class name source validation");
}
validateName((_node: ClassExpr) => {}, false);
validateName((node: ClassExpr) => {
    if (node.name !== null) {
        node.name = { ...node.name, end: node.name.end - 1 };
    }
}, true);
validateName((node: ClassExpr) => {
    if (node.name !== null) {
        node.name = { ...node.name, start: node.name.start + 1 };
    }
}, true);
validateName((node: ClassExpr) => {
    node.source = { text: "class aw\\u0062it{}" };
}, true);
console.log("Class planning passed");
