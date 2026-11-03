// Reduced proposed parser seam: discriminated AST identity keys, not strings.
type Expr = { kind: "identifier"; name: string }
    | { kind: "assign"; target: Expr; value: Expr };
const name = process.argv[2] ?? "seed";
const target: Expr = { kind: "identifier", name };
const equalText: Expr = { kind: "identifier", name };
const parentheses = new Map<Expr, boolean>();
parentheses.set(target, true);
const assignment: Expr = { kind: "assign", target, value: equalText };
const eligibility = new Map<Expr, boolean>();
eligibility.set(assignment, !parentheses.has(target));
if (!parentheses.has(target) || parentheses.has(equalText) || eligibility.get(assignment) !== false)
    throw new Error("AST key identity");
console.log(name + "|false|distinct");
