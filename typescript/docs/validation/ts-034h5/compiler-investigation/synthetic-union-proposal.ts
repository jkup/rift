class ScriptFunction { readonly kind = "script"; constructor(readonly id: number) {} }
class BuiltinFunction { readonly kind = "builtin"; constructor(readonly name: string) {} }
type Callable = ScriptFunction | BuiltinFunction;
class ObjectSlots {
    constructor(readonly callable: Callable | null, readonly constructorSlot: ScriptFunction | null) {}
}
function matches(o: ObjectSlots): boolean {
    return o.callable !== null && o.callable.kind === "script" && o.constructorSlot === o.callable;
}
const script = new ScriptFunction(1);
console.log(matches(new ObjectSlots(script, script)), matches(new ObjectSlots(new BuiltinFunction("f"), null)));
