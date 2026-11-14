import type { CatchBindingPattern, DeclarationStmt, ForStmt } from "./syntax.js";
import { isStrictReservedIdentifier } from "./identifier-names.js";
import { PrivateSyntaxScope, type PrivateSyntaxIssue } from "./private-syntax.js";
import type { PrivateNameSyntax } from "./syntax.js";
import type { TemplateObjectExpr } from "./syntax.js";
import { isSuspendingGeneratorExpression } from "./generator-expression.js";
import type { GeneratorYieldStmt, AwaitExpr } from "./syntax.js";
import { validateRegExpLiteral } from "./regexp-literal-validation.js";
import type { SuperContext } from "./syntax.js";
import type { ClassExpr, ClassElement, ClassFieldInitializer, ClassStaticBlock } from "./syntax.js";
import type { DestructuringPattern, ArrayPattern, ObjectPattern, PatternElement } from "./syntax.js";
import { collectNumericSeparatorAudit, type NumericSeparatorAudit } from "./script-declarations.js";
import { collectLexicalStatementAudit, type LexicalStatementAudit, type LexicalStatementCandidate, type LexicalStatementContext, collectNumericAssignmentAudit, type NumericAssignmentAudit, type NumericAssignmentCandidate, collectDeclarationPlan, collectBoundedScriptPreparation, collectBoundedScriptParameterRejection, collectBlockFunctionAudit, collectStrictParameterAudit, type StrictParameterAudit, type BlockFunctionAudit, type DeclarationNodes, type DeclarationPlanResult, type ParsedBinding } from "./script-declarations.js";
export type { LexicalStatementAudit, LexicalStatementCandidate, LexicalStatementContext, NumericAssignmentAudit, NumericAssignmentCandidate, NumericAssignmentSite, StrictParameterAudit, StrictParameterCandidate, BlockFunctionAudit, BlockFunctionCandidate } from "./script-declarations.js";
import type { ScriptSourceUnit } from "./script-metadata.js";
import { scriptPrologue, lineTerminatorBetween } from "./script-prologue.js";
import type { ResourceOrigin, SyntaxCapability, Rejection } from "./outcomes.js";
import { lex, createLexer, type Lexer, type Token } from "./lexer.js";
import { hasParameterPatterns } from "./formal-parameters.js";
import type { Diagnostic, Expr, ChainLink, ObjectProperty, ArrayElement, Argument, Location, Stmt, SourceText, FunctionSource, FormalParameter, DeclarationSite, SwitchClause, VarStmt, ForEachStmt, TryFinallyStmt } from "./syntax.js";

const RESERVED = " let function if else while return throw break continue this true false null const var for do new class extends super async await yield import export switch case default try catch finally delete typeof void in instanceof with debugger enum implements interface package private protected public static null eval arguments ";
export type ParseResult = { body: Stmt[]; error: Diagnostic | null; rejection: Rejection | null };
export function parse(source: string): ParseResult {
    const result = lex(source);
    if (result.error !== null) return { body: [], error: result.error, rejection: result.rejection };
    const parsed = new Parser(result.tokens, { text: source }).program();
    // Preserve the ordinary parser's first error and partial body. Only this
    // rejection can request a fresh, source-only audit of the entire input.
    if (parsed.rejection?.kind === "unsupported-syntax" && parsed.rejection.capabilityCode === "parse.return-context") {
        const coverage = auditScriptReturns(source);
        if (coverage.kind === "complete" && coverage.candidates.length > 0) {
            parsed.rejection = { kind: "syntax-error", ruleCode: "return-outside-function" };
        }
    }
    return parsed;
}
// Internal structural evidence only: this entry point never returns an executable body.
export type ReturnCandidate = {
    readonly ruleCode: "return-outside-function";
    readonly loc: Location;
    readonly start: number;
    readonly end: number;
};
export type ReturnCoverage =
    | { readonly kind: "complete"; readonly goal: "Script";
        readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly ReturnCandidate[] }
    | { readonly kind: "blocked"; readonly goal: "Script";
        readonly rejection: { readonly kind: "unsupported-syntax";
            readonly capabilityCode: SyntaxCapability } | ResourceOrigin; readonly loc: Location };
function blockedReturnCoverage(rejection: Rejection | null, error: Diagnostic | null): ReturnCoverage {
    if (error === null || rejection === null || rejection.kind === "syntax-error") {
        throw new Error("invalid return audit rejection");
    }
    return { kind: "blocked", goal: "Script", rejection, loc: error.loc };
}
export function auditScriptReturns(source: string): ReturnCoverage {
    const result = lex(source);
    if (result.error !== null) return blockedReturnCoverage(result.rejection, result.error);
    const parser = new Parser(result.tokens, { text: source }, "return-audit");
    parser.program();
    if (parser.error !== null) return blockedReturnCoverage(parser.rejection, parser.error);
    const end = parser.current();
    // EOF comes from the lexer after trailing trivia, not the last statement span.
    if (end.kind !== "eof" || end.start !== source.length || end.end !== source.length) {
        throw new Error("return audit did not reach source EOF");
    }
    return { kind: "complete", goal: "Script", sourceUnits: source.length,
        consumedUnits: end.end, candidates: parser.returnCandidates };
}
export function auditBoundedScriptNumericSeparators(source: string, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): NumericSeparatorAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, "separator", newTargetAllowed, superContext, privateNames);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectNumericSeparatorAudit(unit, parsed.body, parsed.tokens, parsed.bindings, inheritedStrict);
}

// Internal handoff: only a fresh parse can populate retained nodes.
// The public planner supplies no retention object.
export function parseDeclarationPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null = null): DeclarationPlanResult {
    return parseStructuralPlan(unit, nodes, false);
}
export function parseBoundedScriptDeclarationPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null = null): DeclarationPlanResult {
    return parseStructuralPlan(unit, nodes, true);
}
// Preparation alone may certify bounded rules after full-source parsing.
export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): DeclarationPlanResult {
    const original = prepareBeforeAsyncStatementAudit(unit, nodes, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.declaration-statement") return original;
    const audit = parseStructuralSource(original.unit, null, true, "async-statement", newTargetAllowed, superContext, privateNames);
    if (audit.kind === "blocked") return original;
    const first = audit.asyncStatementCandidates[0];
    if (first === undefined || first.line !== original.diagnostic.loc.line || first.column !== original.diagnostic.loc.column) return original;
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "async-function-statement" }, diagnostic: original.diagnostic };
}
function prepareBeforeAsyncStatementAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean, newTargetAllowed: boolean, superContext: SuperContext, privateNames: readonly string[]): DeclarationPlanResult {
    const original = prepareBeforeReturnAudit(unit, nodes, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.return-context") return original;
    const audit = parseStructuralSource(original.unit, null, true, "return", newTargetAllowed, superContext, privateNames);
    if (audit.kind === "blocked") return original;
    const first = audit.returnCandidates[0];
    if (first === undefined || first.loc.line !== original.diagnostic.loc.line || first.loc.column !== original.diagnostic.loc.column) return original;
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "return-outside-function" }, diagnostic: original.diagnostic };
}
function prepareBeforeReturnAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean, newTargetAllowed: boolean, superContext: SuperContext, privateNames: readonly string[]): DeclarationPlanResult {
    const original = prepareBeforeNumericSeparators(unit, nodes, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        (original.rejection.capabilityCode !== "lex.numeric-literal" && original.rejection.capabilityCode !== "lex.leading-zero")) return original;
    const audit = auditBoundedScriptNumericSeparators(original.unit.text, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible separator audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "numeric-separator" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "invalid numeric separator",
            loc: { line: first.loc.line, column: first.loc.column } } };
}
function prepareBeforeNumericSeparators(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean, newTargetAllowed: boolean, superContext: SuperContext, privateNames: readonly string[]): DeclarationPlanResult {
    const original = parseBoundedScriptPreparationBeforeLexicalAudit(unit, nodes, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.declaration-statement") return original;
    const audit = auditBoundedScriptLexicalStatements(original.unit.text, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible lexical audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "lexical-declaration-statement" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "lexical declaration is not allowed in Statement position",
            loc: { line: first.keyword.loc.line, column: first.keyword.loc.column } } };
}
// Preserve D6 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeLexicalAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean, newTargetAllowed: boolean, superContext: SuperContext, privateNames: readonly string[]): DeclarationPlanResult {
    const original = parseBoundedScriptPreparationBeforeNumericAudit(unit, nodes, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.assignment-target") return original;
    const audit = auditBoundedScriptNumericAssignments(original.unit.text, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible numeric audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "assignment-target" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "invalid numeric assignment target",
            loc: { line: first.target.loc.line, column: first.target.loc.column } } };
}
// Preserve D4 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeNumericAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean, newTargetAllowed: boolean, superContext: SuperContext, privateNames: readonly string[]): DeclarationPlanResult {
    const original = parseStructuralPlan(unit, nodes, true, true, inheritedStrict, newTargetAllowed, superContext, privateNames);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.duplicate-parameter") return original;
    // A failed duplicate-formal parse only permits a fresh rejection-only audit.
    // Its retained nodes remain untouched; the continuation cannot produce a plan.
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, null, true, "parameter", newTargetAllowed, superContext, privateNames);
    if (parsed.kind === "blocked") return original;
    const rejection = collectBoundedScriptParameterRejection(source, parsed.body, parsed.tokens, parsed.bindings, inheritedStrict);
    return rejection === null ? original : rejection;
}
function parseStructuralPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean, certifyBlockFunctions = false, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): DeclarationPlanResult {
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, nodes, bounded, "none", newTargetAllowed, superContext, privateNames);
    if (parsed.kind === "blocked") return parsed;
    if (certifyBlockFunctions) {
        if (nodes === null) throw new Error("preparation requires retained nodes");
        return collectBoundedScriptPreparation(source, parsed.body, parsed.tokens, parsed.bindings, nodes, inheritedStrict);
    }
    return collectDeclarationPlan(source, parsed.body, parsed.tokens, parsed.bindings, nodes, bounded, inheritedStrict);
}
export function auditBoundedScriptBlockFunctions(source: string): BlockFunctionAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectBlockFunctionAudit(unit, parsed.body, parsed.tokens, parsed.bindings);
}
export function auditBoundedScriptStrictParameters(source: string): StrictParameterAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, "parameter");
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectStrictParameterAudit(unit, parsed.body, parsed.tokens, parsed.bindings);
}
export function auditBoundedScriptNumericAssignments(source: string, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): NumericAssignmentAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, "numeric", newTargetAllowed, superContext, privateNames);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectNumericAssignmentAudit(unit, parsed.body, parsed.tokens, parsed.bindings, parsed.numericCandidates, inheritedStrict);
}

export function auditBoundedScriptLexicalStatements(source: string, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): LexicalStatementAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, "lexical", newTargetAllowed, superContext, privateNames);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectLexicalStatementAudit(unit, parsed.body, parsed.tokens, parsed.bindings, parsed.lexicalCandidates, inheritedStrict);
}

type StructuralSource =
    | { kind: "parsed"; body: Stmt[]; tokens: Token[]; bindings: Map<number, ParsedBinding[]>; numericCandidates: readonly NumericAssignmentCandidate[]; lexicalCandidates: readonly LexicalStatementCandidate[]; returnCandidates: readonly ReturnCandidate[]; asyncStatementCandidates: readonly Location[] }
    | { kind: "blocked"; goal: "Script"; unit: ScriptSourceUnit; rejection: Rejection; diagnostic: Diagnostic };
