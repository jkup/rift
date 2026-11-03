class Context {
    value: { realm: number };
    constructor(readonly realm: number) { this.value = { realm: this.realm }; }
}
console.log(new Context(Number(process.argv[2])).value.realm);
