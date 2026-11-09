import { scriptPrologue } from "./script-prologue.js";
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
    collector.collect(parsed.body, strictness.strict);
    return { kind: "complete", goal: "Script", unit: source,
        consumedUnits: source.text.length, strictness, functions: collector.functions };
}

type MetadataWork =
    | { kind: "statement"; node: Stmt; strict: boolean; parent: number | null }
    | { kind: "expression"; node: Expr; strict: boolean; parent: number | null };

class MetadataCollector {
    readonly functions: FunctionMetadata[] = [];
    readonly work: MetadataWork[] = [];
    constructor(readonly text: string, readonly tokens: Token[]) {}

    collect(body: Stmt[], strict: boolean): void {
        this.statements(body, strict, null);
        // Parser depth bounds recursive grammar, not AST height: left-associated
        // binary/member/call chains can be arbitrarily tall within the source cap.
        // Queue children in reverse source order for a non-recursive preorder walk.
        // Each item owns its enclosing context, so siblings cannot inherit a
        // preceding function's directive or parent identity.
        while (this.work.length > 0) {
            const item = this.work.pop();
            if (item === undefined) throw new Error("missing metadata work");
            if (item.kind === "statement") this.visitStatement(item.node, item.strict, item.parent);
            else this.visitExpression(item.node, item.strict, item.parent);
        }
    }

    prologue(index: number, inheritedStrict: boolean): StrictnessMetadata {
        return scriptPrologue(this.text, this.tokens, index, inheritedStrict);
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
        for (let i = body.length - 1; i >= 0; i--) this.statement(body[i], strict, parent);
    }
    statement(stmt: Stmt, strict: boolean, parent: number | null): void {
        this.work.push({ kind: "statement", node: stmt, strict, parent });
    }
    expression(expr: Expr, strict: boolean, parent: number | null): void {
        this.work.push({ kind: "expression", node: expr, strict, parent });
    }
    visitStatement(stmt: Stmt, strict: boolean, parent: number | null): void {
        switch (stmt.kind) {
            case "var": throw new Error("Script var AST requires Script execution");
            case "labelled": throw new Error("Script labelled AST requires Script execution");
            case "const": throw new Error("Script const AST requires Script execution");
            case "function": this.functionBody(stmt.source, stmt.loc, stmt.body, strict, parent); break;
            case "block": this.statements(stmt.body, strict, parent); break;
            case "expression": this.expression(stmt.expression, strict, parent); break;
            case "let": if (stmt.init !== null) this.expression(stmt.init, strict, parent); break;
            case "return": case "throw": if (stmt.value !== null) this.expression(stmt.value, strict, parent); break;
            case "if":
                if (stmt.alternate !== null) this.statement(stmt.alternate, strict, parent);
                this.statement(stmt.consequent, strict, parent);
                this.expression(stmt.test, strict, parent);
                break;
            case "while": this.statement(stmt.body, strict, parent); this.expression(stmt.test, strict, parent); break;
            case "do-while": this.expression(stmt.test, strict, parent); this.statement(stmt.body, strict, parent); break;
            case "empty": case "break": case "continue": break;
        }
    }
    visitExpression(expr: Expr, strict: boolean, parent: number | null): void {
        switch (expr.kind) {
            case "function": this.functionBody(expr.source, expr.loc, expr.body, strict, parent); break;
            case "array":
                for (let i = expr.elements.length - 1; i >= 0; i--) {
                    const item = expr.elements[i];
                    if (item !== null) this.expression(item.kind === "spread" ? item.expression : item, strict, parent);
                }
                break;
            case "object": for (let i = expr.properties.length - 1; i >= 0; i--) this.expression(expr.properties[i].value, strict, parent); break;
            case "template": for (let i = expr.expressions.length - 1; i >= 0; i--) this.expression(expr.expressions[i], strict, parent); break;
            case "unary": this.expression(expr.operand, strict, parent); break;
            case "binary": this.expression(expr.right, strict, parent); this.expression(expr.left, strict, parent); break;
            case "assign": case "compound": this.expression(expr.value, strict, parent); this.expression(expr.target, strict, parent); break;
            case "conditional":
                this.expression(expr.alternate, strict, parent); this.expression(expr.consequent, strict, parent); this.expression(expr.test, strict, parent); break;
            case "destructure": throw new Error("Script pattern AST requires Script metadata");
            case "chain": throw new Error("Script optional chain AST requires Script metadata");
            case "member": this.expression(expr.key, strict, parent); this.expression(expr.base, strict, parent); break;
            case "call":
                for (let i = expr.args.length - 1; i >= 0; i--) {
                    const arg = expr.args[i];
                    this.expression(arg.kind === "spread" ? arg.expression : arg, strict, parent);
                }
                this.expression(expr.callee, strict, parent);
                break;
            case "literal": case "identifier": case "this": break;
        }
    }
}
