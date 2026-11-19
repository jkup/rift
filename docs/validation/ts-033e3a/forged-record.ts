class Branded {
    #value: number;
    constructor(value: number) { this.#value = value; }
    get kind(): "branded" { return "branded"; }
    get value(): number { return this.#value; }
    static check(value: Branded): boolean { return value instanceof Branded; }
}
const fake = { kind: "branded", value: Number(process.argv[2] ?? "7") };
console.log(Branded.check(fake as unknown as Branded));
