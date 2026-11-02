type Resource = { kind: "resource"; count: number };
type Origin = Resource | { kind: "guest" };
type Observation = Resource | { kind: "throw"; valueKind: string };
function project(origin: Origin): Observation {
    if (origin.kind === "resource") return origin;
    return { kind: "throw", valueKind: "string" };
}
function same(origin: Origin): boolean { return project(origin) === origin; }
console.log(same({ kind: "resource", count: 1 }));
