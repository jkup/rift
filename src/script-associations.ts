import type {
    DeclarationNodes,
    DeclarationScope,
    ScriptDeclarationPlan,
} from "./script-declarations.js";
import type { Expr, Stmt, ClassInitializer } from "./syntax.js";
import { lexicalLoopBindings } from "./script-loop-bindings.js";
import { scanIdentifier } from "./identifier-scan.js";
type ScopeIndex = Map<Expr | Stmt | ClassInitializer, number>;
type ScopeEntry = { node: Expr | Stmt | ClassInitializer | null; body: Stmt[] };

// Validate parser/collector associations before the opaque record retains them.
// This module has no execution key and cannot construct an executable record.
export function validateScriptAssociations(
    plan: ScriptDeclarationPlan,
    nodes: DeclarationNodes,
): ScopeIndex {
    if (
        nodes.scopes.size !== plan.scopes.length ||
        nodes.declarations.size !== plan.declarations.length
    ) {
        throw new Error("Script node association mismatch");
    }
    const root = nodes.scopes.get(0);
    if (root === undefined || root.node !== null || root.body !== nodes.body) {
        throw new Error("Script root body mismatch");
    }
    validateFunctionAssociations(plan, nodes);
    const scopes: ScopeIndex = new Map();
    for (const scope of plan.scopes) {
        const entry = nodes.scopes.get(scope.id);
        if (entry === undefined) {
            throw new Error("missing Script scope association");
        }
        if (scope.id === 0) {
            validateRootScope(nodes, scope, entry);
        } else if (scope.kind === "class") {
            validateClassScope(plan, nodes, scopes, scope, entry);
        } else if (scope.kind === "field-initializer") {
            validateFieldInitializerScope(nodes, scopes, scope, entry);
        } else if (scope.kind === "static-block") {
            validateStaticBlockScope(nodes, scopes, scope, entry);
        } else if (scope.kind === "switch") {
            validateSwitchScope(plan, scopes, scope, entry);
        } else if (
            scope.kind === "for-of" ||
            scope.kind === "for-in" ||
            scope.kind === "for-lexical"
        ) {
            validateLexicalLoopScope(plan, scopes, scope, entry);
        } else if (scope.kind === "catch") {
            validateCatchScope(plan, scopes, scope, entry);
        } else {
            validateOrdinaryScope(scopes, scope, entry);
        }
        if (
            scope.kind !== "catch" &&
            (scope.catchParameter !== null || scope.catchBindings !== undefined)
        ) {
            throw new Error("foreign catch parameter");
        }
        if (scope.parent !== null) {
            const parent = plan.scopes[scope.parent];
            if (scope.kind === "switch" || parent.kind === "switch") {
                if (
                    scope.parent >= scope.id ||
                    scope.start < parent.start ||
                    scope.end > parent.end ||
                    (scope.kind !== "function" &&
                        scope.kind !== "class" &&
                        scope.strict !== parent.strict)
                ) {
                    throw new Error("invalid CaseBlock child scope");
                }
            }
        }
    }
    validateCatchChildren(plan, nodes, scopes);
    return scopes;
}
function validateFunctionAssociations(plan: ScriptDeclarationPlan, nodes: DeclarationNodes): void {
    for (const fn of plan.functions) {
        const entry = nodes.scopes.get(fn.scope);
        if (entry === undefined || entry.node === null || entry.node.kind !== "function") {
            throw new Error("Script function node mismatch");
        }
        const source = entry.node.source;
        if (
            source === null ||
            source.source !== nodes.source ||
            source.source.text !== plan.unit.text ||
            source.start !== fn.start ||
            source.end !== fn.end ||
            entry.body !== entry.node.body
        ) {
            throw new Error("Script function source mismatch");
        }
        if (fn.declaration !== null) {
            const declaration = nodes.declarations.get(fn.declaration);
            if (
                declaration === undefined ||
                declaration.node.kind !== "function" ||
                declaration.node !== entry.node
            ) {
                throw new Error("Script function declaration mismatch");
            }
        }
    }
}
function validateRootScope(
    nodes: DeclarationNodes,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    if (scope.kind !== "script" || entry.node !== null || entry.body !== nodes.body) {
        throw new Error("invalid Script root");
    }
}

