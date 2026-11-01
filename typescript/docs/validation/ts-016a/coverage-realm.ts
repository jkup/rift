import { GuestObject, normal } from "../../../src/runtime.js";
import { Realm } from "../../../src/realm.js";
new Realm((_line) => {});
const object = new GuestObject();
object.callable = { kind: "builtin", invoke: (_receiver, _args, _context, _loc) => normal() };
console.log(object.getPrototypeOf() === null);
