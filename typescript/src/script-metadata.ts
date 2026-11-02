import { lex, type Token } from "./lexer.js";
import { parse } from "./parser.js";
import type { Rejection } from "./outcomes.js";
import type { Expr, Stmt, FunctionSource, Location } from "./syntax.js";

// IDs are opaque host identities (including unit order when appropriate).
// The host verifies hashes; this API neither normalizes nor rewrites source.
export type ScriptSourceUnit = { readonly id: string; readonly text: string };
export type DirectiveMetadata = {
    readonly start: number; readonly end: number; readonly statementEnd: number;
    readonly loc: Readonly<Location>; readonly raw: string; readonly useStrict: boolean;
};
export type StrictnessMetadata = {
    readonly ownStrict: boolean; readonly inheritedStrict: boolean; readonly strict: boolean;
    readonly directives: readonly DirectiveMetadata[];
};
export type FunctionMetadata = {
    readonly start: number; readonly end: number; readonly bodyStart: number;
    readonly loc: Readonly<Location>; readonly enclosingFunctionStart: number | null;
    readonly strictness: StrictnessMetadata;
};
export type ScriptInspection =
    | { readonly kind: "complete"; readonly goal: "Script"; readonly unit: ScriptSourceUnit;
        readonly consumedUnits: number; readonly strictness: StrictnessMetadata;
        readonly functions: readonly FunctionMetadata[] }
    | { readonly kind: "blocked"; readonly goal: "Script"; readonly unit: ScriptSourceUnit;
        readonly rejection: Readonly<Rejection>;
        readonly diagnostic: { readonly phase: "parse" | "runtime"; readonly name: string;
            readonly message: string; readonly loc: Readonly<Location> } };

// Complete means only full coverage by the existing bounded parser. Neither
// strictness nor completeness grants execution eligibility or certifies errors.
export function inspectScript(unit: ScriptSourceUnit): ScriptInspection {
    const source: ScriptSourceUnit = { id: unit.id, text: unit.text };
    const parsed = parse(source.text);
    if (parsed.error !== null) {
        if (parsed.rejection === null) throw new Error("missing parser rejection");
        return { kind: "blocked", goal: "Script", unit: source,
            rejection: parsed.rejection, diagnostic: parsed.error };
    }
    // A second lexical pass keeps all legacy parser results and AST types intact.
    // The parser is the sole grammar gate; tokens only recover raw spelling and
    // parentheses that the existing AST intentionally erases.
    const tokens = lex(source.text).tokens;
    const collector = new MetadataCollector(source.text, tokens);
    const strictness = collector.prologue(0, false);
    collector.statements(parsed.body, strictness.strict, null);
    return { kind: "complete", goal: "Script", unit: source,
        consumedUnits: source.text.length, strictness, functions: collector.functions };
}

class MetadataCollector {
    readonly functions: FunctionMetadata[] = [];
    constructor(readonly text: string, readonly tokens: Token[]) {}

    prologue(index: number, inheritedStrict: boolean): StrictnessMetadata {
        const directives: DirectiveMetadata[] = [];
        let ownStrict = false;
        // In the admitted grammar an unparenthesized StringLiteral immediately
        // followed by ';' is exactly a directive ExpressionStatement. ASI and
        // unsupported escapes have already failed the whole-source parser gate.
        while (this.tokens[index].kind === "string" && this.tokens[index + 1].text === ";" && this.tokens[index + 1].kind === "punct") {
            const token = this.tokens[index];
            const raw = this.text.slice(token.start, token.end);
            const useStrict = raw === '"use strict"' || raw === "'use strict'";
            directives.push({ start: token.start, end: token.end, statementEnd: this.tokens[index + 1].end,
                loc: token.loc, raw, useStrict });
            ownStrict = ownStrict || useStrict;
            index += 2;
        }
        return { ownStrict, inheritedStrict, strict: ownStrict || inheritedStrict, directives };
    }

    functionBody(source: FunctionSource | null, loc: Location, body: Stmt[], inherited: boolean, parent: number | null): void {
        if (source === null) throw new Error("parsed function missing source");
        // Binary search the shared lexer's exact source offsets. Parameter grammar
        // admits only identifiers, so its first opening brace is the body brace.
        let low = 0;
        let high = this.tokens.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.tokens[mid].start < source.start) low = mid + 1;
            else high = mid;
        }
        while (this.tokens[low].text !== "{") low++;
        const bodyStart = this.tokens[low].start;
        const strictness = this.prologue(low + 1, inherited);
        this.functions.push({ start: source.start, end: source.end, bodyStart, loc,
            enclosingFunctionStart: parent, strictness });
        this.statements(body, strictness.strict, source.start);
    }

    statements(body: Stmt[], strict: boolean, parent: number | null): void {
        for (const statement of body) this.statement(statement, strict, parent);
    }
    statement(stmt: Stmt, strict: boolean, parent: number | null): void {
        switch (stmt.kind) {
            case "function": this.functionBody(stmt.source, stmt.loc, stmt.body, strict, parent); break;
            case "block": this.statements(stmt.body, strict, parent); break;
            case "expression": this.expression(stmt.expression, strict, parent); break;
            case "let": if (stmt.init !== null) this.expression(stmt.init, strict, parent); break;
            case "return": case "throw": if (stmt.value !== null) this.expression(stmt.value, strict, parent); break;
            case "if":
                this.expression(stmt.test, strict, parent);
                this.statement(stmt.consequent, strict, parent);
                if (stmt.alternate !== null) this.statement(stmt.alternate, strict, parent);
                break;
            case "while": this.expression(stmt.test, strict, parent); this.statement(stmt.body, strict, parent); break;
            case "empty": case "break": case "continue": break;
        }
    }
    expression(expr: Expr, strict: boolean, parent: number | null): void {
        switch (expr.kind) {
            case "function": this.functionBody(expr.source, expr.loc, expr.body, strict, parent); break;
            case "array": for (const item of expr.elements) if (item !== null) this.expression(item, strict, parent); break;
            case "object": for (const value of expr.values) this.expression(value, strict, parent); break;
            case "unary": this.expression(expr.operand, strict, parent); break;
            case "binary": this.expression(expr.left, strict, parent); this.expression(expr.right, strict, parent); break;
            case "assign": case "compound": this.expression(expr.target, strict, parent); this.expression(expr.value, strict, parent); break;
            case "conditional":
                this.expression(expr.test, strict, parent); this.expression(expr.consequent, strict, parent); this.expression(expr.alternate, strict, parent); break;
            case "member": this.expression(expr.base, strict, parent); this.expression(expr.key, strict, parent); break;
            case "call": this.expression(expr.callee, strict, parent); for (const arg of expr.args) this.expression(arg, strict, parent); break;
            case "literal": case "identifier": case "this": break;
        }
    }
}
