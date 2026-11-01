import { GuestObject, normal } from "../../../src/runtime.js";
const object = new GuestObject();
object.callable = { kind: "builtin", invoke: (_receiver, _args, _context, _loc) => normal() };
console.log(object.getPrototypeOf() === null);
