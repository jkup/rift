import type { DestructuringPattern, ArrayPattern, PatternElement } from "./syntax.js";
import { collectNumericSeparatorAudit, type NumericSeparatorAudit } from "./script-declarations.js";
import { collectLexicalStatementAudit, type LexicalStatementAudit, type LexicalStatementCandidate, type LexicalStatementContext, collectNumericAssignmentAudit, type NumericAssignmentAudit, type NumericAssignmentCandidate, collectDeclarationPlan, collectBoundedScriptPreparation, collectBoundedScriptParameterRejection, collectBlockFunctionAudit, collectStrictParameterAudit, type StrictParameterAudit, type BlockFunctionAudit, type DeclarationNodes, type DeclarationPlanResult, type ParsedBinding } from "./script-declarations.js";
export type { LexicalStatementAudit, LexicalStatementCandidate, LexicalStatementContext, NumericAssignmentAudit, NumericAssignmentCandidate, NumericAssignmentSite, StrictParameterAudit, StrictParameterCandidate, BlockFunctionAudit, BlockFunctionCandidate } from "./script-declarations.js";
import type { ScriptSourceUnit } from "./script-metadata.js";
import { scriptPrologue, lineTerminatorBetween } from "./script-prologue.js";
import type { ResourceOrigin, SyntaxCapability, Rejection } from "./outcomes.js";
import { lex, lexNumericSeparatorAudit, type Token } from "./lexer.js";
import type { Diagnostic, Expr, ChainLink, ObjectProperty, ArrayElement, Argument, Location, Stmt, SourceText, FunctionSource, FormalParameter, SwitchClause, VarStmt, ForEachStmt, TryFinallyStmt } from "./syntax.js";

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
export function auditBoundedScriptNumericSeparators(source: string, inheritedStrict = false): NumericSeparatorAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, false, false, false, true);
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
export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict = false): DeclarationPlanResult {
    const original = prepareBeforeNumericSeparators(unit, nodes, inheritedStrict);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        (original.rejection.capabilityCode !== "lex.numeric-literal" && original.rejection.capabilityCode !== "lex.leading-zero")) return original;
    const audit = auditBoundedScriptNumericSeparators(original.unit.text, inheritedStrict);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible separator audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "numeric-separator" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "invalid numeric separator",
            loc: { line: first.loc.line, column: first.loc.column } } };
}
function prepareBeforeNumericSeparators(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean): DeclarationPlanResult {
    const original = parseBoundedScriptPreparationBeforeLexicalAudit(unit, nodes, inheritedStrict);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.declaration-statement") return original;
    const audit = auditBoundedScriptLexicalStatements(original.unit.text, inheritedStrict);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible lexical audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "lexical-declaration-statement" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "lexical declaration is not allowed in Statement position",
            loc: { line: first.keyword.loc.line, column: first.keyword.loc.column } } };
}
// Preserve D6 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeLexicalAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean): DeclarationPlanResult {
    const original = parseBoundedScriptPreparationBeforeNumericAudit(unit, nodes, inheritedStrict);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.assignment-target") return original;
    const audit = auditBoundedScriptNumericAssignments(original.unit.text, inheritedStrict);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible numeric audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "assignment-target" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "invalid numeric assignment target",
            loc: { line: first.target.loc.line, column: first.target.loc.column } } };
}
// Preserve D4 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeNumericAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes, inheritedStrict: boolean): DeclarationPlanResult {
    const original = parseStructuralPlan(unit, nodes, true, true, inheritedStrict);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.duplicate-parameter") return original;
    // A failed duplicate-formal parse only permits a fresh rejection-only audit.
    // Its retained nodes remain untouched; the continuation cannot produce a plan.
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, null, true, true);
    if (parsed.kind === "blocked") return original;
    const rejection = collectBoundedScriptParameterRejection(source, parsed.body, parsed.tokens, parsed.bindings, inheritedStrict);
    return rejection === null ? original : rejection;
}
function parseStructuralPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean, certifyBlockFunctions = false, inheritedStrict = false): DeclarationPlanResult {
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, nodes, bounded);
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
    const parsed = parseStructuralSource(unit, null, true, true);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectStrictParameterAudit(unit, parsed.body, parsed.tokens, parsed.bindings);
}
export function auditBoundedScriptNumericAssignments(source: string, inheritedStrict = false): NumericAssignmentAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, false, true);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectNumericAssignmentAudit(unit, parsed.body, parsed.tokens, parsed.bindings, parsed.numericCandidates, inheritedStrict);
}

