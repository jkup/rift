// Probe: the smallest real engine slice. A recursive AST union, lexical
// environments chained by reference, closures capturing their environment,
// and explicit completion records for return. If this compiles natively,
// the core of a tree-walking interpreter does.

type Node =
    | { type: "num"; value: number }
    | { type: "ident"; name: string }
    | { type: "binary"; op: string; left: Node; right: Node }
    | { type: "let"; name: string; init: Node }
    | { type: "assign"; name: string; value: Node }
    | { type: "fn"; params: string[]; body: Node[] }
    | { type: "call"; callee: Node; args: Node[] }
    | { type: "return"; value: Node }
    | { type: "while"; test: Node; body: Node[] }
    | { type: "if"; test: Node; then: Node[]; else: Node[] }
    | { type: "print"; value: Node };

class Closure {
    params: string[];
    body: Node[];
    env: Environment;
    constructor(params: string[], body: Node[], env: Environment) {
        this.params = params;
        this.body = body;
        this.env = env;
    }
}

type Value = { kind: "number"; value: number } | { kind: "closure"; closure: Closure };

class Environment {
    bindings: Map<string, Value> = new Map();
    outer: Environment | null;
    constructor(outer: Environment | null) {
        this.outer = outer;
    }

    lookup(name: string): Value {
        let env: Environment | null = this;
        while (env !== null) {
            const v = env.bindings.get(name);
            if (v !== undefined) {
                return v;
            }
            env = env.outer;
        }
        throw new Error(`ReferenceError: ${name} is not defined`);
    }

    assign(name: string, value: Value): void {
        let env: Environment | null = this;
        while (env !== null) {
            if (env.bindings.has(name)) {
                env.bindings.set(name, value);
                return;
            }
            env = env.outer;
        }
        throw new Error(`ReferenceError: ${name} is not defined`);
    }
}

type Completion = { type: "normal" } | { type: "return"; value: Value };

const NORMAL: Completion = { type: "normal" };

function asNumber(v: Value): number {
    if (v.kind !== "number") {
        throw new Error("TypeError: not a number");
    }
    return v.value;
}

function evaluate(node: Node, env: Environment): Value {
    switch (node.type) {
        case "num":
            return { kind: "number", value: node.value };
        case "ident":
            return env.lookup(node.name);
        case "binary": {
            const l = asNumber(evaluate(node.left, env));
            const r = asNumber(evaluate(node.right, env));
            switch (node.op) {
                case "+":
                    return { kind: "number", value: l + r };
                case "-":
                    return { kind: "number", value: l - r };
                case "*":
                    return { kind: "number", value: l * r };
                case "<":
                    return { kind: "number", value: l < r ? 1 : 0 };
            }
            throw new Error(`unknown operator ${node.op}`);
        }
        case "fn":
            return { kind: "closure", closure: new Closure(node.params, node.body, env) };
        case "call": {
            const callee = evaluate(node.callee, env);
            if (callee.kind !== "closure") {
                throw new Error("TypeError: not a function");
            }
            const fnEnv = new Environment(callee.closure.env);
            for (let i = 0; i < callee.closure.params.length; i++) {
                fnEnv.bindings.set(callee.closure.params[i], evaluate(node.args[i], env));
            }
            const completion = executeBlock(callee.closure.body, fnEnv);
            if (completion.type === "return") {
                return completion.value;
            }
            return { kind: "number", value: 0 };
        }
        default:
            throw new Error(`not an expression: ${node.type}`);
    }
}

function execute(node: Node, env: Environment): Completion {
    switch (node.type) {
        case "let":
            env.bindings.set(node.name, evaluate(node.init, env));
            return NORMAL;
        case "assign":
            env.assign(node.name, evaluate(node.value, env));
            return NORMAL;
        case "return":
            return { type: "return", value: evaluate(node.value, env) };
        case "print": {
            const v = evaluate(node.value, env);
            console.log(v.kind === "number" ? String(v.value) : "[closure]");
            return NORMAL;
        }
        case "while":
            while (asNumber(evaluate(node.test, env)) !== 0) {
                const c = executeBlock(node.body, new Environment(env));
                if (c.type === "return") {
                    return c;
                }
            }
            return NORMAL;
        case "if": {
            const branch = asNumber(evaluate(node.test, env)) !== 0 ? node.then : node.else;
            return executeBlock(branch, new Environment(env));
        }
        default:
            evaluate(node, env);
            return NORMAL;
    }
}

function executeBlock(body: Node[], env: Environment): Completion {
    for (const statement of body) {
        const c = execute(statement, env);
        if (c.type !== "normal") {
            return c;
        }
    }
    return NORMAL;
}

// Helpers to build the AST tersely.
const n = (value: number): Node => ({ type: "num", value });
const id = (name: string): Node => ({ type: "ident", name });
const bin = (op: string, left: Node, right: Node): Node => ({ type: "binary", op, left, right });
const call = (callee: Node, args: Node[]): Node => ({ type: "call", callee, args });

// let makeCounter = fn() { let c = 0; return fn() { c = c + 1; return c; }; };
// let counter = makeCounter(); print(counter()); print(counter()); print(counter());
// let fib = fn(k) { if (k < 2) { return k; } else { return fib(k-1) + fib(k-2); } };
// print(fib(20));
// let i = 0; let sum = 0; while (i < 1000) { sum = sum + i; i = i + 1; } print(sum);
const program: Node[] = [
    {
        type: "let",
        name: "makeCounter",
        init: {
            type: "fn",
            params: [],
            body: [
                { type: "let", name: "c", init: n(0) },
                {
                    type: "return",
                    value: {
                        type: "fn",
                        params: [],
                        body: [
                            { type: "assign", name: "c", value: bin("+", id("c"), n(1)) },
                            { type: "return", value: id("c") },
                        ],
                    },
                },
            ],
        },
    },
    { type: "let", name: "counter", init: call(id("makeCounter"), []) },
    { type: "print", value: call(id("counter"), []) },
    { type: "print", value: call(id("counter"), []) },
    { type: "print", value: call(id("counter"), []) },
    {
        type: "let",
        name: "fib",
        init: {
            type: "fn",
            params: ["k"],
            body: [
                {
                    type: "if",
                    test: bin("<", id("k"), n(2)),
                    then: [{ type: "return", value: id("k") }],
                    else: [
                        {
                            type: "return",
                            value: bin(
                                "+",
                                call(id("fib"), [bin("-", id("k"), n(1))]),
                                call(id("fib"), [bin("-", id("k"), n(2))]),
                            ),
                        },
                    ],
                },
            ],
        },
    },
    { type: "print", value: call(id("fib"), [n(20)]) },
    { type: "let", name: "i", init: n(0) },
    { type: "let", name: "sum", init: n(0) },
    {
        type: "while",
        test: bin("<", id("i"), n(1000)),
        body: [
            { type: "assign", name: "sum", value: bin("+", id("sum"), id("i")) },
            { type: "assign", name: "i", value: bin("+", id("i"), n(1)) },
        ],
    },
    { type: "print", value: id("sum") },
];

const global = new Environment(null);
executeBlock(program, global);

try {
    evaluate(id("missing"), global);
} catch (e) {
    console.log("caught:", e instanceof Error ? e.message : "non-error");
}
