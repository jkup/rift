import type { PropertyKey } from "../src/runtime.js";

// String-only legacy expectations must fail if a symbol is unexpectedly present.
export function stringKeys(keys: PropertyKey[]): string[] {
    const result: string[] = [];
    for (const key of keys) {
        if (typeof key !== "string") {
            throw new Error("expected only string keys");
        }
        result.push(key);
    }
    return result;
}
