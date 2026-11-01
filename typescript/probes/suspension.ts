// Probe: two ways to suspend guest execution. (1) Host generators, which a
// tree walker could use to pause mid-expression. (2) An explicit frame with a
// program counter, which the plan expects to need anyway.

// (1) Host generator delegating through recursion.
function* walk(depth: number): Generator<number, void, number> {
    if (depth === 0) return;
    const received: number = yield depth;
    console.log("  resumed at depth", depth, "with", received);
    yield* walk(depth - 1);
}

const gen = walk(3);
let step = gen.next(0);
let input = 100;
while (!step.done) {
    console.log("yielded", step.value);
    step = gen.next(input++);
}

// Generator return/throw with finally cleanup.
function* withCleanup(): Generator<number, string, void> {
    try {
        yield 1;
        yield 2;
        return "done";
    } finally {
        console.log("  generator finally");
    }
}
const g2 = withCleanup();
console.log(g2.next().value);
console.log("return():", JSON.stringify(g2.return("early")));

// (2) Explicit frame: sum(1..n) with a yield after each addition, resumable
// without re-running earlier side effects.
class Frame {
    pc: number = 0;
    i: number = 1;
    sum: number = 0;
    n: number;
    constructor(n: number) {
        this.n = n;
    }
}

type StepResult = { done: false; value: number } | { done: true; value: number };

function resume(frame: Frame): StepResult {
    while (true) {
        switch (frame.pc) {
            case 0:
                if (frame.i > frame.n) {
                    frame.pc = 2;
                    continue;
                }
                frame.sum += frame.i;
                frame.pc = 1;
                return { done: false, value: frame.sum };
            case 1:
                frame.i += 1;
                frame.pc = 0;
                continue;
            default:
                return { done: true, value: frame.sum };
        }
    }
}

const frame = new Frame(4);
const seen: number[] = [];
let r = resume(frame);
while (!r.done) {
    seen.push(r.value);
    r = resume(frame);
}
console.log("frame yields:", seen.join(","), "final:", r.value);