// One lexical/parser path for both public plans and non-emitting audit evidence.
function parseStructuralSource(source: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean,
    audit: "none" | "parameter" | "numeric" | "lexical" | "separator" | "return" | "async-statement" = "none", newTargetAllowed = false, superContext: SuperContext = "none", privateNames: readonly string[] = []): StructuralSource {
    if (audit !== "none" && (!bounded || nodes !== null)) throw new Error("invalid structural audit purpose");
    const parameterAudit = audit === "parameter", numericAudit = audit === "numeric";
    const lexicalAudit = audit === "lexical", separatorAudit = audit === "separator";
    const lexer = createLexer(source.text, true, separatorAudit);
    const parserSource: SourceText = { text: source.text };
    const parser = new Parser(lexer.result().tokens, parserSource, audit === "async-statement" ? "bounded-async-statement-audit" : audit === "return" ? "bounded-return-audit" : separatorAudit ? "bounded-numeric-separator-audit" : lexicalAudit ? "bounded-lexical-statement-audit" : numericAudit ? "bounded-numeric-assignment-audit" : parameterAudit ? "bounded-parameter-audit" : bounded ? "bounded-plan" : "declaration-plan", newTargetAllowed, superContext, lexer);
    parser.allowOuterPrivateNames(privateNames);
    parser.privateSyntaxEnabled = bounded;
    const parsed = parser.program();
    // Public audits retain whole-source lexical failure precedence.
    while (lexer.next().kind !== "eof") {}
    const lexical = lexer.result();
    if (lexical.error !== null) {
        if (lexical.rejection === null) throw new Error("missing lexer rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: lexical.rejection, diagnostic: lexical.error };
    }
    if (nodes !== null) nodes.source = parserSource;
    if (parsed.error !== null) {
        if (parsed.rejection === null) throw new Error("missing parser rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: parsed.rejection, diagnostic: parsed.error };
    }
    if (parser.current().kind !== "eof" || parser.current().start !== source.text.length || parser.current().end !== source.text.length) throw new Error("declaration plan did not reach EOF");
    if (parser.regexpError !== null) return { kind: "blocked", goal: "Script", unit: source,
        rejection: { kind: "syntax-error", ruleCode: "regexp-literal" }, diagnostic: parser.regexpError };
    if (parser.privateIssue !== null) return { kind: "blocked", goal: "Script", unit: source,
        rejection: { kind: "syntax-error", ruleCode: "private-name" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: parser.privateIssue.message, loc: parser.privateIssue.site.loc } };
    if (nodes !== null) nodes.assignmentNameEligible = parser.assignmentNameEligible;
    return { kind: "parsed", body: parsed.body, tokens: lexical.tokens, bindings: parser.bindings, numericCandidates: parser.numericCandidates, lexicalCandidates: parser.lexicalCandidates, returnCandidates: parser.returnCandidates, asyncStatementCandidates: parser.asyncStatementCandidates };
}
type ObjectCoverEntry = { kind: "data" | "method"; key: Expr; computed?: true; value: Expr } | { kind: "rest"; value: Expr };
type ObjectCover = { entries: ObjectCoverEntry[]; trailingComma: boolean; unsupported: { reason: Rejection; message: string; loc: Location } | null };
class Parser {
    privateSyntaxEnabled = false;
    private privateScope = new PrivateSyntaxScope(null);
    private readonly privateScopes: PrivateSyntaxScope[] = [this.privateScope];
    privateIssue: PrivateSyntaxIssue | null = null;
    allowOuterPrivateNames(names: readonly string[]): void {
        for (const name of names) this.privateScope.allowOuterName(name);
    }
    private privateName(token: Token, use: boolean): PrivateNameSyntax {
        const site = { name: token.text, start: token.start, end: token.end, loc: token.loc };
        if (use) this.privateScope.uses.push(site);
        return { kind: "private-name", ...site };
    }
    private generatorContext = false;
    private generatorYields: GeneratorYieldStmt[] = [];
    private asyncContext = false;
    private awaits: AwaitExpr[] = [];
    private yieldIdentifierReserved = false;
    private awaitIdentifierReserved = false;
    private awaitCoverIdentifiers: Location[] | null = null;
    private readonly objectCovers = new Map<Expr, ObjectCover>();
    private readonly arrayTrailingCommas = new Set<Expr>();
    readonly lexicalCandidates: LexicalStatementCandidate[] = [];
    readonly numericCandidates: NumericAssignmentCandidate[] = [];
    private readonly numericTokens = new Map<Expr, Token>();
    readonly assignmentNameEligible = new Map<Expr, boolean>();
    private readonly parenthesized = new Map<Expr, boolean>();
    readonly bindings = new Map<number, ParsedBinding[]>();
    index = 0;
    depth = 0;
    functions = 0;
    loops = 0;
    switches = 0;
    private labels: { name: string; iteration: boolean }[] = [];
    error: Diagnostic | null = null;
    rejection: Rejection | null = null;
    readonly returnCandidates: ReturnCandidate[] = [];
    readonly asyncStatementCandidates: Location[] = [];
    regexpError: Diagnostic | null = null;
    constructor(public tokens: Token[], readonly source: SourceText, private readonly purpose: "legacy" | "return-audit" | "declaration-plan" | "bounded-plan" | "bounded-parameter-audit" | "bounded-numeric-assignment-audit" | "bounded-lexical-statement-audit" | "bounded-numeric-separator-audit" | "bounded-return-audit" | "bounded-async-statement-audit" = "legacy", private newTargetAllowed = false, private superContext: SuperContext = "none", private readonly lexer: Lexer | null = null) {}
    private literalPropertyName(token: Token): string {
        if (token.kind === "number") return String(Number(token.text.replaceAll("_", "")));
        if (token.kind === "bigint") return String(BigInt(token.text.slice(0, -1).replaceAll("_", "")));
        return token.text;
    }
    private structuralPlan(): boolean { return this.purpose === "declaration-plan" || this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit" || this.purpose === "bounded-numeric-assignment-audit" || this.purpose === "bounded-lexical-statement-audit" || this.purpose === "bounded-numeric-separator-audit" || this.purpose === "bounded-return-audit" || this.purpose === "bounded-async-statement-audit"; }
    private boundedPlan(): boolean { return this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit" || this.purpose === "bounded-numeric-assignment-audit" || this.purpose === "bounded-lexical-statement-audit" || this.purpose === "bounded-numeric-separator-audit" || this.purpose === "bounded-return-audit" || this.purpose === "bounded-async-statement-audit"; }
    private token(index: number): Token {
        while (index >= this.tokens.length && this.lexer !== null) {
            const last = this.tokens[this.tokens.length - 1];
            if (last !== undefined && last.kind === "eof") return last;
            this.lexer.next();
        }
        return this.tokens[index];
    }
    current(): Token { return this.token(this.index); }
    at(text: string): boolean {
        const t = this.current();
        return t.escaped !== true && t.kind !== "string" && t.kind !== "number" && t.kind !== "bigint" && t.text === text;
    }
    take(): Token {
        const t = this.current();
        if (t.kind !== "eof") this.index++;
        return t;
    }
    eat(text: string): boolean {
        if (!this.at(text)) return false;
        this.take();
        return true;
    }
    fail(reason: Rejection, message: string, loc: Location): void {
        if (this.error === null) {
            this.error = { phase: "parse", name: "SyntaxError", message, loc };
            this.rejection = reason;
        }
    }
    expect(text: string): void {
        if (!this.eat(text)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "expected '" + text + "', found '" + this.current().text + "'", this.current().loc);
    }
    statementTerminator(): void {
        if (this.eat(";")) return;
        if (this.structuralPlan() && (this.current().kind === "eof" || this.at("}") ||
            lineTerminatorBetween(this.source.text, this.token(this.index - 1), this.current()))) return;
        this.expect(";");
    }
    name(): string {
        const t = this.take();
        if (t.kind !== "word" || (RESERVED.includes(" " + t.text + " ") && !(this.structuralPlan() && (t.text === "arguments" || t.text === "eval" || t.text === "async" || this.awaitIdentifierAllowed(t.text) || this.yieldIdentifierAllowed(t.text) || (this.boundedPlan() && (t.text === "let" || isStrictReservedIdentifier(t.text))))))) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "expected binding identifier", t.loc);
        this.recordAwaitIdentifier(t.text, t.loc);
        return t.text;
    }
    private letDeclarationAhead(): boolean {
        if (!this.at("let")) return false;
        if (!this.boundedPlan()) return true;
        const next = this.token(this.index + 1);
        return next.text === "[" || next.text === "{" || this.labelIdentifier(next);
    }
    private checkLexicalName(site: DeclarationSite): void {
        if (this.boundedPlan() && site.name === "let")
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "lexical declarations cannot bind let", site.loc);
    }
    private yieldIdentifierAllowed(name: string): boolean {
        return this.boundedPlan() && name === "yield" && !this.yieldIdentifierReserved;
    }
    private awaitIdentifierAllowed(name: string): boolean {
        return this.boundedPlan() && name === "await" && !this.awaitIdentifierReserved;
    }
    private recordAwaitIdentifier(name: string, loc: Location): void {
        if (name === "await" && this.awaitCoverIdentifiers !== null) this.awaitCoverIdentifiers.push(loc);
    }
    program(): ParseResult {
        const body = this.list(false, []);
        for (const cover of this.objectCovers.values()) {
            if (cover.unsupported !== null) this.fail(cover.unsupported.reason, cover.unsupported.message, cover.unsupported.loc);
        }
        if (this.privateSyntaxEnabled && this.error === null) {
            for (const scope of this.privateScopes) {
                const issue = scope.validate();
                if (issue !== null && (this.privateIssue === null || issue.site.start < this.privateIssue.site.start)) this.privateIssue = issue;
            }
        }
        return { body, error: this.error, rejection: this.rejection };
    }
    list(braced: boolean, parameters: string[]): Stmt[] {
        const body: Stmt[] = [];
        const names = parameters.slice();
        while (this.error === null && this.current().kind !== "eof" && !(braced && this.at("}"))) {
            const stmt = this.statement();
            if (!this.structuralPlan() && (stmt.kind === "let" || stmt.kind === "function")) {
                if (names.includes(stmt.name)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-binding" }, "duplicate binding: " + stmt.name, stmt.loc);
                names.push(stmt.name);
            }
            body.push(stmt);
        }
        if (braced) this.expect("}");
        return body;
    }
    statement(): Stmt {
        const loc = this.current().loc;
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return { kind: "empty", loc };
        }
        const result = this.statementInner();
        this.depth--;
        return result;
    }
    private asyncFunctionAhead(): boolean {
        return this.structuralPlan() && this.at("async") && this.token(this.index + 1).escaped !== true && this.token(this.index + 1).text === "function"
            && this.current().loc.line === this.token(this.index + 1).loc.line;
    }
    private asyncMethodAhead(): boolean {
        const next = this.token(this.index + 1);
        return this.at("async") && this.current().loc.line === next.loc.line
            && !["(", ":", "=", ",", "}", ";"].includes(next.text);
    }
    private auditAsyncDeclarationStatement(): boolean {
        if (this.purpose !== "bounded-async-statement-audit" || !this.asyncFunctionAhead() || this.token(this.index + 2).text === "*") return false;
        this.asyncStatementCandidates.push(this.current().loc);
        return true;
    }
    branch(context: LexicalStatementContext): Stmt {
        const keyword = this.current();
        let labelledEnd = this.index;
        while (this.labelAhead(labelledEnd)) labelledEnd += 2;
        if (labelledEnd !== this.index && this.token(labelledEnd).text === "function")
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "labelled functions require a statement list", keyword.loc);
        if ((context === "if-consequent" || context === "if-alternate") && this.structuralPlan() &&
            this.at("function") && this.token(this.index + 1).text !== "*") {
            const declaration = this.statement();
            if (this.error !== null) return declaration;
            return { kind: "block", loc: keyword.loc, body: [declaration], synthetic: "conditional-function" };
        }
        const auditAsync = this.auditAsyncDeclarationStatement();
        const auditLet = this.purpose === "bounded-lexical-statement-audit" && this.letDeclarationAhead();
        if (this.at("const")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported or unexpected syntax: const", keyword.loc);
        if ((this.letDeclarationAhead() && !auditLet) || this.at("function") || (this.asyncFunctionAhead() && !auditAsync) || (this.structuralPlan() && this.at("class"))) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "declarations require a block", keyword.loc);
        if (auditLet && (this.token(this.index + 1)?.text === "[" || this.token(this.index + 1)?.text === "{"))
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "pattern declarations require a block", keyword.loc);
        const result = this.statement();
        // Only a complete supported declaration in this exact Statement slot is evidence.
        if (auditLet && this.error === null && (result.kind === "let" || result.kind === "declaration-list")) {
            this.lexicalCandidates.push({ ruleCode: "lexical-declaration-statement", context,
                keyword: { text: "let", start: keyword.start, end: keyword.end,
                    loc: { line: keyword.loc.line, column: keyword.loc.column } } });
        }
        return result;
    }
    statementInner(): Stmt {
        const start = this.current().start;
        const loc = this.current().loc;
        if (this.structuralPlan() && this.labelAhead(this.index)) {
            const name = this.take().text;
            this.expect(":");
            for (const label of this.labels) if (label.name === name)
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.loop-context" }, "duplicate label: " + name, loc);
            let index = this.index;
            while (this.labelAhead(index)) index += 2;
            const token = this.token(index);
            const iteration = token.kind === "word" && token.escaped !== true && (token.text === "for" || token.text === "while" || token.text === "do");
            this.labels.push({ name, iteration });
            const auditAsync = this.auditAsyncDeclarationStatement();
            if (this.letDeclarationAhead() || this.at("const") || (this.at("function") && this.token(this.index + 1).text === "*") || (this.asyncFunctionAhead() && !auditAsync) || this.at("class"))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "labelled declarations are unsupported", this.current().loc);
            const body = this.statement();
            this.labels.pop();
            return { kind: "labelled", loc, name, body };
        }
        if (this.structuralPlan() && this.at("class")) {
            this.take();
            return { kind: "class-declaration", loc, value: this.classDefinition(loc, start, true) };
        }
        if (this.eat(";")) return { kind: "empty", loc };
        if (this.eat("{")) return { kind: "block", loc, body: this.list(true, []) };
        if (this.structuralPlan() && this.eat("switch")) {
            this.expect("(");
            const discriminant = this.expression(0);
            this.expect(")");
            const brace = this.current();
            this.expect("{");
            const clauses: SwitchClause[] = [], body: Stmt[] = [];
            let hasDefault = false;
            this.switches++;
            while (this.error === null && this.current().kind !== "eof" && !this.at("}")) {
                const keyword = this.current();
                let test: Expr | null = null;
                if (this.eat("case")) test = this.expression(0);
                else if (this.eat("default") && !hasDefault) hasDefault = true;
                else {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "expected case or unique default", keyword.loc);
                    break;
                }
                this.expect(":");
                const statements: Stmt[] = [];
                while (this.error === null && this.current().kind !== "eof" && !this.at("case") && !this.at("default") && !this.at("}")) {
                    const statement = this.statement();
                    statements.push(statement);
                    body.push(statement);
                }
                clauses.push({ loc: keyword.loc, start: keyword.start, end: this.token(this.index - 1).end, test, body: statements });
            }
            this.switches--;
            this.expect("}");
            return { kind: "switch", loc, discriminant, caseBlock: { loc: brace.loc, start: brace.start,
                end: this.token(this.index - 1).end, clauses, body } };
        }
        if (this.structuralPlan() && this.eat("try")) {
            const block = this.statement();
            if (this.at("finally") && block.kind === "block") return this.finishTry(loc, block);
            const catchToken = this.current();
            this.expect("catch");
            let parameter: DeclarationSite | CatchBindingPattern | null = null;
            if (this.eat("(")) {
                if (this.at("[") || this.at("{")) {
                    const bindings: ParsedBinding[] = [];
                    const pattern = this.at("[") ? this.arrayBindingPattern(bindings) : this.objectBindingPattern(bindings);
                    parameter = { pattern, bindings: bindings.map(binding => binding.site) };
                } else {
                    const token = this.current();
                    const name = this.name();
                    parameter = { name, start: token.start, end: token.end, loc: token.loc };
                }
                this.expect(")");
            }
            const handler = this.statement();
            if (block.kind !== "block" || handler.kind !== "block") {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "try/catch requires blocks", loc);
                return { kind: "empty", loc };
            }
            return this.finishTry(loc, { kind: "try-catch", loc, block, handler,
                parameter,
                catchLoc: catchToken.loc, catchStart: catchToken.start, catchEnd: this.token(this.index - 1).end });
        }
        if (this.structuralPlan() && (this.letDeclarationAhead() || this.at("const") || this.at("var")))
            return this.standaloneDeclaration();
        if (this.letDeclarationAhead()) {
            this.take();
            const binding = this.binding(1);
            this.checkLexicalName(binding.site);
            this.statementTerminator();
            if (this.structuralPlan()) this.bindings.set(start, [binding]);
            return { kind: "let", loc, name: binding.site.name, init: binding.init };
        }
        const asynchronous = this.asyncFunctionAhead();
        if (asynchronous) this.take();
        if (this.eat("function")) {
            const generator = this.structuralPlan() && this.eat("*");
            const token = this.current();
            const name = this.name();
            if (this.structuralPlan()) this.bindings.set(start, [{ site: { name, start: token.start, end: token.end, loc: token.loc }, init: null, initializer: null }]);
            const fn = this.functionTail(loc, start, "none", generator, asynchronous);
            const source: FunctionSource = asynchronous ? { ...fn.source, async: true } : fn.source;
            return { kind: "function", loc, name, params: fn.params, parameters: fn.parameters, body: fn.body, source };
        }
        if (this.eat("if")) {
            this.expect("(");
            const test = this.expression(0);
            this.expect(")");
            const consequent = this.branch("if-consequent");
            const alternate = this.eat("else") ? this.branch("if-alternate") : null;
            return { kind: "if", loc, test, consequent, alternate };
        }
        if (this.structuralPlan() && this.eat("for")) {
            const awaited = this.eat("await");
            if (awaited && !this.asyncContext) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "for-await requires an async body", loc);
            if (awaited && this.functions === 0) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "for-await is forbidden in a static block", loc);
            this.expect("(");
            let lexical: { declarationKind: "let" | "const"; bindings: ParsedBinding[]; initializer: DeclarationStmt } | null = null;
            let initializer: ForStmt["initializer"] = null;
            if (this.letDeclarationAhead() || this.at("const") || this.at("var")) {
                const declaration = this.declarationList(false, true);
                if (declaration.head !== null) {
                    const kind = this.take().text === "in" ? "for-in" : "for-of";
                    return this.forEach(kind, loc, start, declaration.head, awaited);
                }
                if (declaration.statement === null) return { kind: "empty", loc };
                if (declaration.declarationKind !== "var") lexical = {
                    declarationKind: declaration.declarationKind, bindings: declaration.bindings, initializer: declaration.statement };
                else {
                    const node = declaration.statement;
                    if (node.kind !== "var" && node.kind !== "pattern-declaration" && node.kind !== "declaration-list") throw new Error("invalid var initializer");
                    initializer = node;
                }
            } else if (!this.at(";")) {
                const first = this.current(), expression = this.expression(0, false);
                if (this.at("of") || this.at("in")) {
                    const kind = this.take().text === "of" ? "for-of" : "for-in";
                    if (kind === "for-of" && first.kind === "word" && first.escaped !== true && first.text === "let")
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "for-of assignment targets cannot start with let", first.loc);
                    if ((expression.kind === "array" || expression.kind === "object") && !this.isParenthesized(expression)) {
                        const pattern = this.assignmentPattern(expression);
                        if (pattern.kind !== "array-pattern" && pattern.kind !== "object-pattern") throw new Error("loop pattern invariant");
                        return this.forEach(kind, loc, start, { kind: "assignment-pattern", loc: expression.loc, pattern }, awaited);
                    }
                    if (expression.kind !== "identifier" && expression.kind !== "member" && expression.kind !== "super-member")
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid " + kind + " assignment target", expression.loc);
                    return this.forEach(kind, loc, start, expression, awaited);
                }
                initializer = expression;
            }
            if (awaited) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "for-await requires of", loc);
            this.expect(";");
            const test = this.at(";") ? null : this.expression(0);
            this.expect(";");
            const update = this.at(")") ? null : this.expression(0);
            this.expect(")");
            this.loops++;
            const body = this.branch("for-body");
            this.loops--;
            if (lexical !== null) return { kind: "for-lexical", loc, start, end: this.token(this.index - 1).end,
                declarationKind: lexical.declarationKind, bindings: lexical.bindings, initializer: lexical.initializer, test, update, body };
            return { kind: "for", loc, initializer, test, update, body };
        }
        if (this.structuralPlan() && this.eat("do")) {
            this.loops++;
            const body = this.branch("do-while-body");
            this.loops--;
            this.expect("while");
            this.expect("(");
            const test = this.expression(0);
            this.expect(")");
            this.eat(";");
            return { kind: "do-while", loc, test, body };
        }
        if (this.eat("while")) {
            this.expect("(");
            const test = this.expression(0);
            this.expect(")");
            this.loops++;
            const body = this.branch("while-body");
            this.loops--;
            return { kind: "while", loc, test, body };
        }
        if (this.generatorContext && this.eat("yield")) {
            const statement = this.generatorYield(this.token(this.index - 1));
            this.statementTerminator();
            return statement;
        }
        if (this.at("return") || this.at("throw")) {
            const keyword = this.take();
            const kind = keyword.text === "return" ? "return" : "throw";
            if (kind === "return" && this.functions === 0) {
                if (this.purpose === "return-audit" || this.purpose === "bounded-return-audit") {
                    this.returnCandidates.push({ ruleCode: "return-outside-function", loc, start: keyword.start, end: keyword.end });
                } else this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.return-context" }, "return outside function", loc);
            }
            // Token locations include line terminators hidden inside comments.
            const newline = lineTerminatorBetween(this.source.text, keyword, this.current());
            if (newline && !this.at(";") && !(this.structuralPlan() && kind === "return")) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.line-terminator" }, "newline after return/throw is unsupported", loc);
            }
            const emptyReturn = this.structuralPlan() && kind === "return" && (newline || this.at("}") || this.current().kind === "eof");
            const value = this.at(";") || emptyReturn ? null : this.expression(0);
            if (kind === "throw" && value === null) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.throw-expression" }, "throw requires an expression", loc);
            this.statementTerminator();
            return { kind, loc, value };
        }
        if (this.at("break") || this.at("continue")) {
            const kind = this.take().text === "break" ? "break" : "continue";
            let target: string | undefined;
            if (this.structuralPlan() && this.current().loc.line === loc.line && this.labelIdentifier(this.current())) {
                target = this.take().text;
                let valid = false;
                for (const label of this.labels) if (label.name === target && (kind === "break" || label.iteration)) valid = true;
                if (!valid)
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.loop-context" }, "invalid " + kind + " target: " + target, loc);
            } else if (this.loops === 0 && (kind === "continue" || this.switches === 0))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.loop-context" }, kind + " outside loop", loc);
            this.statementTerminator();
            return target === undefined ? { kind, loc } : { kind, loc, target };
        }
        const expression = this.expression(0);
        this.statementTerminator();
        return { kind: "expression", loc, expression };
    }
    private labelIdentifier(token: Token): boolean {
        return token.kind === "word" && (!RESERVED.includes(" " + token.text + " ") || token.text === "arguments" || token.text === "eval" || token.text === "async" || this.awaitIdentifierAllowed(token.text) || this.yieldIdentifierAllowed(token.text) || (this.boundedPlan() && (token.text === "let" || isStrictReservedIdentifier(token.text))));
    }
    private labelAhead(index: number): boolean {
        return this.labelIdentifier(this.token(index)) && this.token(index + 1)?.kind === "punct" && this.token(index + 1)?.text === ":";
    }
    finishTry(loc: Location, body: TryFinallyStmt["body"]): Stmt {
        if (!this.eat("finally")) return body;
        const finalizer = this.statement();
        if (finalizer.kind !== "block") {
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "finally requires a block", finalizer.loc);
            return { kind: "empty", loc };
        }
        return { kind: "try-finally", loc, body, finalizer };
    }
    forEach(kind: "for-of" | "for-in", loc: Location, start: number, head: ForEachStmt["head"], awaited = false): ForEachStmt {
        if (awaited && kind !== "for-of") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "for-await requires of", loc);
        const iterable = this.expression(kind === "for-in" ? 0 : 1);
        this.expect(")");
        this.loops++;
        const body = this.branch("for-body");
        this.loops--;
        const statement: ForEachStmt = { kind, loc, start, end: this.token(this.index - 1).end, head, iterable, body };
        if (awaited) statement.awaited = true;
        return statement;
    }
    standaloneDeclaration(): Stmt {
        const result = this.declarationList(true, false);
        this.statementTerminator();
        return result.statement ?? { kind: "empty", loc: this.current().loc };
    }
    declarationList(allowIn: boolean, loopHead: boolean): {
        declarationKind: "let" | "const" | "var"; statement: DeclarationStmt | null;
        bindings: ParsedBinding[]; head: ForEachStmt["head"] | null;
    } {
        const keyword = this.take(), kind = keyword.text;
        if (kind !== "let" && kind !== "const" && kind !== "var") throw new Error("invalid declaration kind");
        const declarations: Stmt[] = [], allBindings: ParsedBinding[] = [];
        let hasPattern = false;
        do {
            const token = declarations.length === 0 ? keyword : this.current();
            const bindings: ParsedBinding[] = [];
            if (this.at("[") || this.at("{")) {
                hasPattern = true;
                const pattern = this.at("[") ? this.arrayBindingPattern(bindings) : this.objectBindingPattern(bindings);
                if (kind !== "var") for (const binding of bindings) this.checkLexicalName(binding.site);
                if (loopHead && declarations.length === 0 && (this.at("in") || this.at("of")))
                    return { declarationKind: kind, statement: null, bindings, head: {
                        kind: "pattern", declarationKind: kind, pattern, sites: bindings.map(binding => binding.site) } };
                this.expect("=");
                const initializerStart = this.current().start;
                const init = this.expression(1, allowIn);
                for (const binding of bindings) {
                    binding.init = init;
                    binding.initializer = { start: initializerStart, end: this.token(this.index - 1).end };
                }
                declarations.push({ kind: "pattern-declaration", loc: token.loc, declarationKind: kind, pattern, init });
            } else {
                const binding = this.binding(1, allowIn);
                bindings.push(binding);
                if (kind !== "var") this.checkLexicalName(binding.site);
                if (loopHead && declarations.length === 0 && binding.init === null && (this.at("in") || this.at("of"))) {
                    const head: ForEachStmt["head"] = kind === "var"
                        ? { kind: "var", loc: keyword.loc, declarations: [{ name: binding.site.name, init: null }] }
                        : { kind: "lexical", declarationKind: kind, site: binding.site };
                    this.bindings.set(keyword.start, bindings);
                    return { declarationKind: kind, statement: null, bindings, head };
                }
                if (kind === "const") {
                    if (binding.init === null) {
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "const requires an initializer", token.loc);
                        return { declarationKind: kind, statement: null, bindings: allBindings, head: null };
                    }
                    declarations.push({ kind: "const", loc: token.loc, name: binding.site.name, init: binding.init });
                } else if (kind === "let") declarations.push({ kind: "let", loc: token.loc, name: binding.site.name, init: binding.init });
                else declarations.push({ kind: "var", loc: token.loc, declarations: [{ name: binding.site.name, init: binding.init }] });
            }
            this.bindings.set(token.start, bindings);
            allBindings.push(...bindings);
        } while (this.error === null && this.eat(","));
        let statement: DeclarationStmt;
        if (kind === "var" && !hasPattern) {
            this.bindings.set(keyword.start, allBindings);
            statement = { kind: "var", loc: keyword.loc, declarations: allBindings.map(binding => ({ name: binding.site.name, init: binding.init })) };
        } else {
            const first = declarations[0];
            if (first.kind !== "let" && first.kind !== "const" && first.kind !== "var" && first.kind !== "pattern-declaration") throw new Error("invalid declaration node");
            statement = declarations.length === 1 ? first : { kind: "declaration-list", loc: keyword.loc, declarations };
        }
        return { declarationKind: kind, statement, bindings: allBindings, head: null };
    }
    varDeclaration(allowIn: boolean): VarStmt {
        const token = this.take();
        const bindings: ParsedBinding[] = [];
        do { bindings.push(this.binding(1, allowIn)); } while (this.error === null && this.eat(","));
        this.bindings.set(token.start, bindings);
        return { kind: "var", loc: token.loc, declarations: bindings.map(binding => ({ name: binding.site.name, init: binding.init })) };
    }
    arrayBindingPattern(bindings: ParsedBinding[]): ArrayPattern {
        const loc = this.current().loc;
        const pattern: ArrayPattern = { kind: "array-pattern", loc, elements: [], rest: null };
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return pattern;
        }
        this.expect("[");
        while (this.error === null && !this.at("]")) {
            if (this.eat(",")) { pattern.elements.push(null); continue; }
            const rest = this.eat("...");
            const child = this.bindingPattern(bindings);
            if (rest) { pattern.rest = child; break; }
            const initializer = this.eat("=") ? this.expression(1) : null;
            pattern.elements.push({ pattern: child, initializer });
            if (!this.eat(",")) break;
        }
        this.expect("]");
        this.depth--;
        return pattern;
    }
    bindingName(bindings: ParsedBinding[]): DestructuringPattern {
        const token = this.current();
        const name = this.name();
        const site = { name, start: token.start, end: token.end, loc: token.loc };
        bindings.push({ site, init: null, initializer: null });
        return { kind: "binding", loc: token.loc, site };
    }
    bindingPattern(bindings: ParsedBinding[]): DestructuringPattern {
        if (this.at("[")) return this.arrayBindingPattern(bindings);
        if (this.at("{")) return this.objectBindingPattern(bindings);
        return this.bindingName(bindings);
    }
    objectBindingPattern(bindings: ParsedBinding[]): ObjectPattern {
        const loc = this.current().loc;
        const pattern: ObjectPattern = { kind: "object-pattern", loc, properties: [], rest: null };
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return pattern;
        }
        this.expect("{");
        while (this.error === null && !this.at("}")) {
            if (this.eat("...")) { pattern.rest = this.bindingName(bindings); break; }
            const token = this.current();
            let key: Expr;
            let child: DestructuringPattern;
            const computed = this.eat("[");
            if (computed) {
                key = this.expression(1);
                this.expect("]");
                this.expect(":");
                child = this.bindingPattern(bindings);
            } else {
                if (token.kind !== "word" && token.kind !== "string" && token.kind !== "number" && token.kind !== "bigint")
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected property name", token.loc);
                const name = this.literalPropertyName(token);
                key = { kind: "literal", loc: token.loc, value: name };
                if (this.token(this.index + 1)?.text === ":") {
                    this.take();
                    this.expect(":");
                    child = this.bindingPattern(bindings);
                } else child = this.bindingName(bindings);
            }
            const initializer = this.eat("=") ? this.expression(1) : null;
            pattern.properties.push({ key, ...(computed ? { computed: true as const } : {}), element: { pattern: child, initializer } });
            if (!this.eat(",")) break;
        }
        this.expect("}");
        this.depth--;
        return pattern;
    }
    binding(min: number, allowIn = true): ParsedBinding {
        const token = this.current();
        const name = this.name();
        let init: Expr | null = null;
        let initializer: { start: number; end: number } | null = null;
        if (this.eat("=")) {
            const start = this.current().start;
            init = this.expression(min, allowIn);
            initializer = { start, end: this.token(this.index - 1).end };
        }
        return { site: { name, start: token.start, end: token.end, loc: token.loc }, init, initializer };
    }
    formalParameters(loc: Location, arrow: boolean): { params: string[]; rest: boolean; parameters: FormalParameter[] } {
        this.expect("(");
        const params: string[] = [];
        const parameters: FormalParameter[] = [];
        let rest = false;
        if (!this.at(")")) {
            do {
                rest = this.structuralPlan() && this.eat("...");
                const token = this.current();
                const bindings: ParsedBinding[] = [];
                const pattern = this.structuralPlan() ? this.bindingPattern(bindings) : this.bindingName(bindings);
                for (const binding of bindings) {
                    if (params.includes(binding.site.name) && (arrow || !this.boundedPlan()))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate parameter: " + binding.site.name, loc);
                    params.push(binding.site.name);
                }
                let initializer: Expr | null = null;
                if (this.structuralPlan() && this.eat("=")) {
                    if (rest) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "rest parameter cannot have a default", token.loc);
                    initializer = this.expression(1);
                }
                if (pattern.kind === "binding") parameters.push({ kind: "identifier", site: pattern.site, initializer });
                else if (pattern.kind === "array-pattern" || pattern.kind === "object-pattern")
                    parameters.push({ kind: "pattern", pattern, bindings: bindings.map(binding => binding.site), initializer });
                else throw new Error("invalid formal binding pattern");
                if (rest) break;
            } while (this.error === null && this.eat(",") && !(arrow && this.at(")")));
        }
        this.expect(")");
        if (rest && new Set(params).size !== params.length)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate rest parameter list", loc);
        if ((hasParameterPatterns(parameters) || parameters.some(parameter => parameter.initializer !== null)) && new Set(params).size !== params.length)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate default parameter list", loc);
        return { params, rest, parameters };
    }
    checkParameterDirective(rest: boolean, parameters: FormalParameter[], bodyIndex: number, loc: Location): void {
        if (this.error !== null) return;
        if ((rest || hasParameterPatterns(parameters) || parameters.some(parameter => parameter.initializer !== null)) && scriptPrologue(this.source.text, this.tokens, bodyIndex, false).ownStrict)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "strict directive with non-simple parameters", loc);
    }
    private admitGeneratorExpression(expression: Expr, supported: Set<Stmt | Expr>): void {
        const pending: { expression: Expr; visited: boolean }[] = [{ expression, visited: false }];
        while (pending.length !== 0) {
            const entry = pending.pop()!, node = entry.expression;
            if (node.kind === "yield" || node.kind === "await") {
                supported.add(node);
                if (node.value !== null) pending.push({ expression: node.value, visited: false });
                continue;
            }
            if (node.kind !== "private-in" && node.kind !== "class" && node.kind !== "chain" && node.kind !== "destructure" && node.kind !== "super-call" && node.kind !== "binary" && node.kind !== "conditional" && node.kind !== "unary" && node.kind !== "member" && node.kind !== "call" && node.kind !== "array" && node.kind !== "new" && node.kind !== "template" && node.kind !== "object" && node.kind !== "assign" && node.kind !== "compound" && node.kind !== "update" && node.kind !== "super-member") continue;
            if (!entry.visited) {
                pending.push({ expression: node, visited: true });
                if (node.kind === "class") {
                    if (node.heritage !== null) pending.push({ expression: node.heritage, visited: false });
                    for (const element of node.elements) if (element.kind !== "static-block") pending.push({ expression: element.key, visited: false });
                }
                else if (node.kind === "chain") {
                    pending.push({ expression: node.base, visited: false });
                    for (const link of node.links) {
                        if (link.kind === "member") pending.push({ expression: link.key, visited: false });
                        else for (const arg of link.args) pending.push({ expression: arg.kind === "spread" ? arg.expression : arg, visited: false });
                    }
                }
                else if (node.kind === "destructure") pending.push({ expression: node.value, visited: false });
                else if (node.kind === "super-call") {
                    for (let i = node.args.length - 1; i >= 0; i--) { const arg = node.args[i]; pending.push({ expression: arg.kind === "spread" ? arg.expression : arg, visited: false }); }
                }
                else if (node.kind === "super-member") pending.push({ expression: node.key, visited: false });
                else if (node.kind === "update") {
                    pending.push({ expression: node.target, visited: false });
                }
                else if (node.kind === "assign" || node.kind === "compound") {
                    pending.push({ expression: node.value, visited: false });
                    pending.push({ expression: node.target, visited: false });
                }
                else if (node.kind === "object") {
                    for (let i = node.properties.length - 1; i >= 0; i--) {
                        const property = node.properties[i];
                        pending.push({ expression: property.value, visited: false });
                        if (property.kind !== "spread" && typeof property.key !== "string") pending.push({ expression: property.key, visited: false });
                    }
                } else if (node.kind === "template") {
                    for (let i = node.expressions.length - 1; i >= 0; i--) pending.push({ expression: node.expressions[i], visited: false });
                } else if (node.kind === "array") {
                    for (let i = node.elements.length - 1; i >= 0; i--) {
                        const element = node.elements[i];
                        if (element !== null) pending.push({ expression: element.kind === "spread" ? element.expression : element, visited: false });
                    }
                } else if (node.kind === "call" || node.kind === "new") {
                    pending.push({ expression: node.callee, visited: false });
                    for (let i = node.args.length - 1; i >= 0; i--) { const arg = node.args[i]; pending.push({ expression: arg.kind === "spread" ? arg.expression : arg, visited: false }); }
                } else if (node.kind === "member") pending.push({ expression: node.key, visited: false }, { expression: node.base, visited: false });
                else if (node.kind === "unary") pending.push({ expression: node.operand, visited: false });
                else if (node.kind === "private-in") pending.push({ expression: node.right, visited: false });
                else if (node.kind === "binary") pending.push({ expression: node.right, visited: false }, { expression: node.left, visited: false });
                else pending.push({ expression: node.alternate, visited: false }, { expression: node.consequent, visited: false }, { expression: node.test, visited: false });
            } else if (node.kind === "private-in") {
                if (isSuspendingGeneratorExpression(node.right)) node.suspends = true;
            } else if (node.kind === "class") {
                if (isSuspendingGeneratorExpression(node.heritage) || node.elements.some(element => element.kind !== "static-block" && isSuspendingGeneratorExpression(element.key))) node.suspends = true;
            } else if (node.kind === "chain") {
                if (isSuspendingGeneratorExpression(node.base) || node.links.some(link => link.kind === "member"
                    ? isSuspendingGeneratorExpression(link.key)
                    : link.args.some(arg => isSuspendingGeneratorExpression(arg.kind === "spread" ? arg.expression : arg)))) node.suspends = true;
            } else if (node.kind === "destructure") {
                if (isSuspendingGeneratorExpression(node.value)) node.suspends = true;
            } else if (node.kind === "super-call") {
                if (node.args.some(arg => isSuspendingGeneratorExpression(arg.kind === "spread" ? arg.expression : arg))) node.suspends = true;
            } else if (node.kind === "super-member") {
                if (isSuspendingGeneratorExpression(node.key)) node.suspends = true;
            } else if (node.kind === "update") {
                if (isSuspendingGeneratorExpression(node.target)) node.suspends = true;
            } else if (node.kind === "assign" || node.kind === "compound") {
                if (isSuspendingGeneratorExpression(node.value) || isSuspendingGeneratorExpression(node.target)) {
                    if (node.kind === "assign") node.suspends = true;
                    else node.suspends = true;
                }
            } else if (node.kind === "object") {
                if (node.properties.some(property => isSuspendingGeneratorExpression(property.value) ||
                    (property.kind !== "spread" && typeof property.key !== "string" && isSuspendingGeneratorExpression(property.key)))) node.suspends = true;
            } else if (node.kind === "template") {
                if (node.expressions.some(expression => isSuspendingGeneratorExpression(expression))) node.suspends = true;
            } else if (node.kind === "array") {
                if (node.elements.some(element => element !== null && isSuspendingGeneratorExpression(element.kind === "spread" ? element.expression : element))) node.suspends = true;
            } else if (node.kind === "call" || node.kind === "new") {
                if (isSuspendingGeneratorExpression(node.callee) || node.args.some(arg => isSuspendingGeneratorExpression(arg.kind === "spread" ? arg.expression : arg))) {
                    if (node.kind === "call") node.suspends = true;
                    else node.suspends = true;
                }
            } else if (node.kind === "member") {
                if (isSuspendingGeneratorExpression(node.base) || isSuspendingGeneratorExpression(node.key)) node.suspends = true;
            } else if (node.kind === "unary") {
                if (isSuspendingGeneratorExpression(node.operand)) node.suspends = true;
            } else if (node.kind === "binary") {
                if (isSuspendingGeneratorExpression(node.left) || isSuspendingGeneratorExpression(node.right)) node.suspends = true;
            } else if (isSuspendingGeneratorExpression(node.test) || isSuspendingGeneratorExpression(node.consequent) || isSuspendingGeneratorExpression(node.alternate)) node.suspends = true;
        }
    }
    private admitCatchPattern(pattern: DestructuringPattern, supported: Set<Stmt | Expr>): void {
        const pending: DestructuringPattern[] = [pattern];
        while (pending.length !== 0) {
            const current = pending.pop()!;
            if (current.kind === "array-pattern") {
                for (const element of current.elements) {
                    if (element === null) continue;
                    pending.push(element.pattern);
                    if (element.initializer !== null) this.admitGeneratorExpression(element.initializer, supported);
                }
                if (current.rest !== null) pending.push(current.rest);
            } else if (current.kind === "object-pattern") {
                for (const property of current.properties) {
                    this.admitGeneratorExpression(property.key, supported);
                    pending.push(property.element.pattern);
                    if (property.element.initializer !== null) this.admitGeneratorExpression(property.element.initializer, supported);
                }
                if (current.rest !== null) pending.push(current.rest);
            }
        }
    }
    private admitSuspendingBody(body: Stmt[]): void {
        if (this.generatorYields.length !== 0 || this.awaits.length !== 0) {
            const supported = new Set<Stmt | Expr>();
            const pending = [...body];
            while (pending.length !== 0) {
                const statement = pending.pop()!;
                supported.add(statement);
                if (statement.kind === "class-declaration") this.admitGeneratorExpression(statement.value, supported);
                else if (statement.kind === "yield") this.admitGeneratorExpression(statement, supported);
                else if (statement.kind === "block") pending.push(...statement.body);
                else if (statement.kind === "declaration-list") pending.push(...statement.declarations);
                else if (statement.kind === "labelled") pending.push(statement.body);
                else if (statement.kind === "switch") {
                    this.admitGeneratorExpression(statement.discriminant, supported);
                    for (const clause of statement.caseBlock.clauses) {
                        if (clause.test !== null) this.admitGeneratorExpression(clause.test, supported);
                        pending.push(...clause.body);
                    }
                }
                else if (statement.kind === "while" || statement.kind === "do-while") {
                    this.admitGeneratorExpression(statement.test, supported);
                    pending.push(statement.body);
                } else if (statement.kind === "for" || statement.kind === "for-lexical") {
                    if (statement.kind === "for-lexical") pending.push(statement.initializer);
                    if (statement.kind === "for" && statement.initializer !== null) {
                        if (statement.initializer.kind === "var" || statement.initializer.kind === "pattern-declaration" || statement.initializer.kind === "declaration-list") pending.push(statement.initializer);
                        else this.admitGeneratorExpression(statement.initializer, supported);
                    }
                    if (statement.test !== null) this.admitGeneratorExpression(statement.test, supported);
                    if (statement.update !== null) this.admitGeneratorExpression(statement.update, supported);
                    pending.push(statement.body);
                } else if (statement.kind === "for-of" || statement.kind === "for-in") {
                    this.admitGeneratorExpression(statement.iterable, supported);
                    pending.push(statement.body);
                }
                else if (statement.kind === "try-finally") pending.push(statement.body, statement.finalizer);
                else if (statement.kind === "try-catch") {
                    pending.push(statement.block, statement.handler);
                    if (statement.parameter !== null && "pattern" in statement.parameter)
                        this.admitCatchPattern(statement.parameter.pattern, supported);
                }
                else if (statement.kind === "if") {
                    this.admitGeneratorExpression(statement.test, supported);
                    pending.push(statement.consequent);
                    if (statement.alternate !== null) pending.push(statement.alternate);
                } else if ((statement.kind === "return" || statement.kind === "throw") && statement.value !== null) this.admitGeneratorExpression(statement.value, supported);
                else if ((statement.kind === "let" || statement.kind === "const" || statement.kind === "pattern-declaration") && statement.init !== null) this.admitGeneratorExpression(statement.init, supported);
                else if (statement.kind === "var") {
                    for (const declaration of statement.declarations) if (declaration.init !== null) this.admitGeneratorExpression(declaration.init, supported);
                }
                else if (statement.kind === "expression") {
                    const expression = statement.expression;
                    this.admitGeneratorExpression(expression, supported);
                }
            }
            for (const expression of this.awaits) if (!supported.has(expression))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "await in this expression or control flow is unsupported", expression.loc);
            for (const expression of this.generatorYields) if (!supported.has(expression))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "yield in this expression or control flow is unsupported", expression.loc);
        }
    }
    functionTail(loc: Location, start: number, superContext: SuperContext = "none", generator = false, asynchronous = false): { params: string[]; parameters: FormalParameter[]; body: Stmt[]; source: FunctionSource } {
        const savedYieldReserved = this.yieldIdentifierReserved;
        const savedAwaitReserved = this.awaitIdentifierReserved, savedAwaitCover = this.awaitCoverIdentifiers;
        this.yieldIdentifierReserved = generator;
        this.awaitIdentifierReserved = asynchronous;
        this.awaitCoverIdentifiers = null;
        const savedAsync = this.asyncContext, savedAwaits = this.awaits;
        this.asyncContext = false;
        this.awaits = [];
        const savedGenerator = this.generatorContext, savedYields = this.generatorYields;
        this.generatorContext = false;
        this.generatorYields = [];
        const savedNewTarget = this.newTargetAllowed;
        const savedSuperContext = this.superContext;
        this.superContext = superContext;
        this.newTargetAllowed = true;
        const { params, rest, parameters } = this.formalParameters(loc, false);
        if (generator && new Set(params).size !== params.length)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate generator parameter", loc);
        const bodyLoc = this.current().loc;
        this.expect("{");
        const bodyIndex = this.index;
        const loops = this.loops;
        const switches = this.switches;
        const labels = this.labels;
        this.loops = 0;
        this.switches = 0;
        this.labels = [];
        this.functions++;
        this.generatorContext = generator;
        this.asyncContext = asynchronous;
        const body = this.list(true, params);
        this.admitSuspendingBody(body);
        this.generatorContext = savedGenerator;
        this.generatorYields = savedYields;
        this.asyncContext = savedAsync;
        this.awaits = savedAwaits;
        this.functions--;
        this.loops = loops;
        this.switches = switches;
        this.labels = labels;
        this.newTargetAllowed = savedNewTarget;
        this.superContext = savedSuperContext;
        this.checkParameterDirective(rest, parameters, bodyIndex, loc);
        this.yieldIdentifierReserved = savedYieldReserved;
        this.awaitIdentifierReserved = savedAwaitReserved;
        this.awaitCoverIdentifiers = savedAwaitCover;
        return { params, parameters, body, source: { source: this.source, start, end: this.token(this.index - 1).end, rest, bodyLoc, ...(generator ? { generator: true } : {}) } };
    }
    arrow(allowIn: boolean): Expr {
        const first = this.current();
        const name = this.name();
        return this.arrowBody(first, [name], false, [{ kind: "identifier", site: { name, start: first.start, end: first.end, loc: first.loc }, initializer: null }], allowIn);
    }
    private arrowBody(first: Token, params: string[], rest: boolean, parameters: FormalParameter[], allowIn: boolean, asynchronous = false): Expr {
        const savedYieldReserved = this.yieldIdentifierReserved;
        const savedAwaitReserved = this.awaitIdentifierReserved, savedAwaitCover = this.awaitCoverIdentifiers;
        this.yieldIdentifierReserved = false;
        this.awaitIdentifierReserved = asynchronous;
        this.awaitCoverIdentifiers = null;
        const savedAsync = this.asyncContext, savedAwaits = this.awaits;
        this.asyncContext = asynchronous;
        this.awaits = [];
        const savedGenerator = this.generatorContext, savedYields = this.generatorYields;
        this.generatorContext = false;
        this.generatorYields = [];
        if (this.current().loc.line !== this.token(this.index - 1).loc.line)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "line terminator before arrow", this.current().loc);
        this.expect("=>");
        const loops = this.loops, switches = this.switches;
        const labels = this.labels;
        this.loops = 0;
        this.switches = 0;
        this.labels = [];
        this.functions++;
        const bodyLoc = this.current().loc;
        const expressionBody = !this.eat("{");
        const bodyIndex = this.index;
        const body: Stmt[] = expressionBody
            ? [{ kind: "return", loc: this.current().loc, value: this.expression(1, allowIn) }]
            : this.list(true, params);
        this.admitSuspendingBody(body);
        this.awaits = savedAwaits;
        this.functions--;
        this.loops = loops;
        this.switches = switches;
        this.labels = labels;
        this.generatorContext = savedGenerator;
        this.generatorYields = savedYields;
        this.asyncContext = savedAsync;
        if (!expressionBody) this.checkParameterDirective(rest, parameters, bodyIndex, first.loc);
        this.yieldIdentifierReserved = savedYieldReserved;
        this.awaitIdentifierReserved = savedAwaitReserved;
        this.awaitCoverIdentifiers = savedAwaitCover;
        const source: FunctionSource = { source: this.source, start: first.start, end: this.token(this.index - 1).end, arrow: true, expressionBody, rest, bodyLoc, ...(asynchronous ? { async: true } : {}) };
        return { kind: "function", loc: first.loc, params, parameters, body, source };
    }
    taggedTemplate(callee: Expr): Expr {
        const first = this.take();
        if (first.cooked === undefined || first.raw === undefined) throw new Error("template token lacks values");
        const site: TemplateObjectExpr = { kind: "template-object", loc: first.loc, cooked: [first.cooked], raw: [first.raw] };
        const args: Argument[] = [site];
        if (first.kind === "template-head") {
            while (this.error === null) {
                args.push(this.expression(0));
                const part = this.take();
                if (part.kind !== "template-middle" && part.kind !== "template-tail") {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "expected template continuation", part.loc);
                    break;
                }
                if (part.cooked === undefined || part.raw === undefined) throw new Error("template token lacks values");
                site.cooked.push(part.cooked);
                site.raw.push(part.raw);
                if (part.kind === "template-tail") break;
            }
        }
        return { kind: "call", tagged: true, loc: callee.loc, callee, args };
    }
    templateCooked(token: Token): string {
        if (token.cooked === undefined) throw new Error("template token lacks cooked text");
        if (token.cooked === null) {
            this.fail({ kind: "unsupported-syntax", capabilityCode: "lex.string-escape" }, "invalid template escape", token.loc);
            return "";
        }
        return token.cooked;
    }
    chainLink(base: Expr, link: ChainLink): Expr {
        if (base.kind === "chain" && !this.parenthesized.has(base)) { base.links.push(link); return base; }
        return { kind: "chain", loc: base.loc, base, links: [link] };
    }
    precedence(op: string): number {
        if (this.structuralPlan() && ["**=", "&=", "|=", "^=", "<<=", ">>=", ">>>=", "&&=", "||=", "??="].includes(op)) return 1;
        if (op === "=" || op === "+=" || op === "-=" || op === "*=" || op === "/=" || op === "%=") return 1;
        if (op === "?") return 2;
        if (op === "||" || (this.structuralPlan() && op === "??")) return 3;
        if (op === "&&") return 4;
        if (this.structuralPlan() && op === "|") return 5;
        if (this.structuralPlan() && op === "^") return 6;
        if (this.structuralPlan() && op === "&") return 7;
        if (op === "===" || op === "!==" || op === "==" || op === "!=") return 8;
        if (op === "<" || op === ">" || op === "<=" || op === ">=" || op === "in" || op === "instanceof") return 9;
        if (this.structuralPlan() && (op === "<<" || op === ">>" || op === ">>>")) return 10;
        if (op === "+" || op === "-") return 11;
        if (op === "*" || op === "/" || op === "%") return 12;
        if (this.structuralPlan() && op === "**") return 13;
        return 0;
    }
    private deferNumericTarget(target: Expr, operator: Token): boolean {
        if (this.error !== null || this.purpose !== "bounded-numeric-assignment-audit") return false;
        const numeric = this.numericTokens.get(target), op = operator.text;
        if (numeric === undefined) return false;
        if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=" && op !== "%=" &&
            op !== "**=" && op !== "&=" && op !== "|=" && op !== "^=" && op !== "<<=" && op !== ">>=" &&
            op !== ">>>=" && op !== "&&=" && op !== "||=" && op !== "??=" && op !== "++" && op !== "--") return false;
        // Continued audit trees have no retained or executable authority.
        this.numericCandidates.push({ ruleCode: "assignment-target",
            target: { text: this.source.text.slice(numeric.start, numeric.end), start: numeric.start, end: numeric.end,
                loc: { line: numeric.loc.line, column: numeric.loc.column } },
            operator: { text: op, start: operator.start, end: operator.end,
                loc: { line: operator.loc.line, column: operator.loc.column } } });
        return true;
    }
    expression(min: number, allowIn = true): Expr {
        const loc = this.current().loc;
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return { kind: "literal", loc, value: null };
        }
        const singleArrow = this.structuralPlan() && min <= 1 && this.current().kind === "word" && this.token(this.index + 1)?.text === "=>";
        const privateIn = this.privateSyntaxEnabled && this.current().kind === "private-identifier" && allowIn && min <= 9;
        let left: Expr;
        if (privateIn) {
            const name = this.privateName(this.take(), true);
            this.expect("in");
            left = { kind: "private-in", loc, name, right: this.expression(10, allowIn) };
        } else left = singleArrow ? this.arrow(allowIn) : this.primary(allowIn, min <= 1);
        const arrow = singleArrow || (left.kind === "function" && left.source?.arrow === true && !this.parenthesized.has(left));
        // A unary operand may already have consumed the postfix token. Its
        // enclosing expression must not reopen the member/call suffix chain.
        const lastPrimaryToken = this.token(this.index - 1);
        let updated = privateIn || (lastPrimaryToken.kind === "punct" && (lastPrimaryToken.text === "++" || lastPrimaryToken.text === "--"));
        while (this.error === null) {
            if (arrow && !(min === 0 && this.at(","))) break;
            if (this.current().kind === "template" || this.current().kind === "template-head") {
                if (updated || !this.structuralPlan() || (left.kind === "chain" && !this.parenthesized.has(left))) {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "invalid template tag", this.current().loc);
                    break;
                }
                left = this.taggedTemplate(left);
                continue;
            }
            if (!updated && this.structuralPlan() && this.eat("?.")) {
                const linkLoc = this.token(this.index - 1).loc;
                if (this.eat("(")) {
                    const args: Argument[] = [];
                    if (!this.at(")")) do { args.push(this.argument()); } while (this.error === null && this.eat(",") && !this.at(")"));
                    this.expect(")");
                    left = this.chainLink(left, { kind: "call", loc: linkLoc, optional: true, args });
                } else {
                    let key: Expr;
                    if (this.eat("[")) { key = this.expression(0); this.expect("]"); }
                    else {
                        const token = this.take();
                        if (this.privateSyntaxEnabled && token.kind === "private-identifier") key = this.privateName(token, true);
                        else {
                            if (token.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected optional property name", token.loc);
                            key = { kind: "literal", loc: token.loc, value: token.text };
                        }
                    }
                    left = this.chainLink(left, { kind: "member", loc: linkLoc, optional: true, key });
                }
                continue;
            }
            if (!updated && this.eat(".")) {
                const key = this.take();
                if (key.kind !== "word" && !(this.privateSyntaxEnabled && key.kind === "private-identifier")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected property name", key.loc);
                const property: Expr = key.kind === "private-identifier" ? this.privateName(key, true) : { kind: "literal", loc: key.loc, value: key.text };
                left = left.kind === "chain" && !this.parenthesized.has(left)
                    ? this.chainLink(left, { kind: "member", loc, optional: false, key: property })
                    : { kind: "member", loc, base: left, key: property };
                continue;
            }
            if (!updated && this.eat("[")) {
                const key = this.expression(0);
                this.expect("]");
                left = left.kind === "chain" && !this.parenthesized.has(left)
                    ? this.chainLink(left, { kind: "member", loc, optional: false, key })
                    : { kind: "member", loc, base: left, key };
                continue;
            }
            if (!updated && this.eat("(")) {
                const args: Argument[] = [];
                if (!this.at(")")) {
                    do {
                        args.push(this.argument());
                    } while (this.error === null && this.eat(",") && !(this.structuralPlan() && this.at(")")));
                }
                this.expect(")");
                left = left.kind === "chain" && !this.parenthesized.has(left)
                    ? this.chainLink(left, { kind: "call", loc, optional: false, args })
                    : { kind: "call", loc, callee: left, args };
                continue;
            }
            if (!updated && this.structuralPlan() && (this.at("++") || this.at("--"))) {
                const previous = this.token(this.index - 1);
                if (lineTerminatorBetween(this.source.text, previous, this.current())) break;
                const increment = this.take();
                const operation = increment.text === "++" ? "increment" : "decrement";
                if (left.kind !== "identifier" && left.kind !== "member" && left.kind !== "super-member" && !this.deferNumericTarget(left, increment)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid " + operation + " target", left.loc);
                left = { kind: "update", loc: left.loc, target: left, op: increment.text === "++" ? "++" : "--", prefix: false };
                updated = true;
                continue;
            }
            const op = this.current().escaped === true ? "" : this.current().text;
            if (op === "," && this.current().kind === "punct" && this.structuralPlan() && min === 0) {
                this.take();
                left = { kind: "binary", loc, op, left, right: this.expression(1, allowIn) };
                continue;
            }
            if (!allowIn && op === "in") break;
            const operator = this.current().kind === "punct" || (this.current().kind === "word" && (op === "in" || (this.structuralPlan() && op === "instanceof")));
            const precedence = operator ? this.precedence(op) : 0;
            if (precedence === 0 || precedence < min) break;
            const operatorToken = this.take();
            if (op === "?") {
                // Both arms are AssignmentExpressions. Parsing them at assignment
                // precedence also makes nested conditionals associate to the right.
                const consequent = this.expression(1);
                this.expect(":");
                const alternate = this.expression(1, allowIn);
                left = { kind: "conditional", loc, test: left, consequent, alternate };
                continue;
            }
            if (op === "**" && (left.kind === "unary" || left.kind === "await") && !this.parenthesized.has(left))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unparenthesized unary exponentiation base", left.loc);
            const right = this.expression(precedence === 1 || op === "**" ? precedence : precedence + 1, allowIn);
            if (op === "??" || op === "&&" || op === "||") {
                for (const operand of [left, right]) {
                    if (operand.kind !== "binary" || this.parenthesized.has(operand)) continue;
                    if ((op === "??" && (operand.op === "&&" || operand.op === "||")) ||
                        (op !== "??" && operand.op === "??"))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "nullish and logical operators require parentheses", operatorToken.loc);
                }
            }
            if (precedence === 1) {
                if (op === "=" && (left.kind === "array" || left.kind === "object") && this.structuralPlan() && !this.isParenthesized(left)) {
                    const pattern = this.assignmentPattern(left);
                    if (pattern.kind !== "array-pattern" && pattern.kind !== "object-pattern") throw new Error("assignment pattern invariant");
                    left = { kind: "destructure", loc, pattern, value: right };
                    continue;
                }
                if (left.kind !== "identifier" && left.kind !== "member" && left.kind !== "super-member") {
                    if (!this.deferNumericTarget(left, operatorToken))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid assignment target", loc);
                }
                if (op === "=") {
                    const eligible = left.kind === "identifier" && !this.parenthesized.has(left);
                    left = { kind: "assign", loc, target: left, value: right };
                    if (this.structuralPlan()) this.assignmentNameEligible.set(left, eligible);
                }
                else {
                    let binaryOp: "+" | "-" | "*" | "/" | "%" | "**" | "&" | "|" | "^" | "<<" | ">>" | ">>>" | "&&" | "||" | "??" = "+";
                    if (op === "-=") binaryOp = "-";
                    else if (op === "*=") binaryOp = "*";
                    else if (op === "/=") binaryOp = "/";
                    else if (op === "%=") binaryOp = "%";
                    else if (op === "**=") binaryOp = "**";
                    else if (op === "&=") binaryOp = "&";
                    else if (op === "|=") binaryOp = "|";
                    else if (op === "^=") binaryOp = "^";
                    else if (op === "<<=") binaryOp = "<<";
                    else if (op === ">>=") binaryOp = ">>";
                    else if (op === ">>>=") binaryOp = ">>>";
                    else if (op === "&&=") binaryOp = "&&";
                    else if (op === "||=") binaryOp = "||";
                    else if (op === "??=") binaryOp = "??";
                    const eligible = left.kind === "identifier" && !this.parenthesized.has(left);
                    left = { kind: "compound", loc, target: left, value: right, op: binaryOp };
                    if (binaryOp === "&&" || binaryOp === "||" || binaryOp === "??") this.assignmentNameEligible.set(left, eligible);
                }
            } else left = { kind: "binary", loc, op, left, right };
        }
        this.depth--;
        return left;
    }
    private classDefinition(loc: Location, start: number, declaration: boolean): ClassExpr {
        let name: DeclarationSite | null = null;
        if (!this.at("{") && !this.at("extends")) {
            const token = this.current();
            const text = this.name();
            name = { name: text, start: token.start, end: token.end, loc: token.loc };
        }
        if (declaration && name === null) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "class declaration requires a name", loc);
        const heritage = this.eat("extends") ? this.expression(14) : null;
        if (heritage !== null && !this.parenthesized.has(heritage) && (heritage.kind === "unary" || heritage.kind === "update"))
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "class heritage requires a left-hand-side expression", heritage.loc);
        this.expect("{");
        const outerPrivate = this.privateScope;
        if (this.privateSyntaxEnabled) {
            this.privateScope = new PrivateSyntaxScope(outerPrivate);
            this.privateScopes.push(this.privateScope);
        }
        const elements: ClassElement[] = [];
        let constructorMethod: Extract<Expr, { kind: "function" }> | null = null;
        while (!this.at("}") && this.error === null) {
            if (this.eat(";")) continue;
            if (this.at("static") && this.token(this.index + 1).text === "{") {
                elements.push(this.classStaticBlock());
                continue;
            }
            let isStatic = false;
            if (this.at("static") && !["(", ";", "}", "="].includes(this.token(this.index + 1).text)) { this.take(); isStatic = true; }
            const first = this.current();
            const asynchronous = this.asyncMethodAhead();
            if (asynchronous) this.take();
            const generator = this.eat("*");

            let kind: "method" | "get" | "set" = "method";
            const nextKey = this.token(this.index + 1);
            if (!generator && !asynchronous && (this.at("get") || this.at("set")) &&
                (nextKey.text === "[" || nextKey.kind === "word" || nextKey.kind === "string" || nextKey.kind === "number" || nextKey.kind === "bigint" ||
                    (this.privateSyntaxEnabled && nextKey.kind === "private-identifier"))) kind = this.take().text === "get" ? "get" : "set";
            const token = this.current();
            let key: Expr;
            let literalName: string | null = null;
            if (this.privateSyntaxEnabled && token.kind === "private-identifier") { this.take(); key = this.privateName(token, false); }
            else if (this.eat("[")) { key = this.expression(1); this.expect("]"); }
            else {
                this.take();
                if (token.kind !== "word" && token.kind !== "string" && token.kind !== "number" && token.kind !== "bigint")
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected class method name", token.loc);
                literalName = this.literalPropertyName(token);
                key = { kind: "literal", loc: token.loc, value: literalName };
            }
            if (!this.at("(")) {
                if (generator || asynchronous || kind !== "method") {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "invalid class field or unsupported static block", this.current().loc);
                    break;
                }
                if (literalName === "constructor" || (isStatic && literalName === "prototype"))
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "invalid class field name", token.loc);
                const initializer = this.eat("=") ? this.classFieldInitializer() : null;
                this.statementTerminator();
                if (key.kind === "private-name") this.privateScope.declare(key, "field", isStatic);
                elements.push({ kind: "field", isStatic, key, initializer });
                continue;
            }
            const fn = this.functionTail(first.loc, first.start, heritage !== null && !isStatic && literalName === "constructor" && kind === "method" ? "derived" : "method", generator, asynchronous);
            if ((kind === "get" && fn.parameters.length !== 0) || (kind === "set" && (fn.parameters.length !== 1 || fn.source.rest === true)))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "invalid class accessor parameters", first.loc);
            if (new Set(fn.params).size !== fn.params.length)
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate class method parameter", first.loc);
            const methodSource: FunctionSource = asynchronous ? { ...fn.source, async: true } : fn.source;
            const value: Extract<Expr, { kind: "function" }> = { kind: "function", loc: first.loc, params: fn.params, parameters: fn.parameters, body: fn.body,
                source: { ...methodSource, method: true } };
            if (!isStatic && literalName === "constructor") {
                if (generator || asynchronous || kind !== "method" || constructorMethod !== null) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "invalid or duplicate constructor", first.loc);
                constructorMethod = value;
            } else if (isStatic && literalName === "prototype") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "static prototype method is invalid", first.loc);
            if (key.kind === "private-name") {
                this.privateScope.declare(key, kind, isStatic);
            }
            elements.push({ kind, isStatic, key, value });
        }
        this.expect("}");
        this.privateScope = outerPrivate;
        return { kind: "class", loc, source: this.source, start, end: this.token(this.index - 1).end, name, heritage, constructorMethod, elements };
    }
    private classStaticBlock(): ClassStaticBlock {
        const savedYieldReserved = this.yieldIdentifierReserved;
        const savedAwaitReserved = this.awaitIdentifierReserved, savedAwaitCover = this.awaitCoverIdentifiers;
        this.yieldIdentifierReserved = false;
        this.awaitIdentifierReserved = true;
        this.awaitCoverIdentifiers = null;
        const first = this.take();
        this.expect("{");
        const functions = this.functions, loops = this.loops, switches = this.switches, labels = this.labels;
        const asynchronous = this.asyncContext, awaits = this.awaits, generator = this.generatorContext, yields = this.generatorYields;
        const target = this.newTargetAllowed, superContext = this.superContext;
        this.functions = 0;
        this.loops = 0;
        this.switches = 0;
        this.labels = [];
        this.asyncContext = true;
        this.awaits = [];
        this.generatorContext = false;
        this.generatorYields = [];
        this.newTargetAllowed = true;
        this.superContext = "method";
        const body = this.list(true, []);
        if (this.awaits.length !== 0) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "await is forbidden in a static block", this.awaits[0].loc);
        this.functions = functions;
        this.loops = loops;
        this.switches = switches;
        this.labels = labels;
        this.asyncContext = asynchronous;
        this.awaits = awaits;
        this.generatorContext = generator;
        this.generatorYields = yields;
        this.newTargetAllowed = target;
        this.superContext = superContext;
        this.yieldIdentifierReserved = savedYieldReserved;
        this.awaitIdentifierReserved = savedAwaitReserved;
        this.awaitCoverIdentifiers = savedAwaitCover;
        return { kind: "static-block", isStatic: true, loc: first.loc, start: first.start, end: this.token(this.index - 1).end, body };
    }
    private classFieldInitializer(): ClassFieldInitializer {
        const savedYieldReserved = this.yieldIdentifierReserved;
        const savedAwaitReserved = this.awaitIdentifierReserved, savedAwaitCover = this.awaitCoverIdentifiers;
        this.yieldIdentifierReserved = false;
        this.awaitIdentifierReserved = false;
        this.awaitCoverIdentifiers = null;
        const first = this.current();
        const savedAsync = this.asyncContext, savedGenerator = this.generatorContext;
        const savedTarget = this.newTargetAllowed, savedSuper = this.superContext;
        this.asyncContext = false;
        this.generatorContext = false;
        this.newTargetAllowed = true;
        this.superContext = "method";
        const value = this.expression(1);
        this.asyncContext = savedAsync;
        this.generatorContext = savedGenerator;
        this.newTargetAllowed = savedTarget;
        this.superContext = savedSuper;
        this.yieldIdentifierReserved = savedYieldReserved;
        this.awaitIdentifierReserved = savedAwaitReserved;
        this.awaitCoverIdentifiers = savedAwaitCover;
        return { kind: "field-initializer", loc: first.loc, start: first.start, end: this.token(this.index - 1).end, value };
    }
    private objectExpression(loc: Location): Expr {
        const properties: ObjectProperty[] = [];
        let prototypeSetter = false;
        const cover: ObjectCover = { entries: [], trailingComma: false, unsupported: null };
        while (!this.at("}") && this.error === null) {
            if (this.at("...")) {
                const spread = this.take();
                const value = this.expression(1);
                cover.entries.push({ kind: "rest", value });
                properties.push({ kind: "spread", loc: spread.loc, value });
            } else {
                const first = this.current();
                const asynchronous = this.asyncMethodAhead();
                if (asynchronous) this.take();
                const generator = this.eat("*");

                let kind: "data" | "get" | "set" | "prototype" = "data";
                let key: Expr;
                let name = "";
                let shorthand = false;
                let legacyLiteral = false;
                if (!generator && !asynchronous && (this.at("get") || this.at("set")) && ![":", "(", "=", ",", "}"].includes(this.token(this.index + 1).text))
                    kind = this.take().text === "get" ? "get" : "set";
                const computed = this.at("[");
                if (this.eat("[")) {
                    key = this.expression(1);
                    this.expect("]");
                } else {
                    const token = this.take();
                    if (token.kind !== "word" && token.kind !== "string" && token.kind !== "number" && token.kind !== "bigint")
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected literal property name", token.loc);
                    name = this.literalPropertyName(token);
                    key = { kind: "literal", loc: token.loc, value: name };
                    legacyLiteral = token.legacyNumeric === true || token.legacyEscape === true;
                    shorthand = token.kind === "word" && (!RESERVED.includes(" " + name + " ") || name === "arguments" || name === "eval" || name === "async" || this.awaitIdentifierAllowed(name) || this.yieldIdentifierAllowed(name) || (this.boundedPlan() && (name === "let" || isStrictReservedIdentifier(name))));
                }
                if (this.at("(")) {
                    const fn = this.functionTail(first.loc, first.start, "method", generator, asynchronous);
                    if ((kind === "get" && fn.parameters.length !== 0) || (kind === "set" && (fn.parameters.length !== 1 || fn.source.rest === true)))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "invalid accessor parameter list", first.loc);
                    if (new Set(fn.params).size !== fn.params.length)
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate method parameter", first.loc);
                    const methodSource: FunctionSource = asynchronous ? { ...fn.source, async: true } : fn.source;
                    const value: Expr = { kind: "function", loc: first.loc, params: fn.params, parameters: fn.parameters, body: fn.body,
                        source: { ...methodSource, method: true } };
                    properties.push({ kind, key: computed || legacyLiteral ? key : name, value });
                    cover.entries.push({ kind: "method", key, value });
                } else {
                    if (generator || asynchronous || kind !== "data") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected accessor parameter list", first.loc);
                    let value: Expr;
                    if (this.eat(":")) {
                        value = this.expression(1);
                        if (!computed && name === "__proto__") {
                            if (prototypeSetter) cover.unsupported ??= { reason: { kind: "unsupported-syntax", capabilityCode: "parse.prototype-literal" }, message: "duplicate prototype setter", loc: key.loc };
                            prototypeSetter = true;
                            kind = "prototype";
                        }
                    } else {
                        if (!shorthand) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected property value", first.loc);
                        this.recordAwaitIdentifier(name, first.loc);
                        value = { kind: "identifier", loc: first.loc, name };
                        if (this.at("=")) {
                        cover.unsupported ??= { reason: { kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, message: "expected ':', found '" + this.current().text + "'", loc: this.current().loc };
                            this.take();
                            value = { kind: "assign", loc: first.loc, target: value, value: this.expression(1) };
                        }
                    }
                    properties.push({ kind, key: computed || legacyLiteral ? key : name, value });
                    cover.entries.push({ kind: "data", key, ...(computed ? { computed: true as const } : {}), value });
                }
            }
            if (!this.eat(",")) break;
            cover.trailingComma = this.at("}");
        }
        this.expect("}");
        return this.retainObjectCover({ kind: "object", loc, properties }, cover);
    }
    // Keep the collection key at its declared Expr type for scriptc (TS-152 reduction).
    private isParenthesized(expr: Expr): boolean { return this.parenthesized.has(expr); }
    private objectCover(expr: Expr): ObjectCover | undefined { return this.objectCovers.get(expr); }
    private consumeObjectCover(expr: Expr): void { this.objectCovers.delete(expr); }
    private retainObjectCover(expr: Expr, cover: ObjectCover): Expr { this.objectCovers.set(expr, cover); return expr; }
    private assignmentElement(expr: Expr): PatternElement {
        if ((expr.kind === "assign" || expr.kind === "destructure") && !this.isParenthesized(expr))
            return { pattern: expr.kind === "assign" ? this.assignmentPattern(expr.target) : expr.pattern, initializer: expr.value };
        return { pattern: this.assignmentPattern(expr), initializer: null };
    }
    assignmentPattern(expr: Expr): DestructuringPattern {
        if (expr.kind === "object" && !this.isParenthesized(expr)) {
            const cover = this.objectCover(expr);
            if (cover === undefined) throw new Error("object cover invariant");
            this.consumeObjectCover(expr);
            const pattern: ObjectPattern = { kind: "object-pattern", loc: expr.loc, properties: [], rest: null };
            for (let i = 0; i < cover.entries.length; i++) {
                const entry = cover.entries[i];
                if (entry.kind === "rest") {
                    if (i !== cover.entries.length - 1 || cover.trailingComma || (entry.value.kind !== "identifier" && entry.value.kind !== "member" && entry.value.kind !== "super-member"))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid object rest target", entry.value.loc);
                    pattern.rest = this.assignmentPattern(entry.value);
                } else {
                    if (entry.kind === "method") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "method in assignment pattern", entry.value.loc);
                    pattern.properties.push({ key: entry.key, ...(entry.computed === true ? { computed: true as const } : {}), element: this.assignmentElement(entry.value) });
                }
            }
            return pattern;
        }
        if (expr.kind === "array" && !this.parenthesized.has(expr)) {
            const elements: (PatternElement | null)[] = [];
            let rest: DestructuringPattern | null = null;
            for (let i = 0; i < expr.elements.length; i++) {
                const item = expr.elements[i];
                if (item === null) { elements.push(null); continue; }
                if (item.kind === "spread") {
                    if (i !== expr.elements.length - 1 || this.arrayTrailingCommas.has(expr))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "rest must end an assignment pattern", item.loc);
                    rest = this.assignmentPattern(item.expression);
                } else elements.push(this.assignmentElement(item));
            }
            return { kind: "array-pattern", loc: expr.loc, elements, rest };
        }
        if (expr.kind !== "identifier" && expr.kind !== "member" && expr.kind !== "super-member")
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid destructuring target", expr.loc);
        return { kind: "target", loc: expr.loc, target: expr,
            inferredName: expr.kind === "identifier" && !this.parenthesized.has(expr) ? expr.name : null };
    }
    argument(): Argument {
        if (this.structuralPlan() && this.eat("...")) {
            const spread = this.token(this.index - 1);
            return { kind: "spread", loc: spread.loc, expression: this.expression(1) };
        }
        return this.expression(1);
    }
    private coverBinding(pattern: DestructuringPattern, bindings: DeclarationSite[]): DestructuringPattern {
        if (pattern.kind === "target") {
            const target = pattern.target;
            if (target.kind !== "identifier" || this.isParenthesized(target)) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "expected binding identifier", target.loc);
                return pattern;
            }
            let low = 0, high = this.index;
            while (low < high) {
                const middle = Math.floor((low + high) / 2), loc = this.tokens[middle].loc;
                if (loc.line < target.loc.line || (loc.line === target.loc.line && loc.column < target.loc.column)) low = middle + 1;
                else high = middle;
            }
            const token = this.tokens[low];
            if (token.loc.line !== target.loc.line || token.loc.column !== target.loc.column)
                throw new Error("missing cover binding token");
            const site = { name: target.name, start: token.start, end: token.end, loc: token.loc };
            bindings.push(site);
            return { kind: "binding", loc: target.loc, site };
        }
        if (pattern.kind === "array-pattern") return { ...pattern,
            elements: pattern.elements.map(element => element === null ? null :
                { ...element, pattern: this.coverBinding(element.pattern, bindings) }),
            rest: pattern.rest === null ? null : this.coverBinding(pattern.rest, bindings) };
        if (pattern.kind === "object-pattern") return { ...pattern,
            properties: pattern.properties.map(property => ({ ...property,
                element: { ...property.element, pattern: this.coverBinding(property.element.pattern, bindings) } })),
            rest: pattern.rest === null ? null : this.coverBinding(pattern.rest, bindings) };
        throw new Error("unexpected binding in expression cover");
    }
    private parenthesizedExpression(first: Token, allowIn: boolean, allowArrow: boolean, asyncPrefix: Token | null = null): Expr {
        const outerAwaitCover = this.awaitCoverIdentifiers;
        const asyncAwaitCover: Location[] = [];
        if (asyncPrefix !== null) this.awaitCoverIdentifiers = asyncAwaitCover;
        const values: { value: Expr; token: Token; spread: boolean }[] = [];
        let rest = false, trailingComma = false;
        while (this.error === null && !this.at(")")) {
            rest = this.eat("...");
            const token = this.current();
            values.push({ value: this.expression(1), token, spread: rest });
            if ((rest && asyncPrefix === null) || !this.eat(",")) break;
            trailingComma = this.at(")");
        }
        this.expect(")");
        this.awaitCoverIdentifiers = outerAwaitCover;
        if (allowArrow && this.at("=>")) {
            if (asyncPrefix !== null && asyncAwaitCover.length !== 0)
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "await is reserved in async parameters", asyncAwaitCover[0]);
            const params: string[] = [], parameters: FormalParameter[] = [];
            for (let i = 0; i < values.length; i++) {
                const { value, token, spread } = values[i];
                if (spread && (i !== values.length - 1 || trailingComma))
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "rest parameter must be last", token.loc);
                if (this.isParenthesized(value)) {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "parenthesized arrow parameter", token.loc);
                    continue;
                }
                const initializer = value.kind === "assign" || value.kind === "destructure" ? value.value : null;
                const target = value.kind === "assign" ? value.target : value;
                if (value.kind !== "destructure" && target.kind !== "identifier" && target.kind !== "array" && target.kind !== "object") {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "expected binding identifier", token.loc);
                    continue;
                }
                const bindings: DeclarationSite[] = [];
                const pattern = this.coverBinding(value.kind === "destructure" ? value.pattern : this.assignmentPattern(target), bindings);
                for (const site of bindings) {
                    if (params.includes(site.name))
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate arrow parameter: " + site.name, first.loc);
                    params.push(site.name);
                }
                if (rest && i === values.length - 1 && initializer !== null)
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "rest parameter cannot have a default", token.loc);
                if (pattern.kind === "binding") parameters.push({ kind: "identifier", site: pattern.site, initializer });
                else if (pattern.kind === "array-pattern" || pattern.kind === "object-pattern")
                    parameters.push({ kind: "pattern", pattern, bindings, initializer });
            }
            return this.arrowBody(asyncPrefix ?? first, params, rest, parameters, allowIn, asyncPrefix !== null);
        }
        if (asyncPrefix !== null) {
            // A call retains the enclosing cover's grammar; an arrow starts its own body context.
            if (outerAwaitCover !== null) for (const loc of asyncAwaitCover) outerAwaitCover.push(loc);
            const args: Argument[] = values.map(entry => entry.spread ? { kind: "spread", loc: entry.token.loc, expression: entry.value } : entry.value);
            return { kind: "call", loc: asyncPrefix.loc, callee: { kind: "identifier", loc: asyncPrefix.loc, name: "async" }, args };
        }
        if (values.length === 0 || rest || trailingComma)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "invalid parenthesized expression", first.loc);
        let value: Expr = values.length === 0 ? { kind: "literal", loc: first.loc, value: null } : values[0].value;
        for (let i = 1; i < values.length; i++) value = { kind: "binary", loc: value.loc, op: ",", left: value, right: values[i].value };
        this.parenthesized.set(value, true);
        return value;
    }
    private regexpLiteral(slash: Token): Expr {
        if (this.lexer === null) throw new Error("RegExp literal requires incremental lexing");
        const token = this.lexer.rescanRegExp(slash);
        if (token.regexp === undefined) return { kind: "literal", loc: slash.loc, value: null };
        const { pattern, flags } = token.regexp;
        const result = validateRegExpLiteral(pattern, flags);
        if (result.kind === "syntax-error") this.regexpError ??= { phase: "parse", name: "SyntaxError", message: result.message, loc: token.loc };
        else if (result.kind === "unsupported") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.regexp-pattern" }, result.message, token.loc);
        else if (result.kind === "resource-limit") this.fail(result.origin, result.message, token.loc);
        return { kind: "regexp", loc: token.loc, pattern, flags };
    }
    private generatorYield(keyword: Token): GeneratorYieldStmt {
        const loc = keyword.loc;
        const newline = lineTerminatorBetween(this.source.text, keyword, this.current());
        const delegate = !newline && this.eat("*");
        const empty = (!delegate && newline) || [";", "}", ")", "]", ","].includes(this.current().text) || this.current().kind === "eof";
        if (delegate && empty) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "yield delegation requires an operand", loc);
        const value = empty ? null : this.expression(1);
        const expression: GeneratorYieldStmt = { kind: "yield", loc, value, ...(delegate ? { delegate: true as const } : {}) };
        this.generatorYields.push(expression);
        return expression;
    }
    primary(allowIn: boolean, allowArrow = false): Expr {
        const t = this.take();
        const loc = t.loc;
        if (t.escaped === true && !this.labelIdentifier(t)) {
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "reserved identifier: " + t.text, loc);
            return { kind: "literal", loc, value: null };
        }
        if (this.structuralPlan() && allowArrow && t.escaped !== true && t.text === "async" && t.loc.line === this.current().loc.line) {
            if (this.current().kind === "word" && this.token(this.index + 1).text === "=>") {
                const parameter = this.current(), name = this.name();
                if (name === "await") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "await is reserved in async parameters", parameter.loc);
                return this.arrowBody(t, [name], false, [{ kind: "identifier", site: { name, start: parameter.start, end: parameter.end, loc: parameter.loc }, initializer: null }], allowIn, true);
            }
            if (this.at("(")) { const first = this.take(); return this.parenthesizedExpression(first, allowIn, true, t); }
        }
        if (this.asyncContext && t.text === "await") {
            const expression: AwaitExpr = { kind: "await", loc, value: this.expression(14, allowIn) };
            this.awaits.push(expression);
            return expression;
        }
        if (this.generatorContext && t.text === "yield") {
            if (!allowArrow) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "yield requires an assignment-expression position", t.loc);
            return this.generatorYield(t);
        }
        if (this.structuralPlan() && t.kind === "punct" && (t.text === "/" || t.text === "/=")) return this.regexpLiteral(t);
        if (t.kind === "word" && t.text === "super" && this.boundedPlan()) {
            if (this.superContext !== "none" && (this.at(".") || this.at("["))) {
                let key: Expr;
                if (this.eat(".")) {
                    const token = this.take();
                    if (token.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected super property name", token.loc);
                    key = { kind: "literal", loc: token.loc, value: token.text };
                } else {
                    this.take(); key = this.expression(0); this.expect("]");
                }
                return { kind: "super-member", loc, key };
            }
            if (this.superContext !== "derived" || !this.at("(")) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "super call requires a derived constructor", loc);
                return { kind: "literal", loc, value: null };
            }
            this.take();
            const args: Argument[] = [];
            if (!this.at(")")) do { args.push(this.argument()); } while (this.error === null && this.eat(",") && !this.at(")"));
            this.expect(")");
            return { kind: "super-call", loc, args };
        }
        if (t.kind === "word" && t.text === "new" && this.boundedPlan() && this.eat(".")) {
            this.expect("target");
            if (!this.newTargetAllowed) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "new.target requires a function context", loc);
            return { kind: "new-target", loc };
        }
        if (t.kind === "word" && t.text === "new" && this.structuralPlan()) {
            const first = this.current();
            // Only primary/member syntax here; parentheses can contain calls.
            if ((first.kind === "word" || first.kind === "punct") && ["new", "-", "+", "!", "~", "delete", "typeof", "void", "++", "--"].includes(first.text)) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported constructor operand", first.loc);
                return { kind: "literal", loc, value: null };
            }
            let callee = this.primary(allowIn);
            if (callee.kind === "super-call" && !this.isParenthesized(callee)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "super call is not a constructor operand", first.loc);
            while (this.error === null) {
                if (this.eat(".")) {
                    const key = this.take();
                    if (key.kind !== "word" && !(this.privateSyntaxEnabled && key.kind === "private-identifier")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected property name", key.loc);
                    callee = { kind: "member", loc: first.loc, base: callee, key: key.kind === "private-identifier" ? this.privateName(key, true) : { kind: "literal", loc: key.loc, value: key.text } };
                } else if (this.eat("[")) {
                    const key = this.expression(0);
                    this.expect("]");
                    callee = { kind: "member", loc: first.loc, base: callee, key };
                } else if (this.current().kind === "template" || this.current().kind === "template-head") callee = this.taggedTemplate(callee);
                else break;
            }
            if (this.at("?.")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "optional constructor operand is unsupported", this.current().loc);
            const args: Argument[] = [];
            if (this.eat("(")) {
                if (!this.at(")")) {
                    do { args.push(this.argument()); } while (this.error === null && this.eat(",") && !this.at(")"));
                }
                this.expect(")");
            }
            return { kind: "new", loc, callee, args };
        }
        if (t.kind === "invalid-number" && this.purpose === "bounded-numeric-separator-audit")
            return { kind: "literal", loc, value: 0 };
        if (t.kind === "bigint") {
            const literal: Expr = { kind: "bigint", loc, value: t.text.slice(0, -1).replaceAll("_", "") };
            if (this.purpose === "bounded-numeric-assignment-audit") this.numericTokens.set(literal, t);
            return literal;
        }
        if (t.kind === "number") {
            const literal: Expr = { kind: "literal", loc, value: Number(t.text.replaceAll("_", "")) };
            if (this.purpose === "bounded-numeric-assignment-audit") this.numericTokens.set(literal, t);
            return literal;
        }
        if (t.kind === "string") return { kind: "literal", loc, value: t.text };
        if (t.kind === "template" || t.kind === "template-head") {
            const strings = [this.templateCooked(t)], expressions: Expr[] = [];
            if (t.kind === "template-head") {
                while (this.error === null) {
                    expressions.push(this.expression(0));
                    const part = this.take();
                    if (part.kind !== "template-middle" && part.kind !== "template-tail") {
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "expected template continuation", part.loc);
                        break;
                    }
                    strings.push(this.templateCooked(part));
                    if (part.kind === "template-tail") break;
                }
            }
            return { kind: "template", loc, strings, expressions };
        }
        if (t.text === "true" || t.text === "false") return { kind: "literal", loc, value: t.text === "true" };
        if (t.text === "null") return { kind: "literal", loc, value: null };
        if (t.text === "this") return { kind: "this", loc };
        const asynchronous = this.structuralPlan() && t.escaped !== true && t.text === "async" && this.at("function") && t.loc.line === this.current().loc.line;
        if (asynchronous) this.take();
        if (t.text === "function" || asynchronous) {
            const generator = this.structuralPlan() && this.eat("*");
            let name: DeclarationSite | undefined;
            if (this.structuralPlan() && !this.at("(")) {
                const savedYieldReserved = this.yieldIdentifierReserved;
                const savedAwaitReserved = this.awaitIdentifierReserved, savedAwaitCover = this.awaitCoverIdentifiers;
                this.yieldIdentifierReserved = generator;
                this.awaitIdentifierReserved = asynchronous;
                this.awaitCoverIdentifiers = null;
                const token = this.current();
                name = { name: this.name(), start: token.start, end: token.end, loc: token.loc };
                this.yieldIdentifierReserved = savedYieldReserved;
                this.awaitIdentifierReserved = savedAwaitReserved;
                this.awaitCoverIdentifiers = savedAwaitCover;
            }
            const fn = this.functionTail(loc, t.start, "none", generator, asynchronous);
            const source: FunctionSource = asynchronous ? { ...fn.source, async: true } : fn.source;
            return { kind: "function", loc, params: fn.params, parameters: fn.parameters, body: fn.body,
                source: name === undefined ? source : { ...source, name } };
        }
        if (t.text === "(") {
            if (this.structuralPlan()) return this.parenthesizedExpression(t, allowIn, allowArrow);
            const expr = this.expression(0);
            this.expect(")");
            if (this.structuralPlan()) this.parenthesized.set(expr, true);
            return expr;
        }
        if (t.kind === "punct" && (t.text === "++" || t.text === "--") && this.structuralPlan()) {
            const target = this.expression(14, allowIn);
            if (target.kind !== "identifier" && target.kind !== "member" && target.kind !== "super-member" && !this.deferNumericTarget(target, t)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid update target", loc);
            return { kind: "update", loc, target, op: t.text, prefix: true };
        }
        if ((this.structuralPlan() && t.text === "~") || t.text === "!" || t.text === "-" || t.text === "+" || t.text === "delete" || t.text === "typeof" || t.text === "void") {
            const operand = this.expression(14, allowIn);
            // Parentheses preserve identifiers. The bounded collector validates
            // their inherited mode after whole-source grammar coverage.
            if (this.privateSyntaxEnabled && t.text === "delete") {
                const last = operand.kind === "chain" ? operand.links[operand.links.length - 1] : null;
                const key = operand.kind === "member" ? operand.key : last?.kind === "member" ? last.key : null;
                if (key?.kind === "private-name" && (this.privateIssue === null || key.start < this.privateIssue.site.start))
                    this.privateIssue = { site: key, message: "private elements cannot be deleted" };
            }
            if (t.text === "delete" && operand.kind === "identifier" && !this.boundedPlan()) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.delete-identifier" }, "delete of an identifier is not allowed", loc);
            return { kind: "unary", loc, op: t.text, operand };
        }
        if (t.text === "[") {
            const elements: ArrayElement[] = [];
            let trailingComma = false;
            while (this.error === null && !this.at("]")) {
                if (this.eat(",")) {
                    elements.push(null);
                    continue;
                }
                if (this.at(".")) {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.array-spread" }, "array spread is unsupported", this.current().loc);
                    break;
                }
                if (this.structuralPlan() && this.eat("...")) {
                    const spread = this.token(this.index - 1);
                    elements.push({ kind: "spread", loc: spread.loc, expression: this.expression(1) });
                } else elements.push(this.expression(1));
                if (!this.eat(",")) break;
                trailingComma = this.at("]");
            }
            this.expect("]");
            const array: Expr = { kind: "array", loc, elements };
            if (trailingComma) this.arrayTrailingCommas.add(array);
            return array;
        }
        if (t.text === "class" && this.structuralPlan()) return this.classDefinition(loc, t.start, false);
        if (t.text === "{" && this.structuralPlan()) return this.objectExpression(loc);
        if (t.text === "{") {
            const properties: ObjectProperty[] = [];
            if (!this.at("}")) {
                do {
                    const first = this.take();
                    let key = first;
                    let kind: "data" | "get" | "set" = "data";
                    if (this.structuralPlan() && first.kind === "word" && first.escaped !== true && (first.text === "get" || first.text === "set") && !this.at(":") && !this.at("(")) {
                        kind = first.text;
                        key = this.take();
                    }
                    if (key.kind !== "word" && key.kind !== "string" && key.kind !== "number" && key.kind !== "bigint") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected literal property name", key.loc);
                    const name = this.literalPropertyName(key);
                    if (this.structuralPlan() && this.at("(")) {
                        const fn = this.functionTail(first.loc, first.start, "method");
                        if ((kind === "get" && fn.parameters.length !== 0) || (kind === "set" && (fn.parameters.length !== 1 || fn.source.rest === true)))
                            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "invalid accessor parameter list", first.loc);
                        if (new Set(fn.params).size !== fn.params.length)
                            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate method parameter", first.loc);
                        properties.push({ kind, key: name, value: { kind: "function", loc: first.loc, params: fn.params, parameters: fn.parameters, body: fn.body,
                            source: { source: fn.source.source, start: fn.source.start, end: fn.source.end, method: true, rest: fn.source.rest, bodyLoc: fn.source.bodyLoc } } });
                    } else {
                        if (kind !== "data") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected accessor parameter list", first.loc);
                        if (key.text === "__proto__") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.prototype-literal" }, "prototype literal syntax is unsupported", key.loc);
                        this.expect(":");
                        properties.push({ kind: "data", key: name, value: this.expression(1) });
                    }
                } while (this.error === null && this.eat(",") && !(this.structuralPlan() && this.at("}")));
            }
            this.expect("}");
            return { kind: "object", loc, properties };
        }
        if (t.kind === "word" && (!RESERVED.includes(" " + t.text + " ") || (this.structuralPlan() && (t.text === "arguments" || t.text === "eval" || t.text === "async" || this.awaitIdentifierAllowed(t.text) || this.yieldIdentifierAllowed(t.text) || (this.boundedPlan() && (t.text === "let" || isStrictReservedIdentifier(t.text))))))) {
            this.recordAwaitIdentifier(t.text, loc);
            return { kind: "identifier", loc, name: t.text };
        }
        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported or unexpected syntax: " + t.text, loc);
        return { kind: "literal", loc, value: null };
    }
}

