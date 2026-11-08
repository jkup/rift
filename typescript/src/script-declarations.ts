import { parseDeclarationPlan } from "./parser.js";
import { scriptPrologue } from "./script-prologue.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Diagnostic, Location, Expr, Stmt, SourceText, FunctionSource, DeclarationSite, TryCatchStmt, SwitchStmt } from "./syntax.js";
import type { Token } from "./lexer.js";
import type { Rejection } from "./outcomes.js";

export type { DeclarationSite } from "./syntax.js";
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
  readonly id: number; readonly kind: "script" | "function" | "block" | "catch" | "switch";
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
    assignmentNameEligible: Map<Expr, boolean>;
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
    id: number; kind: "script" | "function" | "block" | "catch" | "switch"; parent: number | null;
    catchParameter: DeclarationSite | null;
    start: number; end: number; strict: boolean; formals: DeclarationSite[];
    lexicalDeclarations: number[]; varDeclarations: number[];
    lexicalNames: string[]; varNames: string[];
};
type Work =
    | { kind: "switch"; node: SwitchStmt; scope: number; variableScope: number }
    | { kind: "catch"; node: TryCatchStmt; scope: number; variableScope: number }
    | { kind: "block-end"; scope: number }
    | { kind: "statement"; node: Stmt; scope: number; variableScope: number }
    | { kind: "expression"; node: Expr; scope: number; variableScope: number }
    | { kind: "binding"; binding: ParsedBinding; node: Stmt; declarationKind: "let" | "var"; scope: number; variableScope: number };

export function collectDeclarationPlan(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes | null = null, bounded = false): DeclarationPlanResult {
    const analysis = new DeclarationCollector(unit, tokens, bindings, nodes, bounded);
    analysis.collect(body);
    return analysis.project();
}

// One traversal supplies both the unchanged ordinary result and global veto audit.
export function collectBoundedScriptPreparation(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes): DeclarationPlanResult {
    const analysis = new DeclarationCollector(unit, tokens, bindings, nodes, true);
    analysis.collect(body);
    const ordinary = analysis.project();
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
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true);
    analysis.collect(body);
    return analysis.audit();
}

