import { isStrictReservedIdentifier } from "./identifier-names.js";
import { hasParameterExpressions } from "./formal-parameters.js";
import type { DestructuringPattern, ClassInitializer } from "./syntax.js";
import { parseDeclarationPlan } from "./parser.js";
import { scriptPrologue } from "./script-prologue.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Diagnostic, Location, Expr, Stmt, SourceText, FunctionSource, DeclarationSite, TryCatchStmt, SwitchStmt } from "./syntax.js";
import type { Token } from "./lexer.js";
import type { Rejection } from "./outcomes.js";

export type { DeclarationSite } from "./syntax.js";
export type Declaration = {
  readonly id: number; // unit-local preorder, starting at 0
  readonly kind: "let" | "const" | "var" | "function" | "class";
  readonly site: DeclarationSite;
  readonly scope: number; // immediate syntactic scope
  readonly variableScope: number; // closest Script/function
  readonly functionScope: number | null; // declaration functions only
  readonly initializer: { readonly start: number; readonly end: number } | null;
};
export type DeclarationScope = {
  readonly id: number; readonly kind: "script" | "function" | "block" | "catch" | "switch" | "for-of" | "for-in" | "for-lexical" | "class" | "field-initializer" | "static-block";
  readonly catchParameter: DeclarationSite | null;
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
  readonly legacyBlockFunctions?: readonly number[];
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
    argumentsScopes?: Set<number>;
    freeArguments?: Location[];
    assignmentNameEligible: Map<Expr, boolean>;
    source: SourceText;
    body: Stmt[];
    scopes: Map<number, { node: Stmt | Expr | ClassInitializer | null; body: Stmt[] }>;
    declarations: Map<number, { node: Stmt; initializer: Expr | null }>;
};
export type ParsedBinding = {
    site: DeclarationSite; init: Expr | null;
    initializer: { start: number; end: number } | null;
};
type MutableScope = {
    id: number; kind: "script" | "function" | "block" | "catch" | "switch" | "for-of" | "for-in" | "for-lexical" | "class" | "field-initializer" | "static-block"; parent: number | null;
    catchParameter: DeclarationSite | null;
    start: number; end: number; strict: boolean; formals: DeclarationSite[];
    lexicalDeclarations: number[]; varDeclarations: number[];
    lexicalNames: string[]; varNames: string[];
};
type Work =
    | { kind: "class-initializer"; node: ClassInitializer; scope: number }
    | { kind: "switch"; node: SwitchStmt; scope: number; variableScope: number }
    | { kind: "catch"; node: TryCatchStmt; scope: number; variableScope: number }
    | { kind: "block-end"; scope: number }
    | { kind: "statement"; node: Stmt; scope: number; variableScope: number }
    | { kind: "expression"; node: Expr; scope: number; variableScope: number }
    | { kind: "binding"; binding: ParsedBinding; node: Stmt; declarationKind: "let" | "const" | "var"; scope: number; variableScope: number };

export function collectDeclarationPlan(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes | null = null, bounded = false, inheritedStrict = false): DeclarationPlanResult {
    const analysis = new DeclarationCollector(unit, tokens, bindings, nodes, bounded, inheritedStrict);
    analysis.collect(body);
    return analysis.project();
}

// One traversal supplies both the unchanged ordinary result and global veto audit.
export function collectBoundedScriptPreparation(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes, inheritedStrict = false): DeclarationPlanResult {
    const analysis = new DeclarationCollector(unit, tokens, bindings, nodes, true, inheritedStrict);
    analysis.collect(body);
    const ordinary = analysis.project(false, true);
    const audit = analysis.audit();
    if (audit.kind !== "eligible") return ordinary;
    if (audit.candidates.length === 0 || ordinary.kind !== "conflict" || audit.sourceUnits !== unit.text.length || audit.consumedUnits !== unit.text.length)
        throw new Error("invalid block rule certification");
    const candidate = audit.candidates[0];
    return { kind: "blocked", goal: "Script", unit,
        rejection: { kind: "syntax-error", ruleCode: "duplicate-block-lexical-function" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate block lexical function: " + candidate.second.name,
            loc: { line: candidate.second.loc.line, column: candidate.second.loc.column } } };
}

export type BlockFunctionCandidate = {
    readonly ruleCode: "duplicate-block-lexical-function";
    readonly scopeStart: number; readonly scopeEnd: number;
    readonly first: DeclarationSite; readonly second: DeclarationSite;
};
export type BlockFunctionAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly BlockFunctionCandidate[] }
    | { readonly kind: "none"; readonly sourceUnits: number; readonly consumedUnits: number }
    | { readonly kind: "blocked"; readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };

// Internal source-parser bridge, never consumed by preparation or execution.
export function collectBlockFunctionAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>): BlockFunctionAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, false);
    analysis.collect(body);
    return analysis.audit();
}

export type LexicalStatementContext = "if-consequent" | "if-alternate" | "while-body" | "do-while-body" | "for-body";
export type LexicalStatementCandidate = {
    readonly ruleCode: "lexical-declaration-statement";
    readonly context: LexicalStatementContext;
    readonly keyword: { readonly text: "let"; readonly start: number; readonly end: number; readonly loc: Location };
};
export type LexicalStatementAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly LexicalStatementCandidate[] }
    | { readonly kind: "none"; readonly sourceUnits: number; readonly consumedUnits: number }
    | { readonly kind: "blocked"; readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };

