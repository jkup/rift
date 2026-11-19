// Probe: engines are full of reference cycles (closure <-> environment,
// prototype.constructor <-> constructor). Under reference counting these leak
// unless a cycle collector reclaims them. Allocate many short-lived cycles
// and print the runtime's own memory estimate before and after.

class Env {
    outer: Env | null;
    closure: Fn | null = null;
    payload: number[];
    constructor(outer: Env | null) {
        this.outer = outer;
        this.payload = new Array<number>(64).fill(1);
    }
}

class Fn {
    env: Env;
    constructor(env: Env) {
        this.env = env;
    }
}

function makeCycle(): number {
    const env = new Env(null);
    const fn = new Fn(env);
    env.closure = fn; // env -> fn -> env
    return env.payload.length;
}

function rssMb(): number {
    return Math.round(process.memoryUsage().rss / 1048576);
}

const iterations = Number(process.argv[2] ?? "200000");
const before = rssMb();
let total = 0;
for (let i = 0; i < iterations; i++) total += makeCycle();
const after = rssMb();
console.log("total:", total);
// Printed to stderr so the Node/native output diff only compares semantics.
console.error(`rss before=${before}MB after=${after}MB iterations=${iterations}`);
