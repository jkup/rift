type A = { kind: "a"; count: number };
type U = A | { kind: "b" };
function project(value: U): U { return value; }
function same(value: U): boolean { return project(value) === value; }
console.log(same({ kind: "a", count: 1 }));