// Same-parse evidence only. The disposable continuation never supplies executable nodes.
export function collectLexicalStatementAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, candidates: readonly LexicalStatementCandidate[], inheritedStrict = false): LexicalStatementAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, inheritedStrict);
    analysis.collect(body);
    const veto = analysis.audit();
    if (veto.kind === "blocked") return veto;
    if (veto.kind === "eligible") {
        const second = veto.candidates[0].second;
        return { kind: "blocked", reason: "other-conflict", rejection: null,
            diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate-lexical: " + second.name,
                loc: { line: second.loc.line, column: second.loc.column } } };
    }
    const result: LexicalStatementCandidate[] = [];
    const byStart = new Map<number, Token>();
    for (const token of tokens) byStart.set(token.start, token);
    for (const candidate of candidates) {
        const keyword = candidate.keyword, token = byStart.get(keyword.start);
        const binding = bindings.get(keyword.start);
        if (token === undefined || token.kind !== "word" || token.text !== "let" || keyword.text !== "let" ||
            token.end !== keyword.end || token.loc.line !== keyword.loc.line || token.loc.column !== keyword.loc.column ||
            unit.text.slice(keyword.start, keyword.end) !== "let" || binding === undefined || binding.length !== 1)
            throw new Error("invalid lexical Statement token evidence");
        result.push({ ruleCode: "lexical-declaration-statement", context: candidate.context,
            keyword: { text: "let", start: keyword.start, end: keyword.end,
                loc: { line: keyword.loc.line, column: keyword.loc.column } } });
    }
    result.sort((a, b) => a.keyword.start - b.keyword.start);
    if (result.length === 0) return { kind: "none", sourceUnits: unit.text.length, consumedUnits: unit.text.length };
    return { kind: "eligible", sourceUnits: unit.text.length, consumedUnits: unit.text.length, candidates: result };
}

export type NumericAssignmentSite = {
    readonly text: string; readonly start: number; readonly end: number;
    readonly loc: Location;
};
export type NumericSeparatorAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly NumericAssignmentSite[] }
    | { readonly kind: "none"; readonly sourceUnits: number; readonly consumedUnits: number }
    | { readonly kind: "blocked"; readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };

export function collectNumericSeparatorAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, inheritedStrict: boolean): NumericSeparatorAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, inheritedStrict);
    analysis.collect(body);
    const veto = analysis.audit();
    if (veto.kind === "blocked") return veto;
    if (veto.kind === "eligible") {
        const second = veto.candidates[0].second;
        return { kind: "blocked", reason: "other-conflict", rejection: null,
            diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate-lexical: " + second.name, loc: second.loc } };
    }
    const candidates: NumericAssignmentSite[] = [];
    for (const token of tokens) {
        if (token.kind !== "invalid-number") continue;
        if (unit.text.slice(token.start, token.end) !== token.text || !token.text.includes("_"))
            throw new Error("invalid numeric separator token evidence");
        candidates.push({ text: token.text, start: token.start, end: token.end,
            loc: { line: token.loc.line, column: token.loc.column } });
    }
    return candidates.length === 0 ? { kind: "none", sourceUnits: unit.text.length, consumedUnits: unit.text.length }
        : { kind: "eligible", sourceUnits: unit.text.length, consumedUnits: unit.text.length, candidates };
}
export type NumericAssignmentCandidate = {
    readonly ruleCode: "assignment-target";
    readonly target: NumericAssignmentSite;
    readonly operator: {
        readonly text: "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "&=" | "|=" | "^=" | "<<=" | ">>=" | ">>>=" | "&&=" | "||=" | "??=" | "++" | "--";
        readonly start: number; readonly end: number; readonly loc: Location;
    };
};
export type NumericAssignmentAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly NumericAssignmentCandidate[] }
    | { readonly kind: "none"; readonly sourceUnits: number; readonly consumedUnits: number }
    | { readonly kind: "blocked"; readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };

// Internal full-parser handoff, never an execution or preparation authority.
export function collectNumericAssignmentAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, candidates: readonly NumericAssignmentCandidate[], inheritedStrict = false): NumericAssignmentAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, inheritedStrict);
    analysis.collect(body);
    const veto = analysis.audit();
    if (veto.kind === "blocked") return veto;
    if (veto.kind === "eligible") {
        const second = veto.candidates[0].second;
        return { kind: "blocked", reason: "other-conflict", rejection: null,
            diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate-lexical: " + second.name,
                loc: { line: second.loc.line, column: second.loc.column } } };
    }
    const result: NumericAssignmentCandidate[] = [];
    const byStart = new Map<number, Token>();
    for (const token of tokens) byStart.set(token.start, token);
    for (const candidate of candidates) {
        const target = candidate.target, operator = candidate.operator;
        const targetToken = byStart.get(target.start), operatorToken = byStart.get(operator.start);
        if (targetToken === undefined || (targetToken.kind !== "number" && targetToken.kind !== "bigint") || operatorToken === undefined || operatorToken.kind !== "punct" ||
            (targetToken.text !== target.text && !(targetToken.legacyNumeric === true && targetToken.text === "0o" + target.text)) ||
            targetToken.end !== target.end || operatorToken.text !== operator.text || operatorToken.end !== operator.end ||
            targetToken.loc.line !== target.loc.line || targetToken.loc.column !== target.loc.column ||
            operatorToken.loc.line !== operator.loc.line || operatorToken.loc.column !== operator.loc.column ||
            unit.text.slice(target.start, target.end) !== target.text || unit.text.slice(operator.start, operator.end) !== operator.text)
            throw new Error("invalid numeric assignment token evidence");
        result.push({ ruleCode: "assignment-target",
            target: { text: target.text, start: target.start, end: target.end, loc: { line: target.loc.line, column: target.loc.column } },
            operator: { text: operator.text, start: operator.start, end: operator.end, loc: { line: operator.loc.line, column: operator.loc.column } } });
    }
    result.sort((a, b) => a.operator.start - b.operator.start || a.target.start - b.target.start);
    if (result.length === 0) return { kind: "none", sourceUnits: unit.text.length, consumedUnits: unit.text.length };
    return { kind: "eligible", sourceUnits: unit.text.length, consumedUnits: unit.text.length, candidates: result };
}