function validateClassScope(
    plan: ScriptDeclarationPlan,
    nodes: DeclarationNodes,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    const node = entry.node;
    if (
        node === null ||
        node.kind !== "class" ||
        scopes.has(node) ||
        !scope.strict ||
        node.source !== nodes.source ||
        node.start !== scope.start ||
        node.end !== scope.end ||
        entry.body.length !== 0 ||
        scope.parent === null ||
        scope.formals.length !== 0 ||
        scope.lexicalDeclarations.length !== 0 ||
        scope.varDeclarations.length !== 0 ||
        scope.varNames.length !== 0 ||
        scope.lexicalNames.length !== (node.name === null ? 0 : 1) ||
        (node.name !== null && scope.lexicalNames[0] !== node.name.name)
    ) {
        throw new Error("invalid class scope association");
    }
    const parent = plan.scopes[scope.parent];
    if (node.name !== null) {
        // Name text is decoded, while its source range retains Unicode escapes.
        const name = scanIdentifier(node.source.text, node.name.start);
        if (
            node.name.start < node.start ||
            node.name.end > node.end ||
            name.kind !== "ready" ||
            name.end !== node.name.end ||
            name.text !== node.name.name
        ) {
            throw new Error("invalid class name source range");
        }
    }
    if (
        scope.parent >= scope.id ||
        scope.start < parent.start ||
        scope.end > parent.end ||
        (node.constructorMethod !== null &&
            node.elements.filter(
                (element) =>
                    element.kind === "method" &&
                    element.value === node.constructorMethod &&
                    !element.isStatic,
            ).length !== 1)
    ) {
        throw new Error("invalid class source range");
    }
    scopes.set(node, scope.id);
}

function validateFieldInitializerScope(
    nodes: DeclarationNodes,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    const node = entry.node,
        parent = scope.parent === null ? undefined : nodes.scopes.get(scope.parent);
    if (
        node === null ||
        node.kind !== "field-initializer" ||
        scopes.has(node) ||
        !scope.strict ||
        scope.start !== node.start ||
        scope.end !== node.end ||
        node.end <= node.start ||
        entry.body.length !== 0 ||
        scope.formals.length !== 0 ||
        scope.lexicalNames.length !== 0 ||
        scope.varNames.length !== 0 ||
        scope.lexicalDeclarations.length !== 0 ||
        scope.varDeclarations.length !== 0 ||
        parent === undefined ||
        parent.node === null ||
        parent.node.kind !== "class" ||
        scope.parent === null ||
        scope.parent >= scope.id ||
        node.start < parent.node.start ||
        node.end > parent.node.end ||
        !parent.node.elements.some(
            (element) => element.kind === "field" && element.initializer === node,
        )
    ) {
        throw new Error("invalid class field initializer association");
    }
    scopes.set(node, scope.id);
}

function validateStaticBlockScope(
    nodes: DeclarationNodes,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    const node = entry.node,
        parent = scope.parent === null ? undefined : nodes.scopes.get(scope.parent);
    if (
        node === null ||
        node.kind !== "static-block" ||
        scopes.has(node) ||
        !scope.strict ||
        scope.start !== node.start ||
        scope.end !== node.end ||
        entry.body !== node.body ||
        scope.formals.length !== 0 ||
        parent === undefined ||
        parent.node === null ||
        parent.node.kind !== "class" ||
        scope.parent === null ||
        scope.parent >= scope.id ||
        node.start < parent.node.start ||
        node.end > parent.node.end ||
        !parent.node.elements.includes(node)
    ) {
        throw new Error("invalid class static block association");
    }
    scopes.set(node, scope.id);
}

