// Intrinsic error constructors and prototypes share one bootstrap order.
export const errorNames = [
    "Error",
    "TypeError",
    "ReferenceError",
    "RangeError",
    "SyntaxError",
    "EvalError",
    "URIError",
    "AggregateError",
    "SuppressedError",
] as const;

export type ErrorName = (typeof errorNames)[number];