export type StrictParameterCandidate = {
    readonly ruleCode: "duplicate-strict-parameter";
    readonly functionStart: number; readonly functionEnd: number;
    readonly first: DeclarationSite; readonly second: DeclarationSite;
};
export type StrictParameterAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly StrictParameterCandidate[] }
    | { readonly kind: "none"; readonly sourceUnits: number; readonly consumedUnits: number }
    | { readonly kind: "blocked"; readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };

// Internal source-only audit bridge; never returns retained execution nodes.
export function collectStrictParameterAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>): StrictParameterAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, false);
    analysis.collect(body);
    return analysis.auditStrictParameters();
}

// Rejection-only bridge: no retained nodes, complete arm, or executable authority.
export type CertifiedParameterPreparationRejection = {
    readonly kind: "blocked"; readonly goal: "Script"; readonly unit: ScriptSourceUnit;
    readonly rejection: { readonly kind: "syntax-error";
        readonly ruleCode: "duplicate-block-lexical-function" | "duplicate-strict-parameter" };
    readonly diagnostic: Diagnostic;
};
export function collectBoundedScriptParameterRejection(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, inheritedStrict = false): CertifiedParameterPreparationRejection | null {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true, inheritedStrict);
    analysis.collect(body);
    return analysis.certifyParameterPreparation();
}

function copySite(site: DeclarationSite): DeclarationSite {
    return { name: site.name, start: site.start, end: site.end,
        loc: { line: site.loc.line, column: site.loc.column } };
}

class DeclarationCollector {
    private strictLegacyLiteral: { kind: "number" | "escape"; loc: Location } | null = null;
    readonly strictIdentifiers: { name: string; scope: number; loc: Location }[] = [];
    private strictIdentifier(name: string, scope: number, loc: Location): void {
        if (isStrictReservedIdentifier(name) || name === "yield" || name === "let") this.strictIdentifiers.push({ name, scope, loc });
    }
    private firstStrictIdentifier(): { name: string; loc: Location } | null {
        let first: { name: string; loc: Location } | null = null;
        for (const site of this.strictIdentifiers) {
            if (!this.scopes[site.scope].strict) continue;
            if (first === null || site.loc.line < first.loc.line ||
                (site.loc.line === first.loc.line && site.loc.column < first.loc.column)) first = site;
        }
        return first;
    }
    readonly arrowScopes = new Set<number>();
    readonly nonLegacyFunctionScopes = new Set<number>();
    readonly restrictedAssignments: { name: string; scope: number; loc: Location }[] = [];
    readonly initializerArguments: Location[] = [];
    readonly strictConditionalFunctions: Location[] = [];
    readonly scopes: MutableScope[] = [];
    readonly declarations: Declaration[] = [];
    readonly functions: PlannedFunction[] = [];
    readonly work: Work[] = [];
    readonly tokenLocations = new Map<string, number>();
    readonly closingBraces = new Map<number, number>();
    readonly strictness: StrictnessMetadata;
    readonly identifierDeletes: { scope: number; loc: Location }[] = [];