function validateSwitchScope(
    plan: ScriptDeclarationPlan,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    if (entry.node === null || entry.node.kind !== "switch" || scopes.has(entry.node)) {
        throw new Error("invalid switch owner");
    }
    const block = entry.node.caseBlock;
    if (
        entry.body !== block.body ||
        scope.start !== block.start ||
        scope.end !== block.end ||
        scope.parent === null ||
        scope.strict !== plan.scopes[scope.parent].strict ||
        scope.formals.length !== 0
    ) {
        throw new Error("invalid CaseBlock association");
    }
    let previous = block.start,
        offset = 0,
        defaults = 0;
    const statements = new Map<Stmt, boolean>();
    for (const clause of block.clauses) {
        if (clause.start <= previous || clause.end <= clause.start || clause.end >= block.end) {
            throw new Error("invalid switch clause range");
        }
        previous = clause.end - 1;
        if (clause.test === null) {
            defaults++;
        }
        for (const statement of clause.body) {
            if (block.body[offset++] !== statement || statements.has(statement)) {
                throw new Error("invalid CaseBlock body identity");
            }
            statements.set(statement, true);
        }
    }
    if (defaults > 1 || offset !== block.body.length) {
        throw new Error("invalid CaseBlock flattening");
    }
    scopes.set(entry.node, scope.id);
}

function validateLexicalLoopScope(
    plan: ScriptDeclarationPlan,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    if (
        entry.node === null ||
        (entry.node.kind !== "for-lexical" &&
            entry.node.kind !== "for-of" &&
            entry.node.kind !== "for-in") ||
        scopes.has(entry.node)
    ) {
        throw new Error("invalid lexical loop owner");
    }
    const node = entry.node;
    const head = lexicalLoopBindings(node);
    if (head === null || scope.kind !== node.kind) {
        throw new Error("invalid lexical loop kind");
    }
    if (
        entry.body.length !== 1 ||
        entry.body[0] !== node.body ||
        scope.start !== node.start ||
        scope.end !== node.end ||
        scope.parent === null ||
        scope.parent >= scope.id ||
        scope.strict !== plan.scopes[scope.parent].strict ||
        scope.formals.length !== 0 ||
        scope.start < plan.scopes[scope.parent].start ||
        scope.end > plan.scopes[scope.parent].end ||
        scope.lexicalDeclarations.length !== head.sites.length ||
        scope.lexicalNames.length !== head.sites.length
    ) {
        throw new Error("invalid lexical loop association");
    }
    for (let i = 0; i < head.sites.length; i++) {
        const site = head.sites[i];
        const initializer = node.kind === "for-lexical" ? node.bindings[i].initializer : null;
        const declaration = plan.declarations[scope.lexicalDeclarations[i]];
        if (
            scope.lexicalNames[i] !== site.name ||
            declaration === undefined ||
            declaration.kind !== head.declarationKind ||
            declaration.site.start !== site.start ||
            declaration.site.end !== site.end ||
            declaration.site.name !== site.name ||
            declaration.scope !== scope.id ||
            declaration.functionScope !== null ||
            (initializer === null
                ? declaration.initializer !== null
                : declaration.initializer === null ||
                  declaration.initializer.start !== initializer.start ||
                  declaration.initializer.end !== initializer.end) ||
            site.start <= node.start ||
            site.end >= node.end ||
            (initializer !== null &&
                (initializer.start <= site.end ||
                    initializer.end >= node.end ||
                    initializer.end <= initializer.start))
        ) {
            throw new Error("invalid lexical loop binding association");
        }
    }
    scopes.set(node, scope.id);
}

