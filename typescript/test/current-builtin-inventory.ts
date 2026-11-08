// Literal test expectations, independent of runtime builtin registration.
export const scriptGlobalKeys = [
    "undefined", "NaN", "Infinity", "console", "Number", "parseInt", "parseFloat",
    "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError",
    "String", "Boolean", "Object", "Array", "Math", "isNaN", "isFinite", "JSON", "Symbol",
];

export const objectMethods = [
    {name: "hasOwn", length: 2},
    {name: "keys", length: 1},
    {name: "values", length: 1},
    {name: "entries", length: 1},
    {name: "getOwnPropertyNames", length: 1},
    {name: "getOwnPropertySymbols", length: 1},
    {name: "assign", length: 2},
    {name: "defineProperty", length: 3},
    {name: "getOwnPropertyDescriptor", length: 2},
    {name: "defineProperties", length: 2},
    {name: "create", length: 2},
    {name: "getOwnPropertyDescriptors", length: 1},
    {name: "preventExtensions", length: 1},
    {name: "seal", length: 1},
    {name: "freeze", length: 1},
    {name: "isExtensible", length: 1},
    {name: "isSealed", length: 1},
    {name: "isFrozen", length: 1},
    {name: "is", length: 2},
    {name: "getPrototypeOf", length: 1},
    {name: "setPrototypeOf", length: 2},
];

export function objectConstructorKeys(): string[] {
    const keys = ["name", "length", "prototype"];
    for (const method of objectMethods) keys.push(method.name);
    return keys;
}

export function prototypeMethodLength(name: string, numberPrototype: boolean): number {
    if (name === "toString") return numberPrototype ? 1 : 0;
    if (["split", "toSpliced", "with", "slice", "apply", "splice"].includes(name)) return 2;
    if ([
        "toFixed", "toExponential", "toPrecision", "flatMap", "toSorted", "sort",
        "concat", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "call",
        "join", "push", "unshift", "at", "lastIndexOf", "indexOf", "includes",
        "filter", "map", "forEach", "reduce", "reduceRight", "find", "findIndex",
        "findLast", "findLastIndex", "every", "some", "charAt", "charCodeAt",
    ].includes(name)) return 1;
    if ([
        "valueOf", "pop", "shift", "reverse", "toReversed", "flat", "trim",
        "trimStart", "trimEnd", "toLowerCase", "toUpperCase", "keys", "values", "entries",
    ].includes(name)) return 0;
    throw new Error("missing expected prototype arity: " + name);
}
