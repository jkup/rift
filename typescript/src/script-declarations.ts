import { parseDeclarationPlan } from "./parser.js";
import { scriptPrologue } from "./script-prologue.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Diagnostic, Location, Expr, Stmt, SourceText, FunctionSource } from "./syntax.js";
import type { Token } from "./lexer.js";
import type { Rejection } from "./outcomes.js";

export type DeclarationSite = {
  readonly name: string;
  readonly start: number; readonly end: number; // identifier, UTF16 half-open
  readonly loc: Readonly<Location>;
};
export type Declaration = {
  readonly id: number; // unit-local preorder, starting at 0
  readonly kind: "let" | "var" | "function";
  readonly site: DeclarationSite;
  readonly scope: number; // immediate syntactic scope
  readonly variableScope: number; // closest Script/function
  readonly functionScope: number | null; // declaration functions only
  readonly initializer: { readonly start: number; readonly end: number } | null;
};
export type DeclarationScope = {
  readonly id: number; readonly kind: "script" | "function" | "block";
  readonly parent: number | null;
  readonly start: number; readonly end: number;
  readonly strict: boolean;
  readonly formals: readonly DeclarationSite[]; // function only
  readonly lexicalDeclarations: readonly number[];
  readonly varDeclarations: readonly number[];
  readonly lexicalNames: readonly string[];
  readonly varNames: readonly string[]; // occurrence list, NOT deduplicated
};
export type PlannedFunction = {
  readonly scope: number; readonly declaration: number | null;
  readonly start: number; readonly end: number; // full function source
  readonly strictness: StrictnessMetadata;
};
export type DeclarationConflict = {
  readonly kind: "duplicate-lexical" | "lexical-var" | "formal-lexical";
  readonly scope: number;
  readonly first: DeclarationSite; readonly second: DeclarationSite;
};
export type ScriptDeclarationPlan = {
  readonly kind: "complete"; readonly goal: "Script";
  readonly unit: ScriptSourceUnit; readonly consumedUnits: number;
  readonly strictness: StrictnessMetadata;
  readonly scopes: readonly DeclarationScope[];
  readonly declarations: readonly Declaration[];
  readonly functions: readonly PlannedFunction[];
};
export type DeclarationPlanResult = ScriptDeclarationPlan
  | { readonly kind: "conflict"; readonly goal: "Script";
      readonly unit: ScriptSourceUnit; readonly consumedUnits: number;
      readonly conflict: DeclarationConflict; readonly diagnostic: Diagnostic }
  | { readonly kind: "blocked"; readonly goal: "Script";
      readonly unit: ScriptSourceUnit; readonly rejection: Rejection;
      readonly diagnostic: Diagnostic };
export function planScriptDeclarations(unit: ScriptSourceUnit): DeclarationPlanResult {
    return parseDeclarationPlan(unit);
}

// Internal parser/collector bridge. Ordinary plan callers receive no nodes.
export type DeclarationNodes = {
    source: SourceText;
    body: Stmt[];
    scopes: Map<number, { node: Stmt | Expr | null; body: Stmt[] }>;
    declarations: Map<number, { node: Stmt; initializer: Expr | null }>;
};
export type ParsedBinding = {
    site: DeclarationSite; init: Expr | null;
    initializer: { start: number; end: number } | null;
};
type MutableScope = {
    id: number; kind: "script" | "function" | "block"; parent: number | null;
    start: number; end: number; strict: boolean; formals: DeclarationSite[];
    lexicalDeclarations: number[]; varDeclarations: number[];
    lexicalNames: string[]; varNames: string[];
};
type Work =
    | { kind: "block-end"; scope: number }
    | { kind: "statement"; node: Stmt; scope: number; variableScope: number }
    | { kind: "expression"; node: Expr; scope: number; variableScope: number }
    | { kind: "binding"; binding: ParsedBinding; node: Stmt; declarationKind: "let" | "var"; scope: number; variableScope: number };

export function collectDeclarationPlan(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes | null = null): DeclarationPlanResult {
    return new DeclarationCollector(unit, tokens, bindings, nodes).collect(body);
}

class DeclarationCollector {
    readonly scopes: MutableScope[] = [];
    readonly declarations: Declaration[] = [];
    readonly functions: PlannedFunction[] = [];
    readonly work: Work[] = [];
    readonly tokenLocations = new Map<string, number>();
    readonly closingBraces = new Map<number, number>();
    readonly strictness: StrictnessMetadata;
    unsupportedBlock: Location | null = null;