    constructor(readonly unit: ScriptSourceUnit, readonly tokens: Token[], readonly bindings: Map<number, ParsedBinding[]>, readonly nodes: DeclarationNodes | null, readonly bounded: boolean, inheritedStrict: boolean) {
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
        this.strictness = scriptPrologue(unit.text, tokens, 0, inheritedStrict);
        this.scope("script", null, 0, unit.text.length, this.strictness.strict, []);
    }
    scope(kind: MutableScope["kind"], parent: number | null, start: number, end: number, strict: boolean, formals: DeclarationSite[]): number {
        const id = this.scopes.length;
        this.scopes.push({ id, kind, parent, start, end, strict, formals, catchParameter: null,
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
    declare(kind: "let" | "const" | "var" | "function" | "class", binding: ParsedBinding, scope: number, variableScope: number, functionScope: number | null): number {
        const id = this.declarations.length;
        const site = binding.site;
        this.strictIdentifier(site.name, scope, site.loc);
        if (functionScope !== null) this.strictIdentifier(site.name, functionScope, site.loc);
        this.declarations.push({ id, kind, site: { name: site.name, start: site.start, end: site.end,
            loc: { line: site.loc.line, column: site.loc.column } }, scope, variableScope, functionScope,
            initializer: binding.initializer === null ? null : { start: binding.initializer.start, end: binding.initializer.end } });
        if (kind === "let" || kind === "const" || kind === "class" || (kind === "function" && (this.scopes[scope].kind === "block" || this.scopes[scope].kind === "switch"))) {
            this.scopes[scope].lexicalDeclarations.push(id);
            this.scopes[scope].lexicalNames.push(site.name);
        } else {
            this.scopes[scope].varDeclarations.push(id);
            this.scopes[scope].varNames.push(site.name);
        }
        return id;
    }
    functionBody(source: FunctionSource | null, loc: Location, body: Stmt[], scope: number, declaration: number | null, node: Stmt | Expr): void {
        if (source === null || source.bodyLoc === undefined || node.kind !== "function" || node.parameters === undefined)
            throw new Error("parsed function missing parameter/source metadata");
        const index = this.tokenIndex(source.bodyLoc);
        const formals: DeclarationSite[] = [];
        for (const parameter of node.parameters) {
            if (parameter.kind === "identifier") formals.push(parameter.site);
            else formals.push(...parameter.bindings);
        }
        const parameterExpressions = hasParameterExpressions(node.parameters);
        const inheritedStrict = this.scopes[scope].strict;
        const strictness: StrictnessMetadata = source.expressionBody === true
            ? { ownStrict: false, inheritedStrict, strict: inheritedStrict, directives: [] }
            : scriptPrologue(this.unit.text, this.tokens, index + 1, inheritedStrict);
        const id = this.scope("function", scope, parameterExpressions ? source.start : this.tokens[index].start, source.end, strictness.strict, formals);
        for (const formal of formals) this.strictIdentifier(formal.name, id, formal.loc);
        if (source.name !== undefined) this.strictIdentifier(source.name.name, id, source.name.loc);
        if (source.name !== undefined && (source.name.name === "eval" || source.name.name === "arguments"))
            this.restrictedAssignments.push({ name: source.name.name, scope: id, loc: source.name.loc });
        if (source.arrow === true) this.arrowScopes.add(id);
        if (source.generator === true || source.async === true) this.nonLegacyFunctionScopes.add(id);
        if (this.nodes !== null) this.nodes.scopes.set(id, { node, body });
        this.functions.push({ scope: id, declaration, start: source.start, end: source.end, strictness });
        this.statements(body, id, id);
        for (let i = node.parameters.length - 1; i >= 0; i--) {
            const parameter = node.parameters[i];
            if (parameter.kind === "pattern") this.pattern(parameter.pattern, id, id);
            const initializer = parameter.initializer;
            if (initializer !== null) this.expression(initializer, id, id);
        }
    }
    visitStatement(node: Stmt, scope: number, variableScope: number): void {
        switch (node.kind) {
            case "class-declaration": {
                const site = node.value.name;
                if (site === null) throw new Error("class declaration name missing");
                const id = this.declare("class", { site, init: node.value, initializer: { start: node.value.start, end: node.value.end } }, scope, variableScope, null);
                if (this.nodes !== null) this.nodes.declarations.set(id, { node, initializer: node.value });
                this.expression(node.value, scope, variableScope);
                break;
            }
            case "switch":
                this.work.push({ kind: "switch", node, scope, variableScope });
                this.expression(node.discriminant, scope, variableScope);
                break;
            case "try-finally":
                this.statement(node.finalizer, scope, variableScope);
                this.statement(node.body, scope, variableScope);
                break;
            case "try-catch":
                this.work.push({ kind: "catch", node, scope, variableScope });
                this.statement(node.block, scope, variableScope);
                break;
            case "declaration-list":
                this.statements(node.declarations, scope, variableScope);
                break;
            case "pattern-declaration": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing pattern binding spans");
                for (const binding of bindings) {
                    const id = this.declare(node.declarationKind, binding, scope, variableScope, null);
                    if (this.nodes !== null) this.nodes.declarations.set(id, { node, initializer: node.init });
                }
                this.expression(node.init, scope, variableScope);
                this.pattern(node.pattern, scope, variableScope);
                break;
            }
            case "let": case "const": case "var": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing binding spans");
                for (let i = bindings.length - 1; i >= 0; i--) this.work.push({ kind: "binding", binding: bindings[i], node, declarationKind: node.kind, scope, variableScope });
                break;
            }
            case "function": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing function name span");
                const declaration = this.declare("function", bindings[0], scope, variableScope, this.scopes.length);
                if (this.nodes !== null) this.nodes.declarations.set(declaration, { node, initializer: null });
                this.functionBody(node.source, node.loc, node.body, scope, declaration, node);
                break;
            }
            case "block": {
                const index = this.tokenIndex(node.loc);
                let start = this.tokens[index].start, end = this.closingBraces.get(index);
                if (node.synthetic === "conditional-function") {
                    const declaration = node.body[0];
                    if (node.body.length !== 1 || declaration.kind !== "function" || declaration.source === null ||
                        declaration.source.generator === true || declaration.source.async === true)
                        throw new Error("invalid conditional function block");
                    start = declaration.source.start;
                    end = declaration.source.end;
                    if (this.scopes[scope].strict) this.strictConditionalFunctions.push(node.loc);
                }
                if (end === undefined) throw new Error("missing closing brace");
                const id = this.scope("block", scope, start, end, this.scopes[scope].strict, []);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.body });
                this.work.push({ kind: "block-end", scope: id });
                this.statements(node.body, id, variableScope);
                break;
            }
            case "expression": this.expression(node.expression, scope, variableScope); break;
            case "return": case "throw": case "yield": if (node.value !== null) this.expression(node.value, scope, variableScope); break;
            case "if":
                if (node.alternate !== null) this.statement(node.alternate, scope, variableScope);
                this.statement(node.consequent, scope, variableScope);
                this.expression(node.test, scope, variableScope); break;
            case "for-of": case "for-in": {
                if (node.head.kind === "pattern") {
                    const lexical = node.head.declarationKind !== "var";
                    const id = lexical ? this.scope(node.kind, scope, node.start, node.end, this.scopes[scope].strict, []) : scope;
                    for (const site of node.head.sites) {
                        const declaration = this.declare(node.head.declarationKind, { site, init: null, initializer: null }, id, variableScope, null);
                        if (this.nodes !== null) this.nodes.declarations.set(declaration, { node, initializer: null });
                    }
                    if (lexical) {
                        if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: [node.body] });
                        this.work.push({ kind: "block-end", scope: id });
                    }
                    this.statement(node.body, id, variableScope);
                    this.expression(node.iterable, id, variableScope);
                    this.pattern(node.head.pattern, id, variableScope);
                    break;
                }
                if (node.head.kind === "lexical") {
                    const id = this.scope(node.kind, scope, node.start, node.end, this.scopes[scope].strict, []);
                    const declaration = this.declare(node.head.declarationKind,
                        { site: node.head.site, init: null, initializer: null }, id, variableScope, null);
                    if (this.nodes !== null) {
                        this.nodes.scopes.set(id, { node, body: [node.body] });
                        this.nodes.declarations.set(declaration, { node, initializer: null });
                    }
                    this.work.push({ kind: "block-end", scope: id });
                    this.statement(node.body, id, variableScope);
                    this.expression(node.iterable, id, variableScope);
                    break;
                }
                this.statement(node.body, scope, variableScope);
                this.expression(node.iterable, scope, variableScope);
                if (node.head.kind === "var") this.statement(node.head, scope, variableScope);
                else if (node.head.kind === "assignment-pattern") this.pattern(node.head.pattern, scope, variableScope);
                else this.expression(node.head, scope, variableScope);
                break;
            }
            case "for-lexical": {
                const id = this.scope("for-lexical", scope, node.start, node.end, this.scopes[scope].strict, []);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: [node.body] });
                this.work.push({ kind: "block-end", scope: id });
                this.statement(node.body, id, variableScope);
                if (node.update !== null) this.expression(node.update, id, variableScope);
                if (node.test !== null) this.expression(node.test, id, variableScope);
                this.statement(node.initializer, id, variableScope);
                break;
            }
            case "for":
                this.statement(node.body, scope, variableScope);
                if (node.update !== null) this.expression(node.update, scope, variableScope);
                if (node.test !== null) this.expression(node.test, scope, variableScope);
                if (node.initializer !== null) {
                    if (node.initializer.kind === "var" || node.initializer.kind === "pattern-declaration" || node.initializer.kind === "declaration-list") this.statement(node.initializer, scope, variableScope);
                    else this.expression(node.initializer, scope, variableScope);
                }
                break;
            case "while": this.statement(node.body, scope, variableScope); this.expression(node.test, scope, variableScope); break;
            case "do-while": this.expression(node.test, scope, variableScope); this.statement(node.body, scope, variableScope); break;
            case "labelled":
                this.strictIdentifier(node.name, scope, node.loc);
                this.statement(node.body, scope, variableScope);
                break;
            case "break": case "continue":
                if (node.target !== undefined) this.strictIdentifier(node.target, scope, this.tokens[this.tokenIndex(node.loc) + 1].loc);
                break;
            case "empty": break;
        }
    }
    pattern(pattern: DestructuringPattern, scope: number, variableScope: number): void {
        if (pattern.kind === "binding") return;
        if (pattern.kind === "target") {
            const target = pattern.target;
            if (target.kind === "identifier" && (target.name === "arguments" || target.name === "eval"))
                this.restrictedAssignments.push({ name: target.name, scope, loc: target.loc });
            this.expression(target, scope, variableScope);
            return;
        }
        if (pattern.rest !== null) this.pattern(pattern.rest, scope, variableScope);
        if (pattern.kind === "object-pattern") {
            for (let i = pattern.properties.length - 1; i >= 0; i--) {
                const property = pattern.properties[i];
                if (property.element.initializer !== null) this.expression(property.element.initializer, scope, variableScope);
                this.pattern(property.element.pattern, scope, variableScope);
                this.expression(property.key, scope, variableScope);
            }
            return;
        }
        for (let i = pattern.elements.length - 1; i >= 0; i--) {
            const element = pattern.elements[i];
            if (element === null) continue;
            if (element.initializer !== null) this.expression(element.initializer, scope, variableScope);
            this.pattern(element.pattern, scope, variableScope);
        }
    }
    visitExpression(node: Expr, scope: number, variableScope: number): void {
        if ((node.kind === "assign" || node.kind === "compound" || node.kind === "update") &&
            node.target.kind === "identifier" && (node.target.name === "arguments" || node.target.name === "eval"))
            this.restrictedAssignments.push({ name: node.target.name, scope, loc: node.target.loc });
        switch (node.kind) {
            case "class": {
                const id = this.scope("class", scope, node.start, node.end, true, []);
                if (node.name !== null) {
                    this.scopes[id].lexicalNames.push(node.name.name);
                    this.strictIdentifier(node.name.name, id, node.name.loc);
                    if (node.name.name === "eval" || node.name.name === "arguments") this.restrictedAssignments.push({ name: node.name.name, loc: node.name.loc, scope: id });
                }
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: [] });
                for (let i = node.elements.length - 1; i >= 0; i--) {
                    const element = node.elements[i];
                    if (element.kind === "static-block") {
                        this.work.push({ kind: "class-initializer", node: element, scope: id });
                        continue;
                    }
                    if (element.kind !== "field") this.expression(element.value, id, variableScope);
                    else if (element.initializer !== null) {
                        this.work.push({ kind: "class-initializer", node: element.initializer, scope: id });
                    }
                    this.expression(element.key, id, variableScope);
                }
                if (node.heritage !== null) this.expression(node.heritage, id, variableScope);
                break;
            }
            case "await": case "yield": if (node.value !== null) this.expression(node.value, scope, variableScope); break;
            case "function": this.functionBody(node.source, node.loc, node.body, scope, null, node); break;
            case "destructure": this.expression(node.value, scope, variableScope); this.pattern(node.pattern, scope, variableScope); break;
            case "array":
                for (let i = node.elements.length - 1; i >= 0; i--) {
                    const item = node.elements[i];
                    if (item !== null) this.expression(item.kind === "spread" ? item.expression : item, scope, variableScope);
                }
                break;
            case "object":
                for (let i = node.properties.length - 1; i >= 0; i--) {
                    const property = node.properties[i];
                    this.expression(property.value, scope, variableScope);
                    if (property.kind !== "spread" && typeof property.key !== "string") this.expression(property.key, scope, variableScope);
                }
                break;
            case "template": for (let i = node.expressions.length - 1; i >= 0; i--) this.expression(node.expressions[i], scope, variableScope); break;
            case "update": this.expression(node.target, scope, variableScope); break;
            case "unary":
                if (node.op === "delete" && node.operand.kind === "identifier") this.identifierDeletes.push({ scope, loc: node.loc });
                this.expression(node.operand, scope, variableScope); break;
            case "private-in": this.expression(node.right, scope, variableScope); break;
            case "binary": this.expression(node.right, scope, variableScope); this.expression(node.left, scope, variableScope); break;
            case "assign": case "compound": this.expression(node.value, scope, variableScope); this.expression(node.target, scope, variableScope); break;
            case "conditional": this.expression(node.alternate, scope, variableScope); this.expression(node.consequent, scope, variableScope); this.expression(node.test, scope, variableScope); break;
            case "chain":
                for (let i = node.links.length - 1; i >= 0; i--) {
                    const link = node.links[i];
                    if (link.kind === "member") this.expression(link.key, scope, variableScope);
                    else for (let j = link.args.length - 1; j >= 0; j--) {
                        const arg = link.args[j];
                        this.expression(arg.kind === "spread" ? arg.expression : arg, scope, variableScope);
                    }
                }
                this.expression(node.base, scope, variableScope); break;
            case "super-member": this.expression(node.key, scope, variableScope); break;
            case "member": this.expression(node.key, scope, variableScope); this.expression(node.base, scope, variableScope); break;
            case "new": case "call": case "super-call":
                for (let i = node.args.length - 1; i >= 0; i--) {
                    const arg = node.args[i];
                    this.expression(arg.kind === "spread" ? arg.expression : arg, scope, variableScope);
                }
                if (node.kind !== "super-call") this.expression(node.callee, scope, variableScope); break;
            case "identifier": {
                this.strictIdentifier(node.name, scope, node.loc);
                if (node.name !== "arguments" && node.name !== "eval") break;
                let current: number | null = scope;
                while (current !== null) {
                    const parent: MutableScope = this.scopes[current];
                    if (parent.kind === "function" && !this.arrowScopes.has(current)) {
                        this.nodes?.argumentsScopes?.add(current);
                        break;
                    }
                    if (parent.kind === "field-initializer" || parent.kind === "static-block") {
                        if (node.name === "arguments") this.initializerArguments.push(node.loc);
                        break;
                    }
                    current = parent.parent;
                }
                if (current === null && node.name === "arguments") this.nodes?.freeArguments?.push(node.loc);
                break;
            }
            case "literal": {
                const token = this.tokens[this.tokenIndex(node.loc)];
                const first = this.strictLegacyLiteral;
                const legacyNumber = token.kind === "number" && token.legacyNumeric === true;
                const legacyEscape = token.kind === "string" && token.legacyEscape === true;
                if ((legacyNumber || legacyEscape) && this.scopes[scope].strict &&
                    (first === null || token.loc.line < first.loc.line || (token.loc.line === first.loc.line && token.loc.column < first.loc.column)))
                    this.strictLegacyLiteral = { kind: legacyNumber ? "number" : "escape", loc: token.loc };
                break;
            }
            case "template-object": case "regexp": case "bigint": case "this": case "new-target": break;
        }
    }
    collect(body: Stmt[]): void {
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
                let parent = this.scopes[scope.parent];
                // Catch owns only its parameter; handler vars hoist through it.
                if (parent.kind === "catch") {
                    if (parent.parent === null) throw new Error("catch missing parent");
                    parent = this.scopes[parent.parent];
                }
                for (const id of scope.varDeclarations) {
                    parent.varDeclarations.push(id);
                    parent.varNames.push(this.declarations[id].site.name);
                }
            }
            else if (item.kind === "switch") {
                const node = item.node;
                const id = this.scope("switch", item.scope, node.caseBlock.start, node.caseBlock.end, this.scopes[item.scope].strict, []);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.caseBlock.body });
                this.work.push({ kind: "block-end", scope: id });
                for (let i = node.caseBlock.clauses.length - 1; i >= 0; i--) {
                    const clause = node.caseBlock.clauses[i];
                    this.statements(clause.body, id, item.variableScope);
                    if (clause.test !== null) this.expression(clause.test, id, item.variableScope);
                }
            }
            else if (item.kind === "catch") {
                const node = item.node;
                const id = this.scope("catch", item.scope, node.catchStart, node.catchEnd, this.scopes[item.scope].strict, []);
                this.scopes[id].catchParameter = node.parameter;
                this.strictIdentifier(node.parameter.name, id, node.parameter.loc);
                this.scopes[id].lexicalNames.push(node.parameter.name);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.handler.body });
                this.statement(node.handler, id, item.variableScope);
            }
            else if (item.kind === "class-initializer") {
                const node = item.node, id = this.scope(node.kind, item.scope, node.start, node.end, true, []);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.kind === "static-block" ? node.body : [] });
                if (node.kind === "static-block") this.statements(node.body, id, id);
                else this.expression(node.value, id, id);
            }
            else if (item.kind === "statement") this.visitStatement(item.node, item.scope, item.variableScope);
            else if (item.kind === "expression") this.visitExpression(item.node, item.scope, item.variableScope);
            else {
                const id = this.declare(item.declarationKind, item.binding, item.scope, item.variableScope, null);
                if (this.nodes !== null) this.nodes.declarations.set(id, { node: item.node, initializer: item.binding.init });
                if (item.binding.init !== null) this.expression(item.binding.init, item.scope, item.variableScope);
            }
        }
    }
    project(ignoreStrictParameters = false, certifyStrictSyntax = false): DeclarationPlanResult {
        if (this.strictConditionalFunctions.length !== 0) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: "conditional function declarations are forbidden in strict code", loc: this.strictConditionalFunctions[0] } };
        if (this.initializerArguments.length !== 0) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: "arguments is forbidden in a class initializer", loc: this.initializerArguments[0] } };
        const restricted = this.restrictedBinding();
        if (restricted !== null) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: restricted.name + " binding or assignment in strict code", loc: restricted.loc } };
        const identifier = this.firstStrictIdentifier();
        if (identifier !== null) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: certifyStrictSyntax
                ? { kind: "syntax-error", ruleCode: "strict-reserved-identifier" }
                : { kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: identifier.name + " is reserved in strict code", loc: identifier.loc } };
        const legacy = this.strictLegacyLiteral;
        if (legacy !== null) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: certifyStrictSyntax
                ? { kind: "syntax-error", ruleCode: legacy.kind === "number" ? "strict-legacy-number" : "strict-legacy-escape" }
                : { kind: "unsupported-syntax", capabilityCode: legacy.kind === "number" ? "parse.strict-legacy-number" : "parse.strict-legacy-escape" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: legacy.kind === "number" ? "legacy numeric literal in strict code" : "legacy string escape in strict code", loc: legacy.loc } };
        // Preserve the ordinary first-failure projection, including interleaved
        // catch/conflict checks. The audit below has a separate global veto.
        // No conflicts are reported until all grammar/resource checks and every
        // function-context restriction have passed for the complete source.
        for (const site of this.identifierDeletes) {
            if (this.scopes[site.scope].strict) return { kind: "blocked", goal: "Script", unit: this.unit,
                rejection: { kind: "unsupported-syntax", capabilityCode: "parse.delete-identifier" },
                diagnostic: { phase: "parse", name: "SyntaxError", message: "delete of an identifier is not allowed", loc: site.loc } };
        }
        if (!ignoreStrictParameters) {
            const candidates = this.strictParameterCandidates();
            const duplicate = candidates[0];
            if (duplicate !== undefined) return { kind: "blocked", goal: "Script", unit: this.unit,
                rejection: { kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" },
                diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate parameter: " + duplicate.second.name,
                    loc: duplicate.second.loc } };
        }
        for (const scope of this.scopes) {
            if (!scope.strict) {
                const nonLegacyNames = new Set<string>();
                for (const id of scope.lexicalDeclarations) {
                    const declaration = this.declarations[id];
                    if (declaration.functionScope !== null && this.nonLegacyFunctionScopes.has(declaration.functionScope))
                        nonLegacyNames.add(declaration.site.name);
                }
                const functions = new Set<string>();
                for (const id of scope.lexicalDeclarations) {
                    const declaration = this.declarations[id];
                    if (declaration.kind !== "function") continue;
                    if (functions.has(declaration.site.name) && !nonLegacyNames.has(declaration.site.name)) return { kind: "blocked", goal: "Script", unit: this.unit,
                        rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
                        diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate sloppy block functions are unsupported", loc: declaration.site.loc } };
                    functions.add(declaration.site.name);
                }
            }
            if (scope.kind === "catch") {
                const parameter = scope.catchParameter;
                const handler = this.scopes[scope.id + 1];
                if (parameter === null || handler.parent !== scope.id) throw new Error("invalid catch scope");
                if ((!this.bounded && !scope.strict) || handler.lexicalNames.includes(parameter.name) || (!this.bounded && handler.varNames.includes(parameter.name)))
                    return { kind: "blocked", goal: "Script", unit: this.unit,
                        rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
                        diagnostic: { phase: "parse", name: "SyntaxError", message: "unsupported catch binding conflict or non-strict catch", loc: parameter.loc } };
            }
            const conflict = declarationConflict(scope, this.declarations);
            if (conflict !== null) {
                const later = conflict.first.start > conflict.second.start ? conflict.first : conflict.second;
                return { kind: "conflict", goal: "Script", unit: this.unit, consumedUnits: this.unit.text.length, conflict,
                    diagnostic: { phase: "parse", name: "SyntaxError", message: conflict.kind + ": " + conflict.second.name,
                        loc: { line: later.loc.line, column: later.loc.column } } };
            }
        }
        const plan: ScriptDeclarationPlan = { kind: "complete", goal: "Script", unit: this.unit, consumedUnits: this.unit.text.length,
            strictness: this.strictness, scopes: this.scopes, declarations: this.declarations, functions: this.functions };
        const legacyBlockFunctions = this.legacyBlockFunctions();
        return legacyBlockFunctions.length === 0 ? plan : { ...plan, legacyBlockFunctions };
    }
    private legacyBlockFunctions(): number[] {
        const result: number[] = [];
        for (const declaration of this.declarations) {
            const scope = this.scopes[declaration.scope];
            if (declaration.kind !== "function" || scope.strict || (scope.kind !== "block" && scope.kind !== "switch")) continue;
            if (declaration.functionScope !== null && this.nonLegacyFunctionScopes.has(declaration.functionScope)) continue;
            const name = declaration.site.name;
            const variableScope = this.scopes[declaration.variableScope];
            let eligible = true;
            for (const formal of variableScope.formals) if (formal.name === name) eligible = false;
            let parent = scope.parent;
            while (eligible && parent !== null) {
                const enclosing: MutableScope = this.scopes[parent];
                for (const id of enclosing.lexicalDeclarations) {
                    const other = this.declarations[id];
                    if (other.site.name === name && other.kind !== "function") eligible = false;
                }
                if (parent === variableScope.id) break;
                parent = enclosing.parent;
            }
            if (eligible) result.push(declaration.id);
        }
        return result;
    }
    private restrictedBinding(): { name: string; loc: Location } | null {
        for (const site of this.restrictedAssignments) if (this.scopes[site.scope].strict) return site;
        for (const scope of this.scopes) {
            if (!scope.strict) continue;
            for (const formal of scope.formals) if (formal.name === "arguments" || formal.name === "eval") return formal;
            if (scope.catchParameter !== null && (scope.catchParameter.name === "arguments" || scope.catchParameter.name === "eval")) return scope.catchParameter;
        }
        for (const declaration of this.declarations) {
            if (declaration.site.name !== "arguments" && declaration.site.name !== "eval") continue;
            if (this.scopes[declaration.scope].strict ||
                (declaration.functionScope !== null && this.scopes[declaration.functionScope].strict)) return declaration.site;
        }
        return null;
    }
    auditStrictParameters(): StrictParameterAudit {
        const blocks = this.audit(true);
        if (blocks.kind === "blocked") return { kind: "blocked", reason: blocks.reason,
            diagnostic: blocks.diagnostic, rejection: blocks.rejection };
        if (blocks.kind === "eligible") {
            const site = blocks.candidates[0].second;
            return { kind: "blocked", reason: "other-conflict", rejection: null,
                diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate-lexical: " + site.name,
                    loc: { line: site.loc.line, column: site.loc.column } } };
        }
        const candidates = this.strictParameterCandidates();

        const sourceUnits = this.unit.text.length;
        if (candidates.length === 0) return { kind: "none", sourceUnits, consumedUnits: sourceUnits };
        return { kind: "eligible", sourceUnits, consumedUnits: sourceUnits, candidates };
    }
    private strictParameterCandidates(): StrictParameterCandidate[] {
        const candidates: StrictParameterCandidate[] = [];
        for (const fn of this.functions) {
            const scope = this.scopes[fn.scope];
            if (!scope.strict) continue;
            const firsts = new Map<string, DeclarationSite>();
            for (const second of scope.formals) {
                const first = firsts.get(second.name);
                if (first === undefined) { firsts.set(second.name, second); continue; }
                const pair: StrictParameterCandidate = { ruleCode: "duplicate-strict-parameter",
                    functionStart: fn.start, functionEnd: fn.end, first: copySite(first), second: copySite(second) };
                candidates.push(pair);
            }
        }
        candidates.sort((a, b) => a.second.start - b.second.start || a.first.start - b.first.start);
        return candidates;
    }
    certifyParameterPreparation(): CertifiedParameterPreparationRejection | null {
        const blocks = this.audit(true);
        if (blocks.kind === "blocked") return null;
        const candidates = this.strictParameterCandidates();
        if (candidates.length === 0 || blocks.sourceUnits !== this.unit.text.length ||
            blocks.consumedUnits !== this.unit.text.length) throw new Error("invalid parameter rule certification");
        const parameter = candidates[0];
        let first = parameter.first;
        let second = parameter.second;
        let ruleCode: "duplicate-block-lexical-function" | "duplicate-strict-parameter" = "duplicate-strict-parameter";
        if (blocks.kind === "eligible") {
            const block = blocks.candidates[0];
            // A tie belongs to block; the current grammar gives disjoint roles.
            if (block.second.start < second.start ||
                (block.second.start === second.start && block.first.start <= first.start)) {
                first = block.first;
                second = block.second;
                ruleCode = "duplicate-block-lexical-function";
            }
        }
        const message = ruleCode === "duplicate-strict-parameter" ? "duplicate strict parameter: " : "duplicate block lexical function: ";
        return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "syntax-error", ruleCode },
            diagnostic: { phase: "parse", name: "SyntaxError", message: message + second.name,
                loc: { line: second.loc.line, column: second.loc.column } } };
    }
    audit(ignoreStrictParameters = false): BlockFunctionAudit {
        const ordinary = this.project(ignoreStrictParameters);
        if (ordinary.kind === "blocked") return { kind: "blocked", reason: "scope-restriction",
            diagnostic: ordinary.diagnostic, rejection: ordinary.rejection };
        // An earlier ordinary conflict must not hide a later catch restriction.
        for (const scope of this.scopes) {
            if (scope.kind !== "catch") continue;
            const parameter = scope.catchParameter;
            const handler = this.scopes[scope.id + 1];
            if (parameter === null || handler.parent !== scope.id) throw new Error("invalid catch scope");
            if (handler.lexicalNames.includes(parameter.name)) {
                return { kind: "blocked", reason: "scope-restriction",
                    rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
                    diagnostic: { phase: "parse", name: "SyntaxError", message: "unsupported catch binding conflict or non-strict catch", loc: parameter.loc } };
            }
        }
        const candidates: BlockFunctionCandidate[] = [];
        for (const scope of this.scopes) {
            const lexicals = new Map<string, Declaration>();
            for (const id of scope.lexicalDeclarations) {
                const declaration = this.declarations[id];
                const first = lexicals.get(declaration.site.name);
                if (first === undefined) lexicals.set(declaration.site.name, declaration);
                else if (scope.strict && scope.kind === "block" && first.kind === "function" && declaration.kind === "function") {
                    candidates.push({ ruleCode: "duplicate-block-lexical-function", scopeStart: scope.start, scopeEnd: scope.end,
                        first: copySite(first.site), second: copySite(declaration.site) });
                } else return otherConflict("duplicate-lexical", first.site, declaration.site);
            }
            // Check every intersection even when the same scope already supplied
            // a function/function pair (including function/function/let triples).
            for (const id of scope.varDeclarations) {
                const site = this.declarations[id].site;
                const first = lexicals.get(site.name);
                if (first !== undefined) return otherConflict("lexical-var", first.site, site);
            }
            for (const first of scope.formals) {
                const second = lexicals.get(first.name);
                if (second !== undefined) return otherConflict("formal-lexical", first, second.site);
            }
        }
        candidates.sort((a, b) => a.second.start - b.second.start || a.first.start - b.first.start);
        const sourceUnits = this.unit.text.length;
        if (candidates.length === 0) return { kind: "none", sourceUnits, consumedUnits: sourceUnits };
        return { kind: "eligible", sourceUnits, consumedUnits: sourceUnits, candidates };
    }
}

function otherConflict(kind: string, first: DeclarationSite, second: DeclarationSite): BlockFunctionAudit {
    const later = first.start > second.start ? first : second;
    return { kind: "blocked", reason: "other-conflict", rejection: null,
        diagnostic: { phase: "parse", name: "SyntaxError", message: kind + ": " + second.name,
            loc: { line: later.loc.line, column: later.loc.column } } };
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
