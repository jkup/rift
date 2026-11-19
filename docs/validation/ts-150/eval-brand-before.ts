class ProbeCallable { readonly kind = "eval"; constructor(readonly realm: number) {} }
type Callable = ProbeCallable | { kind: "builtin"; realm: number };
class Holder { constructor(readonly callable: Callable | null) {} }
function dispatch(holder: Holder): number {
 if(holder.callable===null) throw new Error("missing");
 const fn=holder.callable;
 if(fn.kind==="eval") { if(!(fn instanceof ProbeCallable)) throw new Error("brand"); return fn.realm; }
 return 0;
}
console.log(dispatch(new Holder(new ProbeCallable(Number(process.argv[2])))));
