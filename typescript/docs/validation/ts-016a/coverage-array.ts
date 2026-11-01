import "../../../src/array-object.js";
import { GuestObject } from "../../../src/runtime.js";
console.log(new GuestObject().getPrototypeOf() === null);
