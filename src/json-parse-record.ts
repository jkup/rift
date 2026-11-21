import type { Value } from "./runtime.js";

// Original values and source text are private to a single JSON.parse call.
// Maps retain only the last occurrence of a duplicate property name.
export type JSONParseRecord = {
    value: Value;
    source: string;
    children: Map<string, JSONParseRecord>;
};
