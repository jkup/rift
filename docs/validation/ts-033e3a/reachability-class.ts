export type { Opaque };
class Opaque {
    #value = 7;
    get kind(): "opaque" { return "opaque"; }
    read(): number { return this.#value; }
}
