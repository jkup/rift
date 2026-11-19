class Branded {
    #value: number;
    constructor(value: number) { this.#value = value; }
    get kind(): "branded" { return "branded"; }
    get value(): number { return this.#value; }
    static check(value: Branded): boolean { return value instanceof Branded; }
}
class Structural {
    get kind(): "branded" { return "branded"; }
    get value(): number { return 7; }
}
const fake = new Structural();
console.log(Branded.check(fake as unknown as Branded));
