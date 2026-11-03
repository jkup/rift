import "./reachability-class.js";
import type { Opaque } from "./reachability-class.js";
type Callable = Opaque | { kind: "builtin"; value: number };
function read(callable: Callable): number {
    return callable.kind === "builtin" ? callable.value : callable.read();
}
console.log(read({ kind: "builtin", value: Number(process.argv[2] ?? "11") }));
