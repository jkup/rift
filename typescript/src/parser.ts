import { collectDeclarationPlan, collectBoundedScriptPreparation, collectBoundedScriptParameterRejection, collectBlockFunctionAudit, collectStrictParameterAudit, type StrictParameterAudit, type BlockFunctionAudit, type DeclarationNodes, type DeclarationPlanResult, type ParsedBinding } from "./script-declarations.js";
export type { StrictParameterAudit, StrictParameterCandidate, BlockFunctionAudit, BlockFunctionCandidate } from "./script-declarations.js";
import type { ScriptSourceUnit } from "./script-metadata.js";
import type { ResourceOrigin, SyntaxCapability, Rejection } from "./outcomes.js";
import { lex, type Token } from "./lexer.js";
import type { Diagnostic, Expr, Location, Stmt, SourceText, FunctionSource, SwitchClause, VarStmt } from "./syntax.js";

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
// Internal handoff: only a fresh parse can populate retained nodes.
// The public planner supplies no retention object.
export function parseDeclarationPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null = null): DeclarationPlanResult {
    return parseStructuralPlan(unit, nodes, false);
}
export function parseBoundedScriptDeclarationPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null = null): DeclarationPlanResult {
    return parseStructuralPlan(unit, nodes, true);
}
// Preparation alone may certify bounded rules after full-source parsing.
export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {
    const original = parseStructuralPlan(unit, nodes, true, true);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.duplicate-parameter") return original;
    // A failed duplicate-formal parse only permits a fresh rejection-only audit.
    // Its retained nodes remain untouched; the continuation cannot produce a plan.
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, null, true, true);
    if (parsed.kind === "blocked") return original;
    const rejection = collectBoundedScriptParameterRejection(source, parsed.body, parsed.tokens, parsed.bindings);
    return rejection === null ? original : rejection;
}
function parseStructuralPlan(unit: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean, certifyBlockFunctions = false): DeclarationPlanResult {
    const source = { id: unit.id, text: unit.text };
    const parsed = parseStructuralSource(source, nodes, bounded);
    if (parsed.kind === "blocked") return parsed;
    if (certifyBlockFunctions) {
        if (nodes === null) throw new Error("preparation requires retained nodes");
        return collectBoundedScriptPreparation(source, parsed.body, parsed.tokens, parsed.bindings, nodes);
    }
    return collectDeclarationPlan(source, parsed.body, parsed.tokens, parsed.bindings, nodes, bounded);
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
type StructuralSource =
    | { kind: "parsed"; body: Stmt[]; tokens: Token[]; bindings: Map<number, ParsedBinding[]> }
    | { kind: "blocked"; goal: "Script"; unit: ScriptSourceUnit; rejection: Rejection; diagnostic: Diagnostic };
// One lexical/parser path for both public plans and non-emitting audit evidence.
function parseStructuralSource(source: ScriptSourceUnit, nodes: DeclarationNodes | null, bounded: boolean, parameterAudit = false): StructuralSource {
    if (parameterAudit && (!bounded || nodes !== null)) throw new Error("invalid parameter audit purpose");
    const lexical = lex(source.text, true);
    if (lexical.error !== null) {
        if (lexical.rejection === null) throw new Error("missing lexer rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: lexical.rejection, diagnostic: lexical.error };
    }
    const parserSource: SourceText = { text: source.text };
    if (nodes !== null) nodes.source = parserSource;
    const parser = new Parser(lexical.tokens, parserSource, parameterAudit ? "bounded-parameter-audit" : bounded ? "bounded-plan" : "declaration-plan");
    const parsed = parser.program();
    if (parsed.error !== null) {
        if (parsed.rejection === null) throw new Error("missing parser rejection");
        return { kind: "blocked", goal: "Script", unit: source, rejection: parsed.rejection, diagnostic: parsed.error };
    }
    if (parser.current().kind !== "eof" || parser.current().start !== source.text.length || parser.current().end !== source.text.length) throw new Error("declaration plan did not reach EOF");
    if (nodes !== null) nodes.assignmentNameEligible = parser.assignmentNameEligible;
    return { kind: "parsed", body: parsed.body, tokens: lexical.tokens, bindings: parser.bindings };
}
class Parser {
    readonly assignmentNameEligible = new Map<Expr, boolean>();
    private readonly parenthesized = new Map<Expr, boolean>();
    readonly bindings = new Map<number, ParsedBinding[]>();
    index = 0;
    depth = 0;
    functions = 0;
    loops = 0;
    switches = 0;
    error: Diagnostic | null = null;
    rejection: Rejection | null = null;
    readonly returnCandidates: ReturnCandidate[] = [];
    constructor(public tokens: Token[], readonly source: SourceText, private readonly purpose: "legacy" | "return-audit" | "declaration-plan" | "bounded-plan" | "bounded-parameter-audit" = "legacy") {}
    private structuralPlan(): boolean { return this.purpose === "declaration-plan" || this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit"; }
    private boundedPlan(): boolean { return this.purpose === "bounded-plan" || this.purpose === "bounded-parameter-audit"; }
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
    name(): string {
        const t = this.take();
        if (t.kind !== "word" || RESERVED.includes(" " + t.text + " ")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.binding-identifier" }, "expected binding identifier", t.loc);
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
    branch(): Stmt {
        if (this.at("let") || this.at("function")) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.declaration-statement" }, "declarations require a block", this.current().loc);
        return this.statement();
    }
    statementInner(): Stmt {
        const start = this.current().start;
        const loc = this.current().loc;
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
            return { kind: "try-catch", loc, block, handler,
                parameter: { name, start: token.start, end: token.end, loc: token.loc },
                catchLoc: catchToken.loc, catchStart: catchToken.start, catchEnd: this.tokens[this.index - 1].end };
        }
        if (this.eat("let")) {
            const binding = this.binding(0);
            this.expect(";");
            if (this.structuralPlan()) this.bindings.set(start, [binding]);
            return { kind: "let", loc, name: binding.site.name, init: binding.init };
        }
        if (this.structuralPlan() && this.at("var")) {
            const declaration = this.varDeclaration(true);
            this.expect(";");
            return declaration;
        }
        if (this.eat("function")) {
            const token = this.current();
            const name = this.name();
            if (this.structuralPlan()) this.bindings.set(start, [{ site: { name, start: token.start, end: token.end, loc: token.loc }, init: null, initializer: null }]);
            const fn = this.functionTail(loc, start);
            return { kind: "function", loc, name, params: fn.params, body: fn.body, source: fn.source };
        }
        if (this.eat("if")) {
            this.expect("(");
            const test = this.expression(0);
            this.expect(")");
            const consequent = this.branch();
            const alternate = this.eat("else") ? this.branch() : null;
            return { kind: "if", loc, test, consequent, alternate };
        }
        if (this.structuralPlan() && this.eat("for")) {
            this.expect("(");
            let initializer: VarStmt | Expr | null = null;
            if (this.at("var")) initializer = this.varDeclaration(false);
            else if (!this.at(";")) initializer = this.expression(0, false);
            this.expect(";");
            const test = this.at(";") ? null : this.expression(0);
            this.expect(";");
            const update = this.at(")") ? null : this.expression(0);
            this.expect(")");
            this.loops++;
            const body = this.branch();
            this.loops--;
            return { kind: "for", loc, initializer, test, update, body };
        }
        if (this.eat("while")) {
            this.expect("(");
            const test = this.expression(0);
            this.expect(")");
            this.loops++;
            const body = this.branch();
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
            if (this.current().loc.line !== loc.line && !this.at(";")) {
                this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.line-terminator" }, "newline after return/throw is unsupported", loc);
            }
            const value = this.at(";") ? null : this.expression(0);
            if (kind === "throw" && value === null) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.throw-expression" }, "throw requires an expression", loc);
            this.expect(";");
            return { kind, loc, value };
        }
        if (this.at("break") || this.at("continue")) {
            const kind = this.take().text === "break" ? "break" : "continue";
            if (this.loops === 0 && (kind === "continue" || this.switches === 0)) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.loop-context" }, kind + " outside loop", loc);
            this.expect(";");
            return { kind, loc };
        }
        const expression = this.expression(0);
        this.expect(";");
        return { kind: "expression", loc, expression };
    }
    varDeclaration(allowIn: boolean): VarStmt {
        const token = this.take();
        const bindings: ParsedBinding[] = [];
        do { bindings.push(this.binding(1, allowIn)); } while (this.error === null && this.eat(","));
        this.bindings.set(token.start, bindings);
        return { kind: "var", loc: token.loc, declarations: bindings.map(binding => ({ name: binding.site.name, init: binding.init })) };
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
    functionTail(loc: Location, start: number): { params: string[]; body: Stmt[]; source: FunctionSource } {
        this.expect("(");
        const params: string[] = [];
        if (!this.at(")")) {
            do {
                const name = this.name();
                if (params.includes(name) && this.purpose !== "bounded-parameter-audit") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.duplicate-parameter" }, "duplicate parameter: " + name, loc);
                params.push(name);
            } while (this.error === null && this.eat(","));
        }
        this.expect(")");
        this.expect("{");
        const loops = this.loops;
        const switches = this.switches;
        this.loops = 0;
        this.switches = 0;
        this.functions++;
        const body = this.list(true, params);
        this.functions--;
        this.loops = loops;
        this.switches = switches;
        return { params, body, source: { source: this.source, start, end: this.tokens[this.index - 1].end } };
    }
    precedence(op: string): number {
        if (op === "=" || op === "+=" || op === "-=" || op === "*=" || op === "/=" || op === "%=") return 1;
        if (op === "?") return 2;
        if (op === "||") return 3;
        if (op === "&&") return 4;
        if (op === "===" || op === "!==" || op === "==" || op === "!=") return 5;
        if (op === "<" || op === ">" || op === "<=" || op === ">=" || op === "in" || op === "instanceof") return 6;
        if (op === "+" || op === "-") return 7;
        if (op === "*" || op === "/" || op === "%") return 8;
        return 0;
    }
    expression(min: number, allowIn = true): Expr {
        const loc = this.current().loc;
        if (++this.depth > 128) {
            this.fail({ kind: "resource-limit", guardCode: "parse-depth", count: this.depth, limit: 128 }, "syntax nesting limit exceeded", loc);
            this.depth--;
            return { kind: "literal", loc, value: null };
        }
        let left = this.primary(allowIn);
        // A unary operand may already have consumed the postfix token. Its
        // enclosing expression must not reopen the member/call suffix chain.
        const lastPrimaryToken = this.tokens[this.index - 1];
        let updated = lastPrimaryToken.kind === "punct" && lastPrimaryToken.text === "++";
        while (this.error === null) {
            if (!updated && this.eat(".")) {
                const key = this.take();
                if (key.kind !== "word") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.property-name" }, "expected property name", key.loc);
                left = { kind: "member", loc, base: left, key: { kind: "literal", loc: key.loc, value: key.text } };
                continue;
            }
            if (!updated && this.eat("[")) {
                const key = this.expression(0);
                this.expect("]");
                left = { kind: "member", loc, base: left, key };
                continue;
            }
            if (!updated && this.eat("(")) {
                const args: Expr[] = [];
                if (!this.at(")")) {
                    do {
                        args.push(this.expression(0));
                    } while (this.error === null && this.eat(","));
                }
                this.expect(")");
                left = { kind: "call", loc, callee: left, args };
                continue;
            }
            if (!updated && this.structuralPlan() && this.at("++")) {
                const previous = this.tokens[this.index - 1];
                const increment = this.take();
                if (increment.loc.line !== previous.loc.line) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.line-terminator" }, "newline before postfix increment is unsupported", increment.loc);
                if (left.kind !== "identifier" && left.kind !== "member") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid increment target", left.loc);
                left = { kind: "postfix-increment", loc: left.loc, target: left };
                updated = true;
                continue;
            }
            const op = this.current().text;
            if (!allowIn && op === "in") break;
            const operator = this.current().kind === "punct" || (this.current().kind === "word" && (op === "in" || (this.structuralPlan() && op === "instanceof")));
            const precedence = operator ? this.precedence(op) : 0;
            if (precedence === 0 || precedence < min) break;
            this.take();
            if (op === "?") {
                // Both arms are AssignmentExpressions. Parsing them at assignment
                // precedence also makes nested conditionals associate to the right.
                const consequent = this.expression(1);
                this.expect(":");
                const alternate = this.expression(1, allowIn);
                left = { kind: "conditional", loc, test: left, consequent, alternate };
                continue;
            }
            const right = this.expression(precedence === 1 ? precedence : precedence + 1, allowIn);
            if (precedence === 1) {
                if (left.kind !== "identifier" && left.kind !== "member") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.assignment-target" }, "invalid assignment target", loc);
                if (op === "=") {
                    const eligible = left.kind === "identifier" && !this.parenthesized.has(left);
                    left = { kind: "assign", loc, target: left, value: right };
                    if (this.structuralPlan()) this.assignmentNameEligible.set(left, eligible);
                }
                else {
                    let binaryOp: "+" | "-" | "*" | "/" | "%" = "+";
                    if (op === "-=") binaryOp = "-";
                    else if (op === "*=") binaryOp = "*";
                    else if (op === "/=") binaryOp = "/";
                    else if (op === "%=") binaryOp = "%";
                    left = { kind: "compound", loc, target: left, value: right, op: binaryOp };
                }
            } else left = { kind: "binary", loc, op, left, right };
        }
        this.depth--;
        return left;
    }
    primary(allowIn: boolean): Expr {
        const t = this.take();
        const loc = t.loc;
        if (t.kind === "word" && t.text === "new" && this.structuralPlan()) {
            const first = this.current();
            // Only primary/member syntax here; parentheses can contain calls.
            if ((first.kind === "word" || first.kind === "punct") && ["new", "-", "+", "!", "delete", "typeof", "void"].includes(first.text)) {
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
            const args: Expr[] = [];
            if (this.eat("(")) {
                if (!this.at(")")) {
                    do { args.push(this.expression(0)); } while (this.error === null && this.eat(","));
                }
                this.expect(")");
            }
            return { kind: "new", loc, callee, args };
        }
        if (t.kind === "number") return { kind: "literal", loc, value: Number(t.text) };
        if (t.kind === "string") return { kind: "literal", loc, value: t.text };
        if (t.text === "true" || t.text === "false") return { kind: "literal", loc, value: t.text === "true" };
        if (t.text === "null") return { kind: "literal", loc, value: null };
        if (t.text === "this") return { kind: "this", loc };
        if (t.text === "function") {
            const fn = this.functionTail(loc, t.start);
            return { kind: "function", loc, params: fn.params, body: fn.body, source: fn.source };
        }
        if (t.text === "(") {
            const expr = this.expression(0);
            this.expect(")");
            if (this.structuralPlan()) this.parenthesized.set(expr, true);
            return expr;
        }
        if (t.text === "!" || t.text === "-" || t.text === "+" || t.text === "delete" || t.text === "typeof" || t.text === "void") {
            const operand = this.expression(9, allowIn);
            // Parentheses preserve identifiers. The bounded collector validates
            // their inherited mode after whole-source grammar coverage.
            if (t.text === "delete" && operand.kind === "identifier" && !this.boundedPlan()) this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.delete-identifier" }, "delete of an identifier is not allowed", loc);
            return { kind: "unary", loc, op: t.text, operand };
        }
        if (t.text === "[") {
            const elements: (Expr | null)[] = [];
            while (this.error === null && !this.at("]")) {
                if (this.eat(",")) {
                    elements.push(null);
                    continue;
                }
                if (this.at(".")) {
                    this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.array-spread" }, "array spread is unsupported", this.current().loc);
                    break;
                }
                elements.push(this.expression(1));
                if (!this.eat(",")) break;
            }
            this.expect("]");
            return { kind: "array", loc, elements };
        }
        if (t.text === "{") {
            const keys: string[] = [];
            const values: Expr[] = [];
            if (!this.at("}")) {
                do {
                    const key = this.take();
                    if (key.kind !== "word" && key.kind !== "string") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.object-key" }, "expected string property name", key.loc);
                    if (key.text === "__proto__") this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.prototype-literal" }, "prototype literal syntax is unsupported", key.loc);
                    keys.push(key.text);
                    this.expect(":");
                    values.push(this.expression(0));
                } while (this.error === null && this.eat(","));
            }
            this.expect("}");
            return { kind: "object", loc, keys, values };
        }
        if (t.kind === "word" && !RESERVED.includes(" " + t.text + " ")) return { kind: "identifier", loc, name: t.text };
        this.fail({ kind: "unsupported-syntax", capabilityCode: "parse.unexpected" }, "unsupported or unexpected syntax: " + t.text, loc);
        return { kind: "literal", loc, value: null };
    }
}
