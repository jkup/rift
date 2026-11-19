import type { Expr, ArrayElement } from "../../../src/syntax.js";
const grouped = new Set<Expr>();
function isGrouped(expr: Expr): boolean { return grouped.has(expr); }
function inspect(elements: ArrayElement[]): number {
    let count = 0;
    for (const item of elements) {
        if (item === null) continue;
        if (item.kind === "spread") continue;
        if ((item.kind === "assign" || item.kind === "destructure") && !isGrouped(item)) count++;
    }
    return count;
}
const leaf: Expr = { kind: "literal", loc: { line: 1, column: 1 }, value: 1 };
console.log(inspect([null, { kind: "assign", loc: leaf.loc, target: leaf, value: leaf }]));
