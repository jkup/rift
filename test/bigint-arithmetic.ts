import { bigintOperation, type BigIntOperator } from "../src/bigint-arithmetic.js";
import { Realm } from "../src/realm.js";
import { normal, resourceFailure, type OperationContext, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const loc: Location = { line: 3, column: 7 }, realm = new Realm((_line: string) => {}, "script");
const context: OperationContext = { realm, call: (_callee: Value, _receiver: Value, _args: Value[], _loc: Location): ValueCompletion => { throw new Error("primitive arithmetic cannot call guests"); }, tick: (_loc: Location): ValueCompletion => normal() };
function result(op: BigIntOperator, left: bigint, right: bigint, expected: bigint): void {
    const actual = bigintOperation(op, left, right, context, loc);
    check(actual.type === "normal" && actual.value === expected, "BigInt " + op + " result");
}
result("+", 18446744073709551616n, 1n, 18446744073709551617n);
result("-", -18446744073709551616n, 1n, -18446744073709551617n);
result("*", 18446744073709551616n, 18446744073709551616n, 340282366920938463463374607431768211456n);
result("/", -7n, 3n, -2n); result("/", 7n, -3n, -2n); result("/", -7n, -3n, 2n);
result("%", -7n, 3n, -1n); result("%", 7n, -3n, 1n); result("%", -7n, -3n, -1n);
result("**", 0n, 0n, 1n); result("**", -3n, 5n, -243n); result("**", -3n, 6n, 729n);
result("**", 2n, 128n, 340282366920938463463374607431768211456n);
result("&", -1n, 18446744073709551617n, 18446744073709551617n);
result("|", 18446744073709551616n, 3n, 18446744073709551619n);
result("^", -1n, 7n, -8n);
result("<<", -7n, 1n, -14n); result(">>", -7n, 1n, -4n);
result("<<", 8n, -1n, 4n); result(">>", 8n, -1n, 16n);
const enormous = 1n << 512n;
result(">>", 7n, enormous, 0n); result(">>", -7n, enormous, -1n);
result("<<", -7n, -enormous, -1n); result("<<", 0n, enormous, 0n);
result("**", 0n, enormous, 0n); result("**", 1n, enormous, 1n);
result("**", -1n, enormous, 1n); result("**", -1n, enormous + 1n, -1n);
for (const op of ["/", "%", "**", ">>>"] as BigIntOperator[]) {
    const failure = bigintOperation(op, 7n, op === "**" ? -1n : 0n, context, loc);
    const name = op === ">>>" ? "TypeError" : "RangeError";
    check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf() === realm.getErrorPrototype(name), "arithmetic error Realm");
}
for (const op of ["**", "<<", ">>", "*"] as BigIntOperator[]) {
    let count = 0;
    const stopped = resourceFailure("steps", 9, 8, "BigInt work budget", loc);
    const limited: OperationContext = { ...context, tick: (_loc: Location): ValueCompletion => ++count > 8 ? stopped : normal() };
    const result = bigintOperation(op, 7n, op === ">>" ? -enormous : enormous, limited, loc);
    check(result === stopped && count === 9, "enormous arithmetic stops before allocation");
}
console.log("bigint arithmetic passed");
