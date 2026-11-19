type Site = { kind: "binding"; name: string };
type Pattern = { pattern: string; bindings: Site[] };
function same(parameter: Site | null, node: Site | Pattern): boolean {
    if ("pattern" in node) return parameter === null;
    return parameter !== null && parameter === node;
}
type Abrupt = { type: "throw"; value: number };
type ValueResult = { type: "normal"; value: number } | Abrupt;
type StatementResult = { type: "normal"; payload: string } | Abrupt;
function convert(result: ValueResult): StatementResult {
    if (result.type === "throw") { const abrupt: Abrupt = result; return abrupt; }
    return { type: "normal", payload: "ok" };
}
const site: Site = { kind: "binding", name: "x" };
if (!same(site, site) || same(null, site) || !same(null, { pattern: "object", bindings: [] })) throw new Error("identity");
const result = convert({ type: "throw", value: 7 });
if (result.type !== "throw" || result.value !== 7) throw new Error("completion");
console.log("catch union probe passed");