    constructor(readonly unit: ScriptSourceUnit, readonly tokens: Token[], readonly bindings: Map<number, ParsedBinding[]>, readonly nodes: DeclarationNodes | null) {
        const braces: number[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            this.tokenLocations.set(token.loc.line + ":" + token.loc.column, i);
            if (token.kind !== "punct") continue;
            if (token.text === "{") braces.push(i);
            if (token.text === "}") {
                const open = braces.pop();
                if (open === undefined) throw new Error("missing opening brace");
                this.closingBraces.set(open, token.end);
            }
        }
        this.strictness = scriptPrologue(unit.text, tokens, 0, false);
        this.scope("script", null, 0, unit.text.length, this.strictness.strict, []);
    }
    scope(kind: "script" | "function" | "block", parent: number | null, start: number, end: number, strict: boolean, formals: DeclarationSite[]): number {
        const id = this.scopes.length;
        this.scopes.push({ id, kind, parent, start, end, strict, formals,
            lexicalDeclarations: [], varDeclarations: [], lexicalNames: [], varNames: [] });
        return id;
    }
    tokenIndex(loc: Location): number {
        const index = this.tokenLocations.get(loc.line + ":" + loc.column);
        if (index === undefined) throw new Error("missing declaration token");
        return index;
    }
    site(token: Token): DeclarationSite {
        return { name: token.text, start: token.start, end: token.end,
            loc: { line: token.loc.line, column: token.loc.column } };
    }
    statement(node: Stmt, scope: number, variableScope: number): void {
        this.work.push({ kind: "statement", node, scope, variableScope });
    }
    statements(body: Stmt[], scope: number, variableScope: number): void {
        for (let i = body.length - 1; i >= 0; i--) this.statement(body[i], scope, variableScope);
    }
    expression(node: Expr, scope: number, variableScope: number): void {
        this.work.push({ kind: "expression", node, scope, variableScope });
    }
    declare(kind: "let" | "var" | "function", binding: ParsedBinding, scope: number, variableScope: number, functionScope: number | null): number {
        const id = this.declarations.length;
        const site = binding.site;
        this.declarations.push({ id, kind, site: { name: site.name, start: site.start, end: site.end,
            loc: { line: site.loc.line, column: site.loc.column } }, scope, variableScope, functionScope,
            initializer: binding.initializer === null ? null : { start: binding.initializer.start, end: binding.initializer.end } });
        if (kind === "let" || (kind === "function" && this.scopes[scope].kind === "block")) {
            this.scopes[scope].lexicalDeclarations.push(id);
            this.scopes[scope].lexicalNames.push(site.name);
        } else {
            this.scopes[scope].varDeclarations.push(id);
            this.scopes[scope].varNames.push(site.name);
        }
        return id;
    }
    functionBody(source: FunctionSource | null, loc: Location, body: Stmt[], scope: number, declaration: number | null, node: Stmt | Expr): void {
        if (source === null) throw new Error("parsed function missing source");
        let index = this.tokenIndex(loc) + 1;
        if (this.tokens[index].text !== "(") index++;
        index++;
        const formals: DeclarationSite[] = [];
        while (this.tokens[index].text !== ")") {
            if (this.tokens[index].text !== ",") formals.push(this.site(this.tokens[index]));
            index++;
        }
        const brace = index + 1;
        const strictness = scriptPrologue(this.unit.text, this.tokens, brace + 1, this.scopes[scope].strict);
        const id = this.scope("function", scope, this.tokens[brace].start, source.end, strictness.strict, formals);
        if (this.nodes !== null) this.nodes.scopes.set(id, { node, body });
        this.functions.push({ scope: id, declaration, start: source.start, end: source.end, strictness });
        this.statements(body, id, id);
    }
    visitStatement(node: Stmt, scope: number, variableScope: number): void {
        switch (node.kind) {
            case "let": case "var": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing binding spans");
                for (let i = bindings.length - 1; i >= 0; i--) this.work.push({ kind: "binding", binding: bindings[i], node, declarationKind: node.kind, scope, variableScope });
                break;
            }
            case "function": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing function name span");
                if (this.scopes[scope].kind === "block" && !this.scopes[scope].strict && this.unsupportedBlock === null) this.unsupportedBlock = node.loc;
                const declaration = this.declare("function", bindings[0], scope, variableScope, this.scopes.length);
                if (this.nodes !== null) this.nodes.declarations.set(declaration, { node, initializer: null });
                this.functionBody(node.source, node.loc, node.body, scope, declaration, node);
                break;
            }
            case "block": {
                const index = this.tokenIndex(node.loc);
                const end = this.closingBraces.get(index);
                if (end === undefined) throw new Error("missing closing brace");
                const id = this.scope("block", scope, this.tokens[index].start, end, this.scopes[scope].strict, []);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.body });
                this.work.push({ kind: "block-end", scope: id });
                this.statements(node.body, id, variableScope);
                break;
            }
            case "expression": this.expression(node.expression, scope, variableScope); break;
            case "return": case "throw": if (node.value !== null) this.expression(node.value, scope, variableScope); break;
            case "if":
                if (node.alternate !== null) this.statement(node.alternate, scope, variableScope);
                this.statement(node.consequent, scope, variableScope);
                this.expression(node.test, scope, variableScope); break;
            case "while": this.statement(node.body, scope, variableScope); this.expression(node.test, scope, variableScope); break;
            case "empty": case "break": case "continue": break;
        }
    }
    visitExpression(node: Expr, scope: number, variableScope: number): void {
        switch (node.kind) {
            case "function": this.functionBody(node.source, node.loc, node.body, scope, null, node); break;
            case "array":
                for (let i = node.elements.length - 1; i >= 0; i--) {
                    const item = node.elements[i];
                    if (item !== null) this.expression(item, scope, variableScope);
                }
                break;
            case "object": for (let i = node.values.length - 1; i >= 0; i--) this.expression(node.values[i], scope, variableScope); break;
            case "unary": this.expression(node.operand, scope, variableScope); break;
            case "binary": this.expression(node.right, scope, variableScope); this.expression(node.left, scope, variableScope); break;
            case "assign": case "compound": this.expression(node.value, scope, variableScope); this.expression(node.target, scope, variableScope); break;
            case "conditional": this.expression(node.alternate, scope, variableScope); this.expression(node.consequent, scope, variableScope); this.expression(node.test, scope, variableScope); break;
            case "member": this.expression(node.key, scope, variableScope); this.expression(node.base, scope, variableScope); break;
            case "call":
                for (let i = node.args.length - 1; i >= 0; i--) this.expression(node.args[i], scope, variableScope);
                this.expression(node.callee, scope, variableScope); break;
            case "literal": case "identifier": case "this": break;
        }
    }
    collect(body: Stmt[]): DeclarationPlanResult {
        if (this.nodes !== null) {
            this.nodes.body = body;
            this.nodes.scopes.set(0, { node: null, body });
        }
        this.statements(body, 0, 0);
        while (this.work.length > 0) {
            const item = this.work.pop();
            if (item === undefined) throw new Error("missing declaration work");
            if (item.kind === "block-end") {
                // Postorder block summaries append at the block's source position.
                // Function scopes never schedule this work, so their vars cannot
                // escape. Repeated propagation is bounded by parser depth128.
                const scope = this.scopes[item.scope];
                if (scope.parent === null) throw new Error("block missing parent");
                const parent = this.scopes[scope.parent];
                for (const id of scope.varDeclarations) {
                    parent.varDeclarations.push(id);
                    parent.varNames.push(this.declarations[id].site.name);
                }
            }
            else if (item.kind === "statement") this.visitStatement(item.node, item.scope, item.variableScope);
            else if (item.kind === "expression") this.visitExpression(item.node, item.scope, item.variableScope);
            else {
                const id = this.declare(item.declarationKind, item.binding, item.scope, item.variableScope, null);
                if (this.nodes !== null) this.nodes.declarations.set(id, { node: item.node, initializer: item.binding.init });
                if (item.binding.init !== null) this.expression(item.binding.init, item.scope, item.variableScope);
            }
        }
        // No conflicts are reported until all grammar/resource checks and every
        // function-context restriction have passed for the complete source.
        if (this.unsupportedBlock !== null) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: "non-strict block function planning is unsupported", loc: this.unsupportedBlock } };
        for (const scope of this.scopes) {
            const conflict = declarationConflict(scope, this.declarations);
            if (conflict !== null) {
                const later = conflict.first.start > conflict.second.start ? conflict.first : conflict.second;
                return { kind: "conflict", goal: "Script", unit: this.unit, consumedUnits: this.unit.text.length, conflict,
                    diagnostic: { phase: "parse", name: "SyntaxError", message: conflict.kind + ": " + conflict.second.name,
                        loc: { line: later.loc.line, column: later.loc.column } } };
            }
        }
        return { kind: "complete", goal: "Script", unit: this.unit, consumedUnits: this.unit.text.length,
            strictness: this.strictness, scopes: this.scopes, declarations: this.declarations, functions: this.functions };
    }
}

