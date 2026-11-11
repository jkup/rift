type Atom = { kind: "dot" } | { kind: "reference"; index: number }
    | { kind: "assertion"; name: string } | { kind: "named"; name: string };
type Instruction = { kind: "dot" } | { kind: "reference"; index: number }
    | { kind: "assertion"; name: string } | { kind: "named"; indices: number[] };
const instructions: Instruction[] = [];
function emit(instruction: Instruction): void { instructions.push(instruction); }
function compile(atom: Atom): void {
    if (atom.kind === "named") emit({ kind: "named", indices: [1] });
    else emit(atom);
}
compile({ kind: "dot" });
console.log(instructions[0].kind);
