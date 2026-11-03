import type { OperationContext } from "../src/runtime.js";
import { observationJSONRecord } from "../src/observation-json.js";
import { observe, type ObservationResult } from "../src/observation.js";
import { Realm } from "../src/realm.js";
import { GuestObject, type Binding, type PropertyKey, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

class Poison extends GuestObject {
    reads = 0;
    override internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _loc: Location): ValueCompletion {
        this.reads++;
        throw new Error("constructor/name getter effect");
    }
}
const object = new Poison();
let output = "";
const realm = new Realm((line) => { output += line; });
const binding: Binding = { initialized: true, mutable: true, value: { kind: "object", object } };
realm.global.bindings.set("poison", binding);
const result = observe("console.log('body'); throw poison;", realm, "body-observation", "test/synthetic.js");
if (object.reads !== 0 || output !== "body" || result.observation.kind !== "throw" || result.observation.constructor.outcome !== "unsupported") throw new Error("T32");
console.log(observationJSONRecord(result, "T32"));
const text = 'quote" slash/ backslash\\ CR\rLF\nNUL\0 lone-high\ud800 lone-low\udfff pair😀 LS\u2028PS\u2029';
const diagnostic: ObservationResult = { mode: "parser-observation", unit: "test/synthetic.js", stage: "test", bodyEvaluated: false,
    location: { line: 1, column: 1 }, diagnostic: { phase: "parse", name: "SyntaxError", message: text, loc: { line: 1, column: 1 } },
    observation: { kind: "unsupported-syntax", capabilityCode: "lex.character" } };
console.log(observationJSONRecord(diagnostic, "T23"));
