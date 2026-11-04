import { GuestObject } from "../../../../src/runtime.js";
function matches(o: GuestObject): boolean {
    return o.callable !== null && o.callable.kind === "script-guest" && o.constructorSlot === o.callable;
}
console.log(matches(new GuestObject()));
