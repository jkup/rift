class LocalBindings {
    getBindingValue(name: string, context: number, loc: number, _strict = true): number {
        return name.length + context + loc;
    }
}
class GlobalBindings {
    getBindingValue(name: string, context: number, loc: number, strict = true): number {
        return name.length + context + loc + (strict ? 1 : 0);
    }
}
function read(e: LocalBindings | GlobalBindings): number {
    return e.getBindingValue("x", 2, 3);
}
console.log(read(new LocalBindings()), read(new GlobalBindings()));