export type LexicalStatementContext = "if-consequent" | "if-alternate" | "while-body" | "for-body";
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
export function collectLexicalStatementAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, candidates: readonly LexicalStatementCandidate[]): LexicalStatementAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true);
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
export type NumericAssignmentCandidate = {
    readonly ruleCode: "assignment-target";
    readonly target: NumericAssignmentSite;
    readonly operator: {
        readonly text: "=" | "+=" | "-=" | "*=" | "/=" | "%=";
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
export function collectNumericAssignmentAudit(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>, candidates: readonly NumericAssignmentCandidate[]): NumericAssignmentAudit {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true);
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
        if (targetToken === undefined || targetToken.kind !== "number" || operatorToken === undefined || operatorToken.kind !== "punct" ||
            targetToken.text !== target.text || targetToken.end !== target.end || operatorToken.text !== operator.text || operatorToken.end !== operator.end ||
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
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true);
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
export function collectBoundedScriptParameterRejection(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>): CertifiedParameterPreparationRejection | null {
    const analysis = new DeclarationCollector(unit, tokens, bindings, null, true);
    analysis.collect(body);
    return analysis.certifyParameterPreparation();
}

function copySite(site: DeclarationSite): DeclarationSite {
    return { name: site.name, start: site.start, end: site.end,
        loc: { line: site.loc.line, column: site.loc.column } };
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
    readonly identifierDeletes: { scope: number; loc: Location }[] = [];

    constructor(readonly unit: ScriptSourceUnit, readonly tokens: Token[], readonly bindings: Map<number, ParsedBinding[]>, readonly nodes: DeclarationNodes | null, readonly bounded: boolean) {
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
    scope(kind: "script" | "function" | "block" | "catch" | "switch", parent: number | null, start: number, end: number, strict: boolean, formals: DeclarationSite[]): number {
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
    declare(kind: "let" | "var" | "function", binding: ParsedBinding, scope: number, variableScope: number, functionScope: number | null): number {
        const id = this.declarations.length;
        const site = binding.site;
        this.declarations.push({ id, kind, site: { name: site.name, start: site.start, end: site.end,
            loc: { line: site.loc.line, column: site.loc.column } }, scope, variableScope, functionScope,
            initializer: binding.initializer === null ? null : { start: binding.initializer.start, end: binding.initializer.end } });
        if (kind === "let" || (kind === "function" && (this.scopes[scope].kind === "block" || this.scopes[scope].kind === "switch"))) {
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
            case "switch":
                this.work.push({ kind: "switch", node, scope, variableScope });
                this.expression(node.discriminant, scope, variableScope);
                break;
            case "try-catch":
                this.work.push({ kind: "catch", node, scope, variableScope });
                this.statement(node.block, scope, variableScope);
                break;
            case "let": case "var": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing binding spans");
                for (let i = bindings.length - 1; i >= 0; i--) this.work.push({ kind: "binding", binding: bindings[i], node, declarationKind: node.kind, scope, variableScope });
                break;
            }
            case "function": {
                const bindings = this.bindings.get(this.tokens[this.tokenIndex(node.loc)].start);
                if (bindings === undefined) throw new Error("missing function name span");
                if ((this.scopes[scope].kind === "block" || this.scopes[scope].kind === "switch") && !this.scopes[scope].strict && this.unsupportedBlock === null) this.unsupportedBlock = node.loc;
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
            case "for":
                this.statement(node.body, scope, variableScope);
                if (node.update !== null) this.expression(node.update, scope, variableScope);
                if (node.test !== null) this.expression(node.test, scope, variableScope);
                if (node.initializer !== null) {
                    if (node.initializer.kind === "var") this.statement(node.initializer, scope, variableScope);
                    else this.expression(node.initializer, scope, variableScope);
                }
                break;
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
            case "template": for (let i = node.expressions.length - 1; i >= 0; i--) this.expression(node.expressions[i], scope, variableScope); break;
            case "update": this.expression(node.target, scope, variableScope); break;
            case "unary":
                if (node.op === "delete" && node.operand.kind === "identifier") this.identifierDeletes.push({ scope, loc: node.loc });
                this.expression(node.operand, scope, variableScope); break;
            case "binary": this.expression(node.right, scope, variableScope); this.expression(node.left, scope, variableScope); break;
            case "assign": case "compound": this.expression(node.value, scope, variableScope); this.expression(node.target, scope, variableScope); break;
            case "conditional": this.expression(node.alternate, scope, variableScope); this.expression(node.consequent, scope, variableScope); this.expression(node.test, scope, variableScope); break;
            case "member": this.expression(node.key, scope, variableScope); this.expression(node.base, scope, variableScope); break;
            case "new": case "call":
                for (let i = node.args.length - 1; i >= 0; i--) this.expression(node.args[i], scope, variableScope);
                this.expression(node.callee, scope, variableScope); break;
            case "literal": case "identifier": case "this": break;
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
                this.scopes[id].lexicalNames.push(node.parameter.name);
                if (this.nodes !== null) this.nodes.scopes.set(id, { node, body: node.handler.body });
                this.statement(node.handler, id, item.variableScope);
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
    project(): DeclarationPlanResult {
        // Preserve the ordinary first-failure projection, including interleaved
        // catch/conflict checks. The audit below has a separate global veto.
        // No conflicts are reported until all grammar/resource checks and every
        // function-context restriction have passed for the complete source.
        for (const site of this.identifierDeletes) {
            if (this.scopes[site.scope].strict) return { kind: "blocked", goal: "Script", unit: this.unit,
                rejection: { kind: "unsupported-syntax", capabilityCode: "parse.delete-identifier" },
                diagnostic: { phase: "parse", name: "SyntaxError", message: "delete of an identifier is not allowed", loc: site.loc } };
        }
        if (this.unsupportedBlock !== null) return { kind: "blocked", goal: "Script", unit: this.unit,
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: "non-strict block function planning is unsupported", loc: this.unsupportedBlock } };
        for (const scope of this.scopes) {
            if (scope.kind === "catch") {
                const parameter = scope.catchParameter;
                const handler = this.scopes[scope.id + 1];
                if (parameter === null || handler.parent !== scope.id) throw new Error("invalid catch scope");
                if ((!this.bounded && !scope.strict) || handler.lexicalNames.includes(parameter.name) || handler.varNames.includes(parameter.name))
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
        return { kind: "complete", goal: "Script", unit: this.unit, consumedUnits: this.unit.text.length,
            strictness: this.strictness, scopes: this.scopes, declarations: this.declarations, functions: this.functions };
    }
    auditStrictParameters(): StrictParameterAudit {
        const blocks = this.audit();
        if (blocks.kind === "blocked") return { kind: "blocked", reason: blocks.reason,
            diagnostic: blocks.diagnostic, rejection: blocks.rejection };
        if (blocks.kind === "eligible") {
            const site = blocks.candidates[0].second;
            return { kind: "blocked", reason: "other-conflict", rejection: null,
                diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate-lexical: " + site.name,
                    loc: { line: site.loc.line, column: site.loc.column } } };
        }
        const { candidates, sloppy } = this.parameterPairs();
        // A sloppy duplicate anywhere vetoes all strict candidates, even earlier ones.
        if (sloppy !== null) return { kind: "blocked", reason: "scope-restriction",
            rejection: { kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" },
            diagnostic: { phase: "parse", name: "SyntaxError", message: "duplicate parameter: " + sloppy.second.name,
                loc: sloppy.second.loc } };

        const sourceUnits = this.unit.text.length;
        if (candidates.length === 0) return { kind: "none", sourceUnits, consumedUnits: sourceUnits };
        return { kind: "eligible", sourceUnits, consumedUnits: sourceUnits, candidates };
    }
    private parameterPairs(): { candidates: StrictParameterCandidate[]; sloppy: StrictParameterCandidate | null } {
        const candidates: StrictParameterCandidate[] = [];
        let sloppy: StrictParameterCandidate | null = null;
        for (const fn of this.functions) {
            const scope = this.scopes[fn.scope];
            const firsts = new Map<string, DeclarationSite>();
            for (const second of scope.formals) {
                const first = firsts.get(second.name);
                if (first === undefined) { firsts.set(second.name, second); continue; }
                const pair: StrictParameterCandidate = { ruleCode: "duplicate-strict-parameter",
                    functionStart: fn.start, functionEnd: fn.end, first: copySite(first), second: copySite(second) };
                if (scope.strict) candidates.push(pair);
                else if (sloppy === null || second.start < sloppy.second.start ||
                    (second.start === sloppy.second.start && first.start < sloppy.first.start)) sloppy = pair;
            }
        }
        candidates.sort((a, b) => a.second.start - b.second.start || a.first.start - b.first.start);
        return { candidates, sloppy };
    }
    certifyParameterPreparation(): CertifiedParameterPreparationRejection | null {
        const blocks = this.audit();
        if (blocks.kind === "blocked") return null;
        const pairs = this.parameterPairs();
        // Every sloppy duplicate vetoes both rules, including earlier candidates.
        if (pairs.sloppy !== null) return null;
        if (pairs.candidates.length === 0 || blocks.sourceUnits !== this.unit.text.length ||
            blocks.consumedUnits !== this.unit.text.length) throw new Error("invalid parameter rule certification");
        const parameter = pairs.candidates[0];
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
    audit(): BlockFunctionAudit {
        const ordinary = this.project();
        if (ordinary.kind === "blocked") return { kind: "blocked", reason: "scope-restriction",
            diagnostic: ordinary.diagnostic, rejection: ordinary.rejection };
        // An earlier ordinary conflict must not hide a later catch restriction.
        for (const scope of this.scopes) {
            if (scope.kind !== "catch") continue;
            const parameter = scope.catchParameter;
            const handler = this.scopes[scope.id + 1];
            if (parameter === null || handler.parent !== scope.id) throw new Error("invalid catch scope");
            if (handler.lexicalNames.includes(parameter.name) || handler.varNames.includes(parameter.name)) {
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
