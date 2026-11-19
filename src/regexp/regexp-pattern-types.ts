export type RegExpClassPart =
    | { kind: "range"; from: number; to: number }
    | { kind: "property"; index: number; inverted: boolean }
    | { kind: "builtin"; name: "digit" | "word" | "space"; inverted: boolean };
export type RegExpAtom =
    | { kind: "character"; value: number }
    | { kind: "dot" }
    | { kind: "backreference"; index: number }
    | { kind: "named-backreference"; name: string }
    | { kind: "lookaround"; negative: boolean; backward: boolean; body: RegExpDisjunction }
    | { kind: "modifiers"; add: string; remove: string; body: RegExpDisjunction }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord" }
    | { kind: "group"; index: number; body: RegExpDisjunction };
export type RegExpTerm = {
    atom: RegExpAtom;
    min: number;
    max: number | null;
    lazy: boolean;
    captureFrom: number;
    captureTo: number;
};
export type RegExpDisjunction = { alternatives: RegExpTerm[][] };
export type RegExpNamedCapture = { name: string; index: number };
export type RegExpPattern = {
    source: string;
    body: RegExpDisjunction;
    captures: number;
    names: RegExpNamedCapture[];
};
export type RegExpSyntaxFailure =
    | { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "stopped" }
    | { kind: "depth-limit"; count: number; limit: number };
export type RegExpSyntaxResult = { kind: "ready"; pattern: RegExpPattern } | RegExpSyntaxFailure;
