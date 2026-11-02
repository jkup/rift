type Resource = { kind: "resource"; count: number };
type Origin = Resource | { kind: "guest" };
type Observation = Resource | { kind: "throw"; valueKind: string };
function project(origin: Origin): Observation {
    if (origin.kind === "resource") return origin;
    return { kind: "throw", valueKind: "string" };
}
function same(origin: Origin): boolean {
    const projected = project(origin);
    return projected.kind === "resource" && origin.kind === "resource" && projected === origin;
}
console.log(same({ kind: "resource", count: 1 }));