export function auditBoundedScriptLexicalStatements(source: string, inheritedStrict = false): LexicalStatementAudit {
    const unit = { id: "", text: source };
    const parsed = parseStructuralSource(unit, null, true, false, false, true);
    if (parsed.kind === "blocked") return { kind: "blocked", reason: "grammar-or-resource",
        diagnostic: parsed.diagnostic, rejection: parsed.rejection };
    return collectLexicalStatementAudit(unit, parsed.body, parsed.tokens, parsed.bindings, parsed.lexicalCandidates, inheritedStrict);
}

type StructuralSource =
    | { kind: "parsed"; body: Stmt[]; tokens: Token[]; bindings: Map<number, ParsedBinding[]>; numericCandidates: readonly NumericAssignmentCandidate[]; lexicalCandidates: readonly LexicalStatementCandidate[] }
    | { kind: "blocked"; goal: "Script"; unit: ScriptSourceUnit; rejection: Rejection; diagnostic: Diagnostic };
// One lexical/parser path for both public plans and non-emitting audit evidence.
function parseStructuralSource(source: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean, parameterAudit = false, numericAudit = false, lexicalAudit = false, separatorAudit = false): StructuralSource {
    if (parameterAudit && (!bounded || nodes !== null)) throw new Error("invalid parameter audit purpose");
    if (numericAudit && (!bounded || nodes !== null || parameterAudit)) throw new Error("invalid numeric audit purpose");
    if (lexicalAudit && (!bounded || nodes !== null || parameterAudit || numericAudit)) throw new Error("invalid lexical audit purpose");
    if (separatorAudit && (!bounded || nodes !== null || parameterAudit || numericAudit || lexicalAudit)) throw new Error("invalid numeric separator audit purpose");
    const lexical = separatorAudit ? lexNumericSeparatorAudit(source.text) : lex(source.text, true);
    if (lexical.error !== null) {
        if (lexical.rejection === null) throw new Error("missing lexer rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: lexical.rejection, diagnostic: lexical.error };
    }
    const parserSource: SourceText = { text: source.text };
    if (nodes !== null) nodes.source = parserSource;
    const parser = new Parser(lexical.tokens, parserSource, separatorAudit ? "bounded-numeric-separator-audit" : lexicalAudit ? "bounded-lexical-statement-audit" : numericAudit ? "bounded-numeric-assignment-audit" : parameterAudit ? "bounded-parameter-audit" : bounded ? "bounded-plan" : "declaration-plan");
    const parsed = parser.program();
    if (parsed.error !== null) {
        if (parsed.rejection === null) throw new Error("missing parser rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: parsed.rejection, diagnostic: parsed.error };
    }
    if (parser.current().kind !== "eof" || parser.current().start !== source.text.length || parser.current().end !== source.text.length) throw new Error("declaration plan did not reach EOF");
    if (nodes !== null) nodes.assignmentNameEligible = parser.assignmentNameEligible;
    return { kind: "parsed", body: parsed.body, tokens: lexical.tokens, bindings: parser.bindings, numericCandidates: parser.numericCandidates, lexicalCandidates: parser.lexicalCandidates };
}
class Parser {
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
    constructor(public tokens: Token[], readonly source: SourceText, private readonly purpose: "legacy" | "return-audit" | "declaration-plan" | "bounded-plan" | "bounded-parameter-audit" | "bounded-numeric-assignment-audit" | "bounded-lexical-statement-audit" | "bounded-numeric-separator-audit" = "legacy") {}
    private structuralPlan(): boolean { return this.purpose === "declaration-plan" || this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit" || this.purpose === "bounded-numeric-assignment-audit" || this.purpose === "bounded-lexical-statement-audit" || this.purpose === "bounded-numeric-separator-audit"; }
    private boundedPlan(): boolean { return this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit" || this.purpose === "bounded-numeric-assignment-audit" || this.purpose === "bounded-lexical-statement-audit" || this.purpose === "bounded-numeric-separator-audit"; }
    current(): Token { return this.tokens[this.index]; }
    at(text: string): boolean {
        const t = this.current();
        return t.kind !== "string" && t.kind !== "number" && t.text === text;
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
            lineTerminatorBetween(this.source.text, this.tokens[this.index - 1], this.current()))) return;
        this.expect(";");
    }
    name(): string {
        const t = this.take();
        if (t.kind !== "word" || (RESERVED.includes(" " + t.text + " ") && !(this.structuralPlan() && (t.text === "arguments" || t.text === "eval")))) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "expected binding identifier", t.loc);
        return t.text;
    }
    program(): ParseResult {
        const body = this.list(false, []);
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
    branch(context: LexicalStatementContext): Stmt {
        const keyword = this.current();
        const auditLet = this.purpose === "bounded-lexical-statement-audit" && keyword.kind === "word" && keyword.text === "let";
        if (this.at("const")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported or unexpected syntax: const", keyword.loc);
        if ((this.at("let") && !auditLet) || this.at("function")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "declarations require a block", keyword.loc);
        if (auditLet && this.tokens[this.index + 1]?.text === "[")
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "pattern declarations require a block", keyword.loc);
        const result = this.statement();
        // Only a complete supported declaration in this exact Statement slot is evidence.
        if (auditLet && this.error === null && result.kind === "let") {
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
            const token = this.tokens[index];
            const iteration = token.kind === "word" && (token.text === "for" || token.text === "while" || token.text === "do");
            this.labels.push({ name, iteration });
            if (this.at("let") || this.at("const") || this.at("function"))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "labelled declarations are unsupported", this.current().loc);
            const body = this.statement();
            this.labels.pop();
            return { kind: "labelled", loc, name, body };
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
                clauses.push({ loc: keyword.loc, start: keyword.start, end: this.tokens[this.index - 1].end, test, body: statements });
            }
            this.switches--;
            this.expect("}");
            return { kind: "switch", loc, discriminant, caseBlock: { loc: brace.loc, start: brace.start,
                end: this.tokens[this.index - 1].end, clauses, body } };
        }
        if (this.structuralPlan() && this.eat("try")) {
            const block = this.statement();
            if (this.at("finally") && block.kind === "block") return this.finishTry(loc, block);
            const catchToken = this.current();
            this.expect("catch");
            this.expect("(");
            const token = this.current();
            const name = this.name();
            this.expect(")");
            const handler = this.statement();
            if (block.kind !== "block" || handler.kind !== "block") {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "try/catch requires blocks", loc);
                return { kind: "empty", loc };
            }
            return this.finishTry(loc, { kind: "try-catch", loc, block, handler,
                parameter: { name, start: token.start, end: token.end, loc: token.loc },
                catchLoc: catchToken.loc, catchStart: catchToken.start, catchEnd: this.tokens[this.index - 1].end });
        }
        if (this.structuralPlan() && (this.at("let") || this.at("const") || this.at("var")) && this.tokens[this.index + 1]?.text === "[") {
            const declarationKind = this.take().text;
            if (declarationKind !== "let" && declarationKind !== "const" && declarationKind !== "var") throw new Error("invalid declaration kind");
            const bindings: ParsedBinding[] = [];
            const pattern = this.arrayBindingPattern(bindings);
            this.expect("=");
            const initializerStart = this.current().start;
            const init = this.expression(1);
            const initializer = { start: initializerStart, end: this.tokens[this.index - 1].end };
            for (const binding of bindings) binding.initializer = initializer;
            this.bindings.set(start, bindings);
            this.statementTerminator();
            return { kind: "pattern-declaration", loc, declarationKind, pattern, init };
        }
        if (this.structuralPlan() && this.eat("const")) {
            const binding = this.binding(1);
            this.statementTerminator();
            if (binding.init === null) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "const requires an initializer", loc);
                return { kind: "empty", loc };
            }
            this.bindings.set(start, [binding]);
            return { kind: "const", loc, name: binding.site.name, init: binding.init };
        }
        if (this.eat("let")) {
            const binding = this.binding(1);
            this.statementTerminator();
            if (this.structuralPlan()) this.bindings.set(start, [binding]);
            return { kind: "let", loc, name: binding.site.name, init: binding.init };
        }
        if (this.structuralPlan() && this.at("var")) {
            const declaration = this.varDeclaration(true);
            this.statementTerminator();
            return declaration;
        }
        if (this.eat("function")) {
            const token = this.current();
            const name = this.name();
            if (this.structuralPlan()) this.bindings.set(start, [{ site: { name, start: token.start, end: token.end, loc: token.loc }, init: null, initializer: null }]);
            const fn = this.functionTail(loc, start);
            return { kind: "function", loc, name, params: fn.params, parameters: fn.parameters, body: fn.body, source: fn.source };
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
            this.expect("(");
            if ((this.at("let") || this.at("const")) && this.tokens[this.index + 2]?.kind === "word" && (this.tokens[this.index + 2]?.text === "of" || this.tokens[this.index + 2]?.text === "in")) {
                const declarationKind = this.take().text === "let" ? "let" : "const";
                const token = this.current();
                const name = this.name();
                const kind = this.take().text === "of" ? "for-of" : "for-in";
                return this.forEach(kind, loc, start, { kind: "lexical", declarationKind,
                    site: { name, start: token.start, end: token.end, loc: token.loc } });
            }
            let lexical: { declarationKind: "let" | "const"; binding: ParsedBinding } | null = null;
            if (this.at("let") || this.at("const")) {
                const declarationKind = this.take().text === "let" ? "let" : "const";
                const binding = this.binding(1, false);
                if (declarationKind === "const" && binding.init === null)
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "const requires an initializer", loc);
                lexical = { declarationKind, binding };
            }
            let initializer: VarStmt | Expr | null = null;
            if (lexical === null && this.at("var")) initializer = this.varDeclaration(false);
            else if (lexical === null && !this.at(";")) initializer = this.expression(0, false);
            if (initializer !== null && (this.at("of") || this.at("in"))) {
                const kind = this.take().text === "of" ? "for-of" : "for-in";
                if (initializer.kind === "var") {
                    if (initializer.declarations.length !== 1 || initializer.declarations[0].init !== null)
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, kind + " requires one uninitialized binding", initializer.loc);
                } else if (initializer.kind !== "identifier" && initializer.kind !== "member") {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid " + kind + " assignment target", initializer.loc);
                }
                return this.forEach(kind, loc, start, initializer);
            }
            this.expect(";");
            const test = this.at(";") ? null : this.expression(0);
            this.expect(";");
            const update = this.at(")") ? null : this.expression(0);
            this.expect(")");
            this.loops++;
            const body = this.branch("for-body");
            this.loops--;
            if (lexical !== null) return { kind: "for-lexical", loc, start, end: this.tokens[this.index - 1].end,
                declarationKind: lexical.declarationKind, binding: lexical.binding, test, update, body };
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
        if (this.at("return") || this.at("throw")) {
            const keyword = this.take();
            const kind = keyword.text === "return" ? "return" : "throw";
            if (kind === "return" && this.functions === 0) {
                if (this.purpose === "return-audit") {
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
        return token.kind === "word" && (!RESERVED.includes(" " + token.text + " ") || token.text === "arguments" || token.text === "eval");
    }
    private labelAhead(index: number): boolean {
        return this.labelIdentifier(this.tokens[index]) && this.tokens[index + 1]?.kind === "punct" && this.tokens[index + 1]?.text === ":";
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
    forEach(kind: "for-of" | "for-in", loc: Location, start: number, head: ForEachStmt["head"]): ForEachStmt {
        const iterable = this.expression(kind === "for-in" ? 0 : 1);
        this.expect(")");
        this.loops++;
        const body = this.branch("for-body");
        this.loops--;
        return { kind, loc, start, end: this.tokens[this.index - 1].end, head, iterable, body };
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
            let child: DestructuringPattern;
            if (this.at("[")) child = this.arrayBindingPattern(bindings);
            else {
                const token = this.current();
                const name = this.name();
                const site = { name, start: token.start, end: token.end, loc: token.loc };
                bindings.push({ site, init: null, initializer: null });
                child = { kind: "binding", loc: token.loc, site };
            }
            if (rest) { pattern.rest = child; break; }
            const initializer = this.eat("=") ? this.expression(1) : null;
            pattern.elements.push({ pattern: child, initializer });
            if (!this.eat(",")) break;
        }
        this.expect("]");
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
            initializer = { start, end: this.tokens[this.index - 1].end };
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
                const name = this.name();
                if (params.includes(name) && (arrow || this.purpose !== "bounded-parameter-audit"))
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, (arrow ? "duplicate arrow parameter: " : "duplicate parameter: ") + name, loc);
                params.push(name);
                let initializer: Expr | null = null;
                if (this.structuralPlan() && this.eat("=")) {
                    if (rest) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "rest parameter cannot have a default", token.loc);
                    initializer = this.expression(1);
                }
                parameters.push({ site: { name, start: token.start, end: token.end, loc: token.loc }, initializer });
                if (rest) break;
            } while (this.error === null && this.eat(",") && !(arrow && this.at(")")));
        }
        this.expect(")");
        if (rest && new Set(params).size !== params.length)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate rest parameter list", loc);
        if (parameters.some(parameter => parameter.initializer !== null) && new Set(params).size !== params.length)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate default parameter list", loc);
        return { params, rest, parameters };
    }
    checkParameterDirective(rest: boolean, parameters: FormalParameter[], bodyIndex: number, loc: Location): void {
        if ((rest || parameters.some(parameter => parameter.initializer !== null)) && scriptPrologue(this.source.text, this.tokens, bodyIndex, false).ownStrict)
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "strict directive with non-simple parameters", loc);
    }
    functionTail(loc: Location, start: number): { params: string[]; parameters: FormalParameter[]; body: Stmt[]; source: FunctionSource } {
        const { params, rest, parameters } = this.formalParameters(loc, false);
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
        const body = this.list(true, params);
        this.functions--;
        this.loops = loops;
        this.switches = switches;
        this.labels = labels;
        this.checkParameterDirective(rest, parameters, bodyIndex, loc);
        return { params, parameters, body, source: { source: this.source, start, end: this.tokens[this.index - 1].end, rest, bodyLoc } };
    }
    arrowAhead(): boolean {
        let index = this.index;
        if (this.tokens[index].kind === "word") return this.tokens[index + 1].kind === "punct" && this.tokens[index + 1].text === "=>";
        if (this.tokens[index].kind !== "punct" || this.tokens[index].text !== "(") return false;
        let depth = 0;
        for (; this.tokens[index].kind !== "eof"; index++) {
            const token = this.tokens[index];
            if (token.kind !== "punct") continue;
            if (token.text === "(") depth++;
            if (token.text === ")" && --depth === 0)
                return this.tokens[index + 1].kind === "punct" && this.tokens[index + 1].text === "=>";
        }
        return false;
    }
    arrow(allowIn: boolean): Expr {
        const first = this.current();
        const { params, rest, parameters } = this.at("(") ? this.formalParameters(first.loc, true)
            : { params: [this.name()], rest: false, parameters: [{ site: { name: first.text, start: first.start, end: first.end, loc: first.loc }, initializer: null }] };
        if (this.current().loc.line !== this.tokens[this.index - 1].loc.line)
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
        this.functions--;
        this.loops = loops;
        this.switches = switches;
        this.labels = labels;
        if (!expressionBody) this.checkParameterDirective(rest, parameters, bodyIndex, first.loc);
        return { kind: "function", loc: first.loc, params, parameters, body,
            source: { source: this.source, start: first.start, end: this.tokens[this.index - 1].end, arrow: true, expressionBody, rest, bodyLoc } };
    }
    chainLink(base: Expr, link: ChainLink): Expr {
        if (base.kind === "chain" && !this.parenthesized.has(base)) { base.links.push(link); return base; }
        return { kind: "chain", loc: base.loc, base, links: [link] };
    }
    precedence(op: string): number {
        if (this.structuralPlan() && ["**=", "&=", "|=", "^=", "<<=", ">>=", ">>>="].includes(op)) return 1;
        if (op === "=" || op === "+=" || op === "-=" || op === "*=" || op === "/=" || op === "%=") return 1;
        if (op === "?") return 2;
        if (op === "||") return 3;
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
    expression(min: number, allowIn = true): Expr {
        const loc = this.current().loc;
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return { kind: "literal", loc, value: null };
        }
        const arrow = this.structuralPlan() && min <= 1 && this.arrowAhead();
        let left = arrow ? this.arrow(allowIn) : this.primary(allowIn);
        // A unary operand may already have consumed the postfix token. Its
        // enclosing expression must not reopen the member/call suffix chain.
        const lastPrimaryToken = this.tokens[this.index - 1];
        let updated = lastPrimaryToken.kind === "punct" && (lastPrimaryToken.text === "++" || lastPrimaryToken.text === "--");
        while (this.error === null) {
            if (arrow && !(min === 0 && this.at(","))) break;
            if (this.current().kind === "template" || this.current().kind === "template-head") {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "tagged templates are unsupported", this.current().loc);
                break;
            }
            if (!updated && this.structuralPlan() && this.eat("?.")) {
                const linkLoc = this.tokens[this.index - 1].loc;
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
                        if (token.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected optional property name", token.loc);
                        key = { kind: "literal", loc: token.loc, value: token.text };
                    }
                    left = this.chainLink(left, { kind: "member", loc: linkLoc, optional: true, key });
                }
                continue;
            }
            if (!updated && this.eat(".")) {
                const key = this.take();
                if (key.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected property name", key.loc);
                const property: Expr = { kind: "literal", loc: key.loc, value: key.text };
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
                const previous = this.tokens[this.index - 1];
                if (lineTerminatorBetween(this.source.text, previous, this.current())) break;
                const increment = this.take();
                const operation = increment.text === "++" ? "increment" : "decrement";
                if (left.kind !== "identifier" && left.kind !== "member") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid " + operation + " target", left.loc);
                left = { kind: "update", loc: left.loc, target: left, op: increment.text === "++" ? "++" : "--", prefix: false };
                updated = true;
                continue;
            }
            const op = this.current().text;
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
            if (op === "**" && left.kind === "unary" && !this.parenthesized.has(left))
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unparenthesized unary exponentiation base", left.loc);
            const right = this.expression(precedence === 1 || op === "**" ? precedence : precedence + 1, allowIn);
            if (precedence === 1) {
                if (op === "=" && left.kind === "array" && this.structuralPlan() && !this.parenthesized.has(left)) {
                    const pattern = this.assignmentPattern(left);
                    if (pattern.kind !== "array-pattern") throw new Error("array pattern invariant");
                    left = { kind: "destructure", loc, pattern, value: right };
                    continue;
                }
                if (left.kind !== "identifier" && left.kind !== "member") {
                    const numeric = this.numericTokens.get(left);
                    // Defer only this token-backed failure after the RHS succeeds.
                    // These continued trees have no retained or executable authority.
                    if (this.error === null && this.purpose === "bounded-numeric-assignment-audit" && numeric !== undefined &&
                        (op === "=" || op === "+=" || op === "-=" || op === "*=" || op === "/=" || op === "%=")) {
                        this.numericCandidates.push({ ruleCode: "assignment-target",
                            target: { text: numeric.text, start: numeric.start, end: numeric.end,
                                loc: { line: numeric.loc.line, column: numeric.loc.column } },
                            operator: { text: op, start: operatorToken.start, end: operatorToken.end,
                                loc: { line: operatorToken.loc.line, column: operatorToken.loc.column } } });
                    } else this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid assignment target", loc);
                }
                if (op === "=") {
                    const eligible = left.kind === "identifier" && !this.parenthesized.has(left);
                    left = { kind: "assign", loc, target: left, value: right };
                    if (this.structuralPlan()) this.assignmentNameEligible.set(left, eligible);
                }
                else {
                    let binaryOp: "+" | "-" | "*" | "/" | "%" | "**" | "&" | "|" | "^" | "<<" | ">>" | ">>>" = "+";
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
                    left = { kind: "compound", loc, target: left, value: right, op: binaryOp };
                }
            } else left = { kind: "binary", loc, op, left, right };
        }
        this.depth--;
        return left;
    }
    // Keep the collection key at its declared Expr type for scriptc (TS-152 reduction).
    private isParenthesized(expr: Expr): boolean { return this.parenthesized.has(expr); }
    assignmentPattern(expr: Expr): DestructuringPattern {
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
                } else if ((item.kind === "assign" || item.kind === "destructure") && !this.isParenthesized(item)) {
                    elements.push({ pattern: item.kind === "assign" ? this.assignmentPattern(item.target) : item.pattern, initializer: item.value });
                } else elements.push({ pattern: this.assignmentPattern(item), initializer: null });
            }
            return { kind: "array-pattern", loc: expr.loc, elements, rest };
        }
        if (expr.kind !== "identifier" && expr.kind !== "member")
            this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid destructuring target", expr.loc);
        return { kind: "target", loc: expr.loc, target: expr,
            inferredName: expr.kind === "identifier" && !this.parenthesized.has(expr) ? expr.name : null };
    }
    argument(): Argument {
        if (this.structuralPlan() && this.eat("...")) {
            const spread = this.tokens[this.index - 1];
            return { kind: "spread", loc: spread.loc, expression: this.expression(1) };
        }
        return this.expression(1);
    }
    primary(allowIn: boolean): Expr {
        const t = this.take();
        const loc = t.loc;
        if (t.kind === "word" && t.text === "new" && this.structuralPlan()) {
            const first = this.current();
            // Only primary/member syntax here; parentheses can contain calls.
            if ((first.kind === "word" || first.kind === "punct") && ["new", "-", "+", "!", "~", "delete", "typeof", "void", "++", "--"].includes(first.text)) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported constructor operand", first.loc);
                return { kind: "literal", loc, value: null };
            }
            let callee = this.primary(allowIn);
            while (this.error === null) {
                if (this.eat(".")) {
                    const key = this.take();
                    if (key.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected property name", key.loc);
                    callee = { kind: "member", loc: first.loc, base: callee, key: { kind: "literal", loc: key.loc, value: key.text } };
                } else if (this.eat("[")) {
                    const key = this.expression(0);
                    this.expect("]");
                    callee = { kind: "member", loc: first.loc, base: callee, key };
                } else break;
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
        if (t.kind === "number") {
            const literal: Expr = { kind: "literal", loc, value: Number(t.text.replaceAll("_", "")) };
            if (this.purpose === "bounded-numeric-assignment-audit") this.numericTokens.set(literal, t);
            return literal;
        }
        if (t.kind === "string") return { kind: "literal", loc, value: t.text };
        if (t.kind === "template" || t.kind === "template-head") {
            if (t.cooked === undefined) throw new Error("template token lacks cooked text");
            const strings = [t.cooked], expressions: Expr[] = [];
            if (t.kind === "template-head") {
                while (this.error === null) {
                    expressions.push(this.expression(0));
                    const part = this.take();
                    if (part.kind !== "template-middle" && part.kind !== "template-tail") {
                        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.expected-token" }, "expected template continuation", part.loc);
                        break;
                    }
                    if (part.cooked === undefined) throw new Error("template token lacks cooked text");
                    strings.push(part.cooked);
                    if (part.kind === "template-tail") break;
                }
            }
            return { kind: "template", loc, strings, expressions };
        }
        if (t.text === "true" || t.text === "false") return { kind: "literal", loc, value: t.text === "true" };
        if (t.text === "null") return { kind: "literal", loc, value: null };
        if (t.text === "this") return { kind: "this", loc };
        if (t.text === "function") {
            const fn = this.functionTail(loc, t.start);
            return { kind: "function", loc, params: fn.params, parameters: fn.parameters, body: fn.body, source: fn.source };
        }
        if (t.text === "(") {
            const expr = this.expression(0);
            this.expect(")");
            if (this.structuralPlan()) this.parenthesized.set(expr, true);
            return expr;
        }
        if (t.kind === "punct" && (t.text === "++" || t.text === "--") && this.structuralPlan()) {
            const target = this.expression(14, allowIn);
            if (target.kind !== "identifier" && target.kind !== "member") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid update target", loc);
            return { kind: "update", loc, target, op: t.text, prefix: true };
        }
        if ((this.structuralPlan() && t.text === "~") || t.text === "!" || t.text === "-" || t.text === "+" || t.text === "delete" || t.text === "typeof" || t.text === "void") {
            const operand = this.expression(14, allowIn);
            // Parentheses preserve identifiers. The bounded collector validates
            // their inherited mode after whole-source grammar coverage.
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
                    const spread = this.tokens[this.index - 1];
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
        if (t.text === "{") {
            const properties: ObjectProperty[] = [];
            if (!this.at("}")) {
                do {
                    const first = this.take();
                    let key = first;
                    let kind: "data" | "get" | "set" = "data";
                    if (this.structuralPlan() && first.kind === "word" && (first.text === "get" || first.text === "set") && !this.at(":") && !this.at("(")) {
                        kind = first.text;
                        key = this.take();
                    }
                    if (key.kind !== "word" && key.kind !== "string" && key.kind !== "number") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected literal property name", key.loc);
                    const name = key.kind === "number" ? String(Number(key.text.replaceAll("_", ""))) : key.text;
                    if (this.structuralPlan() && this.at("(")) {
                        const fn = this.functionTail(first.loc, first.start);
                        if ((kind === "get" && fn.params.length !== 0) || (kind === "set" && (fn.params.length !== 1 || fn.source.rest === true)))
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
        if (t.kind === "word" && (!RESERVED.includes(" " + t.text + " ") || (this.structuralPlan() && (t.text === "arguments" || t.text === "eval")))) return { kind: "identifier", loc, name: t.text };
        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported or unexpected syntax: " + t.text, loc);
        return { kind: "literal", loc, value: null };
    }
}
