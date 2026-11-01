import type { Expr, Location, Stmt } from "./syntax.js";
import { Environment, GuestObject, UNDEFINED, equal, failure, getValue, normal, putValue, truthy, type Completion, type ReferenceResult, type Value, type OperationContext, type ValueCompletion } from "./runtime.js";
import type { Realm } from "./realm.js";
import { stringConcat } from "./strings.js";
import { GuestArray } from "./array-object.js";
import { toNumber, toString } from "./conversion.js";

export class Evaluator {
    steps = 0;
    calls = 0;
    depth = 0;
    readonly context: OperationContext;
    constructor(realm: Realm, public maxSteps: number = 100000, public maxCalls: number = 64) {
        this.context = {
            realm,
            call: (callee, receiver, args, loc) => this.call(callee, receiver, args, loc),
            tick: (loc) => this.tick(loc),
        };
    }
    tick(loc: Location): ValueCompletion {
        if (++this.steps > this.maxSteps) return failure("RangeError", "execution step limit exceeded", loc);
        return normal();
    }
    closure(params: string[], body: Stmt[], environment: Environment): Value {
        const object = new GuestObject();
        object.callable = { kind: "guest", params, body, environment };
        return { kind: "object", object };
    }
    block(body: Stmt[], env: Environment, receiver: Value): Completion {
        // Instantiate before execution: let bindings start in the TDZ; functions
        // capture this same environment and are callable before their declaration.
        for (const stmt of body) {
            if (stmt.kind === "let" || stmt.kind === "function") {
                if (env.bindings.has(stmt.name)) return failure("SyntaxError", "duplicate binding: " + stmt.name, stmt.loc);
            }
        }
        for (const stmt of body) {
            if (stmt.kind === "let" || stmt.kind === "function") {
                env.bindings.set(stmt.name, { initialized: stmt.kind === "function", mutable: true,
                    value: stmt.kind === "function" ? this.closure(stmt.params, stmt.body, env) : UNDEFINED });
            }
        }
        for (const stmt of body) {
            const result = this.statement(stmt, env, receiver);
            if (result.type !== "normal") return result;
        }
        return normal();
    }
    statement(stmt: Stmt, env: Environment, receiver: Value): Completion {
        const budget = this.tick(stmt.loc);
        if (budget.type !== "normal") return budget;
        if (++this.depth > 256) {
            this.depth--;
            return failure("RangeError", "evaluation nesting limit exceeded", stmt.loc);
        }
        const result = this.statementInner(stmt, env, receiver);
        this.depth--;
        return result;
    }
    statementInner(stmt: Stmt, env: Environment, receiver: Value): Completion {
        switch (stmt.kind) {
            case "empty": case "function": return normal();
            case "expression": return this.evaluate(stmt.expression, env, receiver);
            case "let": {
                const result = stmt.init === null ? normal() : this.evaluate(stmt.init, env, receiver);
                if (result.type !== "normal") return result;
                const binding = env.bindings.get(stmt.name);
                if (binding === undefined) throw new Error("uninstantiated lexical declaration");
                binding.value = result.value;
                binding.initialized = true;
                return normal();
            }
            case "block": return this.block(stmt.body, new Environment(env), receiver);
            case "if": {
                const test = this.evaluate(stmt.test, env, receiver);
                if (test.type !== "normal") return test;
                if (truthy(test.value)) return this.statement(stmt.consequent, env, receiver);
                return stmt.alternate === null ? normal() : this.statement(stmt.alternate, env, receiver);
            }
            case "while": {
                while (true) {
                    const test = this.evaluate(stmt.test, env, receiver);
                    if (test.type !== "normal") return test;
                    if (!truthy(test.value)) return normal();
                    const result = this.statement(stmt.body, env, receiver);
                    if (result.type === "break") return normal();
                    if (result.type !== "normal" && result.type !== "continue") return result;
                }
            }
            case "return": case "throw": {
                const result = stmt.value === null ? normal() : this.evaluate(stmt.value, env, receiver);
                if (result.type !== "normal") return result;
                if (stmt.kind === "return") return { type: "return", value: result.value };
                return { type: "throw", value: result.value, diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: stmt.loc } };
            }
            case "break": case "continue": return { type: stmt.kind, value: UNDEFINED };
        }
    }
    reference(expr: Expr, env: Environment, receiver: Value): ReferenceResult {
        if (expr.kind === "identifier") return { type: "reference", reference: { kind: "binding", environment: env.resolve(expr.name), name: expr.name } };
        if (expr.kind === "member") {
            const base = this.evaluate(expr.base, env, receiver);
            if (base.type !== "normal") return { type: "abrupt", completion: base };
            const key = this.evaluate(expr.key, env, receiver);
            if (key.type !== "normal") return { type: "abrupt", completion: key };
            return { type: "reference", reference: { kind: "property", base: base.value, key: key.value, loc: expr.loc } };
        }
        throw new Error("parser admitted a non-reference target");
    }
    evaluate(expr: Expr, env: Environment, receiver: Value): Completion {
        const budget = this.tick(expr.loc);
        if (budget.type !== "normal") return budget;
        if (++this.depth > 256) {
            this.depth--;
            return failure("RangeError", "evaluation nesting limit exceeded", expr.loc);
        }
        const result = this.expression(expr, env, receiver);
        this.depth--;
        return result;
    }
    expression(expr: Expr, env: Environment, receiver: Value): Completion {
        switch (expr.kind) {
            case "literal": {
                const value = expr.value;
                if (value === null) return normal({ kind: "null" });
                if (typeof value === "number") return normal({ kind: "number", value });
                if (typeof value === "boolean") return normal({ kind: "boolean", value });
                return normal({ kind: "string", value });
            }
            case "this": return normal(receiver);
            case "identifier": case "member": {
                const ref = this.reference(expr, env, receiver);
                return ref.type === "abrupt" ? ref.completion : getValue(ref.reference, expr.loc);
            }
            case "assign": {
                const ref = this.reference(expr.target, env, receiver);
                if (ref.type === "abrupt") return ref.completion;
                const value = this.evaluate(expr.value, env, receiver);
                if (value.type !== "normal") return value;
                return putValue(ref.reference, value.value, expr.loc);
            }
            case "function": return normal(this.closure(expr.params, expr.body, env));
            case "array": {
                const object = new GuestArray();
                for (let i = 0; i < expr.elements.length; i++) {
                    // Holes cost a slot tick too; nested elements share this budget.
                    const budget = this.tick(expr.loc);
                    if (budget.type !== "normal") return budget;
                    const element = expr.elements[i];
                    if (element === null) continue;
                    const value = this.evaluate(element, env, receiver);
                    if (value.type !== "normal") return value;
                    const defined = object.defineOwnProperty(String(i), {
                        value: value.value, writable: true, enumerable: true, configurable: true,
                    }, expr.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh array literal element invariant");
                }
                // Index definitions grow length, but trailing holes do not define keys.
                const length = object.defineOwnProperty("length", {
                    value: { kind: "number", value: expr.elements.length },
                }, expr.loc);
                if (length.type === "throw") return length;
                if (!length.value) throw new Error("fresh array literal length invariant");
                return normal({ kind: "object", object });
            }
            case "object": {
                const object = new GuestObject();
                for (let i = 0; i < expr.keys.length; i++) {
                    const value = this.evaluate(expr.values[i], env, receiver);
                    if (value.type !== "normal") return value;
                    object.define(expr.keys[i], value.value, true, true, true);
                }
                return normal({ kind: "object", object });
            }
            case "call": {
                let thisValue = UNDEFINED;
                let callee: Completion;
                if (expr.callee.kind === "identifier" || expr.callee.kind === "member") {
                    const ref = this.reference(expr.callee, env, receiver);
                    if (ref.type === "abrupt") return ref.completion;
                    callee = getValue(ref.reference, expr.loc);
                    if (ref.reference.kind === "property") thisValue = ref.reference.base;
                } else callee = this.evaluate(expr.callee, env, receiver);
                if (callee.type !== "normal") return callee;
                const args: Value[] = [];
                for (const arg of expr.args) {
                    const value = this.evaluate(arg, env, receiver);
                    if (value.type !== "normal") return value;
                    args.push(value.value);
                }
                return this.call(callee.value, thisValue, args, expr.loc);
            }
            case "unary": {
                const result = this.evaluate(expr.operand, env, receiver);
                if (result.type !== "normal") return result;
                if (expr.op === "!") return normal({ kind: "boolean", value: !truthy(result.value) });
                const number = toNumber(result.value, expr.loc);
                if (number.type === "throw") return number;
                return normal({ kind: "number", value: expr.op === "-" ? -number.value : number.value });
            }
            case "conditional": {
                const test = this.evaluate(expr.test, env, receiver);
                if (test.type !== "normal") return test;
                // Return the chosen arm's value or abrupt completion unchanged.
                if (truthy(test.value)) return this.evaluate(expr.consequent, env, receiver);
                return this.evaluate(expr.alternate, env, receiver);
            }
            case "binary": {
                const left = this.evaluate(expr.left, env, receiver);
                if (left.type !== "normal") return left;
                if (expr.op === "&&" && !truthy(left.value)) return left;
                if (expr.op === "||" && truthy(left.value)) return left;
                const right = this.evaluate(expr.right, env, receiver);
                if (right.type !== "normal") return right;
                if (expr.op === "&&" || expr.op === "||") return right;
                return this.binary(expr.op, left.value, right.value, expr.loc);
            }
        }
    }
    call(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion {
        if (callee.kind !== "object" || callee.object.callable === null) return failure("TypeError", "value is not callable", loc);
        if (this.calls >= this.maxCalls) return failure("RangeError", "call depth limit exceeded", loc);
        this.calls++;
        try {
            const fn = callee.object.callable;
            let result: Completion;
            if (fn.kind === "builtin") result = fn.invoke(receiver, args, this.context, loc);
            else {
                const env = new Environment(fn.environment);
                for (let i = 0; i < fn.params.length; i++) {
                    env.bindings.set(fn.params[i], {
                        initialized: true,
                        mutable: true,
                        value: i < args.length ? args[i] : UNDEFINED,
                    });
                }
                result = this.block(fn.body, env, receiver);
                if (result.type === "return") return normal(result.value);
                if (result.type === "normal") return normal();
            }
            if (result.type === "throw") return result;
            if (result.type === "normal") return normal(result.value);
            throw new Error("invalid completion escaped call boundary: " + result.type);
        } finally {
            // Release active calls even when a host fault escapes.
            this.calls--;
        }
    }
    binary(op: string, left: Value, right: Value, loc: Location): Completion {
        if (op === "+") {
            // Both GetValue operations have completed. Full addition would now
            // perform ToPrimitive with the default hint; objects remain unsupported.
            if (left.kind === "object" || right.kind === "object") {
                return failure("TypeError", "object-to-primitive conversion unsupported", loc);
            }
            if (left.kind === "string" || right.kind === "string") {
                const a = toString(left, loc);
                if (a.type === "throw") return a;
                const b = toString(right, loc);
                if (b.type === "throw") return b;
                return normal({ kind: "string", value: stringConcat(a.value, b.value) });
            }
            const a = toNumber(left, loc);
            if (a.type === "throw") return a;
            const b = toNumber(right, loc);
            if (b.type === "throw") return b;
            return normal({ kind: "number", value: a.value + b.value });
        }
        if (op === "-" || op === "*" || op === "/" || op === "%") {
            // Both operand evaluations/GetValue have finished. Conversion is
            // left-to-right, so an abrupt RHS evaluation precedes either conversion.
            const a = toNumber(left, loc);
            if (a.type === "throw") return a;
            const b = toNumber(right, loc);
            if (b.type === "throw") return b;
            switch (op) {
                case "-": return normal({ kind: "number", value: a.value - b.value });
                case "*": return normal({ kind: "number", value: a.value * b.value });
                case "/": return normal({ kind: "number", value: a.value / b.value });
                case "%": return normal({ kind: "number", value: a.value % b.value });
            }
        }
        if (op === "===" || op === "!==") return normal({ kind: "boolean", value: op === "===" ? equal(left, right) : !equal(left, right) });
        if (left.kind !== "number" || right.kind !== "number") return failure("TypeError", "numeric operands required (coercion unsupported)", loc);
        const a = left.value;
        const b = right.value;
        switch (op) {
            case "<": return normal({ kind: "boolean", value: a < b });
            case ">": return normal({ kind: "boolean", value: a > b });
            case "<=": return normal({ kind: "boolean", value: a <= b });
            case ">=": return normal({ kind: "boolean", value: a >= b });
        }
        throw new Error("unknown binary operator: " + op);
    }
}
