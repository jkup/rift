// Literal test expectations, independent of runtime builtin registration.
export const scriptGlobalKeys = [
    "undefined", "NaN", "Infinity", "console", "Function", "Reflect", "Promise", "RegExp", "eval", "Number", "parseInt", "parseFloat",
    "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "EvalError", "URIError", "AggregateError",
    "String", "Boolean", "Object", "Array", "Math", "isNaN", "isFinite", "encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent", "JSON", "Symbol", "Map", "Set",
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
    {name: "fromEntries", length: 1},
    {name: "groupBy", length: 2},
];

export function objectConstructorKeys(): string[] {
    const keys = ["name", "length", "prototype"];
    for (const method of objectMethods) keys.push(method.name);
    return keys;
}

export function prototypeMethodLength(name: string, numberPrototype: boolean): number {
    if (name === "toString") return numberPrototype ? 1 : 0;
    if (["substring", "substr", "copyWithin", "replace", "split", "toSpliced", "with", "slice", "apply", "splice"].includes(name)) return 2;
    if ([
        "padStart", "padEnd", "fill", "repeat", "toFixed", "toExponential", "toPrecision", "flatMap", "toSorted", "sort", "anchor", "fontcolor", "fontsize", "link",
        "concat", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "call", "bind",
        "join", "push", "unshift", "at", "lastIndexOf", "indexOf", "includes", "match", "search", "matchAll",
        "filter", "map", "forEach", "reduce", "reduceRight", "find", "findIndex",
        "findLast", "findLastIndex", "every", "some", "charAt", "charCodeAt", "codePointAt", "startsWith", "endsWith",
    ].includes(name)) return 1;
    if ([
        "valueOf", "toLocaleString", "pop", "shift", "reverse", "toReversed", "flat", "trim",
        "trimStart", "trimEnd", "trimLeft", "trimRight", "toLowerCase", "toUpperCase", "keys", "values", "entries",
        "big", "blink", "bold", "fixed", "italics", "small", "strike", "sub", "sup", "isWellFormed", "toWellFormed",
    ].includes(name)) return 0;
    throw new Error("missing expected prototype arity: " + name);
}
