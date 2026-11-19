import { UNDEFINED, type GuestObject, type OperationContext, type PropertyKey, type ThrowCompletion, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";

type EnumerationStep = { type: "normal"; done: boolean; value: Value } | ThrowCompletion;

export class ForInEnumerator {
    #object: GuestObject | null;
    #keys: PropertyKey[] | null = null;
    #index = 0;
    #visited = new Set<string>();
    constructor(object: GuestObject) { this.#object = object; }
    next(context: OperationContext, loc: Location): EnumerationStep {
        while (this.#object !== null) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            if (this.#keys === null) {
                this.#keys = this.#object.ownPropertyKeys();
                this.#index = 0;
            }
            while (this.#index < this.#keys.length) {
                const scan = context.tick(loc);
                if (scan.type === "throw") return scan;
                const key = this.#keys[this.#index++];
                if (typeof key !== "string" || this.#visited.has(key)) continue;
                const descriptor = this.#object.getOwnProperty(key);
                if (descriptor === undefined) continue;
                this.#visited.add(key);
                if (descriptor.enumerable) return { type: "normal", done: false, value: { kind: "string", value: key } };
            }
            this.#object = this.#object.getPrototypeOf();
            this.#keys = null;
        }
        return { type: "normal", done: true, value: UNDEFINED };
    }
}
