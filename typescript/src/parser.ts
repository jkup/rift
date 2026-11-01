import { lex, type Token } from "./lexer.js";
import type { Diagnostic, Expr, Location, Stmt } from "./syntax.js";

const RESERVED = " let function if else while return throw break continue this true false null const var for do new class extends super async await yield import export switch case default try catch finally delete typeof void in instanceof with debugger enum implements interface package private protected public static null eval arguments ";
export type ParseResult = { body: Stmt[]; error: Diagnostic | null };
export function parse(source: string): ParseResult {
    const result = lex(source);
    if (result.error !== null) return { body: [], error: result.error };
    return new Parser(result.tokens).program();
}
class Parser {
    index = 0;
    depth = 0;
    functions = 0;
    loops = 0;
    error: Diagnostic | null = null;
    constructor(public tokens: Token[]) {}
    current(): Token { return this.tokens[this.index]; }
    at(text: string): boolean { const t = this.current(); return t.kind !== "string" && t.kind !== "number" && t.text === text; }
    take(): Token { const t = this.current(); if (t.kind !== "eof") this.index++; return t; }
    eat(text: string): boolean { if (!this.at(text)) return false; this.take(); return true; }
    fail(message: string, loc: Location): void {
        if (this.error === null) this.error = { phase: "parse", name: "SyntaxError", message, loc };
    }
    expect(text: string): void {
        if (!this.eat(text)) this.fail("expected '" + text + "', found '" + this.current().text + "'", this.current().loc);
    }
    name(): string {
        const t = this.take();
        if (t.kind !== "word" || RESERVED.includes(" " + t.text + " ")) this.fail("expected binding identifier", t.loc);
        return t.text;
    }
    program(): ParseResult { const body = this.list(false, []); return { body, error: this.error }; }
    list(braced: boolean, parameters: string[]): Stmt[] {
        const body: Stmt[] = [];
        const names = parameters.slice();
        while (this.error === null && this.current().kind !== "eof" && !(braced && this.at("}"))) {
            const stmt = this.statement();
            if (stmt.kind === "let" || stmt.kind === "function") {
                if (names.includes(stmt.name)) this.fail("duplicate binding: " + stmt.name, stmt.loc);
                names.push(stmt.name);
            }
            body.push(stmt);
        }
        if (braced) this.expect("}");
        return body;
    }
    statement(): Stmt {
        const loc = this.current().loc;
        if (++this.depth > 128) { this.fail("syntax nesting limit exceeded", loc); this.depth--; return { kind: "empty", loc }; }
        const result = this.statementInner();
        this.depth--;
        return result;
    }
    branch(): Stmt {
        if (this.at("let") || this.at("function")) this.fail("declarations require a block", this.current().loc);
        return this.statement();
    }
    statementInner(): Stmt {
        const loc = this.current().loc;
        if (this.eat(";")) return { kind: "empty", loc };
        if (this.eat("{")) return { kind: "block", loc, body: this.list(true, []) };
        if (this.eat("let")) {
            const name = this.name();
            const init = this.eat("=") ? this.expression(0) : null;
            this.expect(";");
            return { kind: "let", loc, name, init };
        }
        if (this.eat("function")) {
            const name = this.name();
            const fn = this.functionTail(loc);
            return { kind: "function", loc, name, params: fn.params, body: fn.body };
        }
        if (this.eat("if")) {
            this.expect("("); const test = this.expression(0); this.expect(")");
            const consequent = this.branch();
            const alternate = this.eat("else") ? this.branch() : null;
            return { kind: "if", loc, test, consequent, alternate };
        }
        if (this.eat("while")) {
            this.expect("("); const test = this.expression(0); this.expect(")");
            this.loops++; const body = this.branch(); this.loops--;
            return { kind: "while", loc, test, body };
        }
        if (this.at("return") || this.at("throw")) {
            const kind = this.take().text === "return" ? "return" : "throw";
            if (kind === "return" && this.functions === 0) this.fail("return outside function", loc);
            if (this.current().loc.line !== loc.line && !this.at(";")) this.fail("newline after return/throw is unsupported", loc);
            const value = this.at(";") ? null : this.expression(0);
            if (kind === "throw" && value === null) this.fail("throw requires an expression", loc);
            this.expect(";"); return { kind, loc, value };
        }
        if (this.at("break") || this.at("continue")) {
            const kind = this.take().text === "break" ? "break" : "continue";
            if (this.loops === 0) this.fail(kind + " outside loop", loc);
            this.expect(";"); return { kind, loc };
        }
        const expression = this.expression(0); this.expect(";");
        return { kind: "expression", loc, expression };
    }
    functionTail(loc: Location): { params: string[]; body: Stmt[] } {
        this.expect("("); const params: string[] = [];
        if (!this.at(")")) {
            do {
                const name = this.name();
                if (params.includes(name)) this.fail("duplicate parameter: " + name, loc);
                params.push(name);
            } while (this.error === null && this.eat(","));
        }
        this.expect(")"); this.expect("{");
        const loops = this.loops; this.loops = 0; this.functions++;
        const body = this.list(true, params);
        this.functions--; this.loops = loops;
        return { params, body };
    }
    precedence(op: string): number {
        if (op === "=") return 1;
        if (op === "||") return 2;
        if (op === "&&") return 3;
        if (op === "===" || op === "!==") return 4;
        if (op === "<" || op === ">" || op === "<=" || op === ">=") return 5;
        if (op === "+" || op === "-") return 6;
        if (op === "*" || op === "/" || op === "%") return 7;
        return 0;
    }
    expression(min: number): Expr {
        const loc = this.current().loc;
        if (++this.depth > 128) {
            this.fail("syntax nesting limit exceeded", loc); this.depth--;
            return { kind: "literal", loc, value: null };
        }
        let left = this.primary();
        while (this.error === null) {
            if (this.eat(".")) {
                const key = this.take();
                if (key.kind !== "word") this.fail("expected property name", key.loc);
                left = { kind: "member", loc, base: left, key: { kind: "literal", loc: key.loc, value: key.text } };
                continue;
            }
            if (this.eat("[")) {
                const key = this.expression(0); this.expect("]");
                left = { kind: "member", loc, base: left, key }; continue;
            }
            if (this.eat("(")) {
                const args: Expr[] = [];
                if (!this.at(")")) do { args.push(this.expression(0)); } while (this.error === null && this.eat(","));
                this.expect(")"); left = { kind: "call", loc, callee: left, args }; continue;
            }
            const op = this.current().text;
            const precedence = this.current().kind === "punct" ? this.precedence(op) : 0;
            if (precedence === 0 || precedence < min) break;
            this.take();
            const right = this.expression(op === "=" ? precedence : precedence + 1);
            if (op === "=") {
                if (left.kind !== "identifier" && left.kind !== "member") this.fail("invalid assignment target", loc);
                left = { kind: "assign", loc, target: left, value: right };
            } else left = { kind: "binary", loc, op, left, right };
        }
        this.depth--; return left;
    }
    primary(): Expr {
        const t = this.take(); const loc = t.loc;
        if (t.kind === "number") return { kind: "literal", loc, value: Number(t.text) };
        if (t.kind === "string") return { kind: "literal", loc, value: t.text };
        if (t.text === "true" || t.text === "false") return { kind: "literal", loc, value: t.text === "true" };
        if (t.text === "null") return { kind: "literal", loc, value: null };
        if (t.text === "this") return { kind: "this", loc };
        if (t.text === "function") {
            const fn = this.functionTail(loc); return { kind: "function", loc, params: fn.params, body: fn.body };
        }
        if (t.text === "(" ) { const expr = this.expression(0); this.expect(")"); return expr; }
        if (t.text === "!" || t.text === "-" || t.text === "+") return { kind: "unary", loc, op: t.text, operand: this.expression(8) };
        if (t.text === "{") {
            const keys: string[] = []; const values: Expr[] = [];
            if (!this.at("}")) do {
                const key = this.take();
                if (key.kind !== "word" && key.kind !== "string") this.fail("expected string property name", key.loc);
                if (key.text === "__proto__") this.fail("prototype literal syntax is unsupported", key.loc);
                keys.push(key.text); this.expect(":"); values.push(this.expression(0));
            } while (this.error === null && this.eat(","));
            this.expect("}"); return { kind: "object", loc, keys, values };
        }
        if (t.kind === "word" && !RESERVED.includes(" " + t.text + " ")) return { kind: "identifier", loc, name: t.text };
        this.fail("unsupported or unexpected syntax: " + t.text, loc);
        return { kind: "literal", loc, value: null };
    }
}
