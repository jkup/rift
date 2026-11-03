class Legacy { readonly name: string; constructor(name: string) { this.name = name; } }
class Local { readonly kind = "local"; readonly outer: Chain; constructor(outer: Chain) { this.outer = outer; } }
type Chain = Local | { kind: "global"; name: string };
function valid(value: Chain): boolean { return value.kind === "global" || value.kind === "local"; }
const legacy = new Legacy(process.argv[2] ?? "seed");
console.log(valid(legacy as unknown as Chain));