export type PrivateClassSyntaxResult = { readonly kind: "valid" }
    | { readonly kind: "invalid"; readonly issue: PrivateSyntaxIssue }
    | { readonly kind: "blocked"; readonly diagnostic: Diagnostic; readonly rejection: Rejection };

// This structural audit does not retain executable nodes or admit private execution.
export function auditPrivateClassSyntax(source: string): PrivateClassSyntaxResult {
    const lexer = createLexer(source, true);
    const parser = new Parser(lexer.result().tokens, { text: source }, "bounded-plan", false, "none", lexer);
    parser.privateSyntaxEnabled = true;
    const parsed = parser.program();
    while (lexer.next().kind !== "eof") {}
    const lexical = lexer.result();
    if (lexical.error !== null && lexical.rejection !== null)
        return { kind: "blocked", diagnostic: lexical.error, rejection: lexical.rejection };
    if (parsed.error !== null && parsed.rejection !== null)
        return { kind: "blocked", diagnostic: parsed.error, rejection: parsed.rejection };
    if (parser.regexpError !== null)
        return { kind: "blocked", diagnostic: parser.regexpError, rejection: { kind: "syntax-error", ruleCode: "regexp-literal" } };
    if (parser.current().kind !== "eof" || parser.current().end !== source.length) throw new Error("private syntax audit did not reach EOF");
    if (parser.privateIssue !== null) return { kind: "invalid", issue: parser.privateIssue };
    return { kind: "valid" };
}