function validateCatchScope(
    plan: ScriptDeclarationPlan,
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    if (
        entry.node === null ||
        entry.node.kind !== "try-catch" ||
        entry.body !== entry.node.handler.body ||
        scopes.has(entry.node)
    ) {
        throw new Error("invalid catch node identity");
    }
    const node = entry.node;
    const parameter = scope.catchParameter;
    if (node.parameter === null) {
        throw new Error("catch scope without parameter");
    }
    const sites = "pattern" in node.parameter ? node.parameter.bindings : [node.parameter];
    if ("pattern" in node.parameter) {
        if (parameter !== null || scope.catchBindings !== node.parameter.bindings) {
            throw new Error("invalid catch pattern identity");
        }
    } else if (
        parameter === null ||
        parameter !== node.parameter ||
        scope.catchBindings !== undefined
    ) {
        throw new Error("invalid catch parameter identity");
    }
    if (
        scope.start !== node.catchStart ||
        scope.end !== node.catchEnd ||
        scope.parent === null ||
        scope.strict !== plan.scopes[scope.parent].strict ||
        scope.formals.length !== 0 ||
        scope.lexicalDeclarations.length !== 0 ||
        scope.varDeclarations.length !== 0 ||
        scope.varNames.length !== 0 ||
        scope.lexicalNames.length !== sites.length
    ) {
        throw new Error("invalid catch metadata");
    }
    for (let i = 0; i < sites.length; i++) {
        if (scope.lexicalNames[i] !== sites[i].name) {
            throw new Error("invalid catch binding name");
        }
    }
    scopes.set(node, scope.id);
}

function validateOrdinaryScope(
    scopes: ScopeIndex,
    scope: DeclarationScope,
    entry: ScopeEntry,
): void {
    if (
        entry.node === null ||
        (entry.node.kind !== "block" && entry.node.kind !== "function") ||
        entry.node.kind !== scope.kind ||
        entry.body !== entry.node.body ||
        scopes.has(entry.node)
    ) {
        throw new Error("invalid Script scope identity");
    }
    if (entry.node.kind === "block" && entry.node.synthetic === "conditional-function") {
        const declaration = entry.node.body[0];
        if (
            scope.strict ||
            entry.node.body.length !== 1 ||
            declaration.kind !== "function" ||
            declaration.source === null ||
            declaration.source.async === true ||
            declaration.source.generator === true ||
            scope.start !== declaration.source.start ||
            scope.end !== declaration.source.end ||
            scope.parent === null ||
            scope.lexicalDeclarations.length !== 1 ||
            scope.varDeclarations.length !== 0 ||
            declaration.loc.line !== entry.node.loc.line ||
            declaration.loc.column !== entry.node.loc.column
        ) {
            throw new Error("invalid conditional function block association");
        }
    }
    scopes.set(entry.node, scope.id);
}

function validateCatchChildren(
    plan: ScriptDeclarationPlan,
    nodes: DeclarationNodes,
    scopes: ScopeIndex,
): void {
    for (const scope of plan.scopes) {
        if (scope.kind !== "catch") {
            continue;
        }
        const entry = nodes.scopes.get(scope.id);
        if (entry === undefined || entry.node === null || entry.node.kind !== "try-catch") {
            throw new Error("missing catch association");
        }
        const node = entry.node;
        const tryId = scopes.get(node.block),
            handlerId = scopes.get(node.handler);
        if (
            tryId === undefined ||
            handlerId === undefined ||
            tryId >= scope.id ||
            handlerId !== scope.id + 1 ||
            node.block === node.handler ||
            node.block.body === node.handler.body
        ) {
            throw new Error("invalid catch children");
        }
        const protectedScope = plan.scopes[tryId],
            handlerScope = plan.scopes[handlerId];
        if (
            protectedScope.kind !== "block" ||
            handlerScope.kind !== "block" ||
            protectedScope.parent !== scope.parent ||
            handlerScope.parent !== scope.id ||
            protectedScope.end > scope.start ||
            handlerScope.start < scope.start ||
            handlerScope.end !== scope.end ||
            handlerScope.strict !== scope.strict ||
            protectedScope.strict !== scope.strict
        ) {
            throw new Error("invalid catch child scope");
        }
    }
}
