import { GuestObject } from "../../../src/runtime.js";
console.log(new GuestObject().getPrototypeOf() === null);