function declarationConflict(scope: DeclarationScope, declarations: readonly Declaration[]): DeclarationConflict | null {
    const lexicals = new Map<string, DeclarationSite>();
    for (const id of scope.lexicalDeclarations) {
        const site = declarations[id].site;
        const first = lexicals.get(site.name);
        if (first !== undefined) return { kind: "duplicate-lexical", scope: scope.id, first, second: site };
        lexicals.set(site.name, site);
    }
    const vars = new Map<string, DeclarationSite>();
    for (const id of scope.varDeclarations) {
        const site = declarations[id].site;
        if (!vars.has(site.name)) vars.set(site.name, site);
    }
    for (const id of scope.lexicalDeclarations) {
        const first = declarations[id].site;
        const second = vars.get(first.name);
        if (second !== undefined) return { kind: "lexical-var", scope: scope.id, first, second };
    }
    for (const first of scope.formals) {
        const second = lexicals.get(first.name);
        if (second !== undefined) return { kind: "formal-lexical", scope: scope.id, first, second };
    }
    return null;
}

// Pure selection only. Global admission must still perform its own reverse scan
// with observable checks; these IDs are not a precheck or execution capability.
export function selectFunctionDeclarations(scope: DeclarationScope, declarations: readonly Declaration[]): readonly number[] {
    const selected = new Map<string, boolean>();
    const winners: number[] = [];
    for (let i = scope.varDeclarations.length - 1; i >= 0; i--) {
        const declaration = declarations[scope.varDeclarations[i]];
        if (declaration.kind === "function" && !selected.has(declaration.site.name)) {
            selected.set(declaration.site.name, true);
            winners.push(declaration.id);
        }
    }
    return winners.reverse();
}
