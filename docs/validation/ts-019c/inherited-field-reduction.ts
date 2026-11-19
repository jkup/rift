class Base { readonly field: number = 1; }
class Child extends Base {
    field: number;
    constructor() { super(); this.field = 2; }
}
console.log(new Child().field);
