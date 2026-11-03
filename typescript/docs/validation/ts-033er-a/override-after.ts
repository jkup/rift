type DataUpdate = { value?: number; writable?: boolean };
type PropertyUpdate = DataUpdate & { get?: number; set?: number };
class Base {
    define(desc: PropertyUpdate): number { return desc.value === undefined ? 0 : desc.value; }
}
class Derived extends Base {
    define(desc: PropertyUpdate): number { return super.define(desc); }
}
const target: Base = new Derived();
console.log(target.define({ value: 7 }));
