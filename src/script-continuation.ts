import type { ScriptFrameSnapshot, ScriptSourceSnapshot } from "./script-execution-internal.js";
import type {
    Expr,
    Stmt,
    ForStmt,
    ForLexicalStmt,
    ForEachStmt,
    TryCatchStmt,
    TryFinallyStmt,
    SwitchStmt,
    DestructuringPattern,
    ArrayPattern,
    ObjectPattern,
    Location,
} from "./syntax.js";
import type {
    Value,
    ValueCompletion,
    ThrowCompletion,
    GuestObject,
    PropertyKey,
} from "./runtime.js";
import type { ScriptEnvironment } from "./script-environment.js";
import type { IteratorRecord } from "./iterator.js";
import type { ForInEnumerator } from "./for-in.js";
import type { GeneratorExpressionFrame } from "./generator-expression.js";
import type { GeneratorYieldReceiver } from "./generator-yield-receiver.js";
import type { EvaluationReference } from "./evaluation-reference.js";
import type { AsyncDelegate } from "./async-generator-delegate.js";

// Mutable continuation arrays keep identical element types across the engine and helpers.
export type GeneratorSequence = {
    kind: "sequence";
    frame: ScriptFrameSnapshot;
    body: Stmt[];
    nextStatement: number;
    depth: number;
    labels?: readonly string[] | null;
};
export type GeneratorLoop = {
    kind: "loop";
    frame: ScriptFrameSnapshot;
    test: Expr;
    body: Stmt;
    testFirst: boolean;
    first: boolean;
    depth: number;
    labels?: readonly string[] | null;
};
export type GeneratorForLoop = {
    kind: "for";
    frame: ScriptFrameSnapshot;
    statement: ForStmt | ForLexicalStmt;
    outer: ScriptEnvironment | null;
    first: boolean;
    phase: "prepare" | "test";
    depth: number;
    labels?: readonly string[] | null;
};
export type GeneratorCatch = {
    kind: "catch";
    frame: ScriptFrameSnapshot;
    statement: TryCatchStmt;
    depth: number;
};
export type GeneratorAbrupt =
    | { type: "return"; value: Value }
    | { type: "break" | "continue"; target?: string }
    | ThrowCompletion;
export type GeneratorPending = GeneratorAbrupt | { type: "normal" };
export type GeneratorFinally = {
    kind: "finally";
    frame: ScriptFrameSnapshot;
    statement: TryFinallyStmt;
    depth: number;
};
export type GeneratorCleanup = {
    kind: "cleanup";
    frame: ScriptFrameSnapshot;
    pending: GeneratorPending;
    abrupt: ThrowCompletion | null;
    source: ScriptSourceSnapshot | null;
    depth: number;
};
export type GeneratorForOf = {
    kind: "iterator";
    awaiting?: boolean;
    frame: ScriptFrameSnapshot;
    statement: ForEachStmt;
    iterator: IteratorRecord;
    target: Expr | null;
    lexical: boolean;
    scopeId: number;
    depth: number;
    labels?: readonly string[] | null;
};
export type GeneratorForIn = {
    kind: "enumerator";
    frame: ScriptFrameSnapshot;
    statement: ForEachStmt;
    enumerator: ForInEnumerator;
    target: Expr | null;
    lexical: boolean;
    scopeId: number;
    depth: number;
    labels?: readonly string[] | null;
};
export type GeneratorForSource = {
    kind: "for-source";
    frame: ScriptFrameSnapshot;
    outer: ScriptFrameSnapshot;
    statement: ForEachStmt;
    lexical: boolean;
    scopeId: number;
    depth: number;
    labels: readonly string[] | null;
};
export type GeneratorLabel = {
    kind: "label";
    frame: ScriptFrameSnapshot;
    name: string;
    depth: number;
};
export type GeneratorSwitch = {
    kind: "switch";
    frame: ScriptFrameSnapshot;
    depth: number;
    selection: {
        statement: SwitchStmt;
        discriminant: Value;
        nextClause: number;
        fallback: number;
    } | null;
};
export type AsyncIteratorCloseFrame = {
    kind: "async-close";
    frame: ScriptFrameSnapshot;
    loc: Location;
    depth: number;
    pending: GeneratorAbrupt;
    abrupt: ThrowCompletion | null;
    source: ScriptSourceSnapshot | null;
};
export type PatternFrameBase = {
    frame: ScriptFrameSnapshot;
    depth: number;
    environment: ScriptEnvironment | null;
};
export type GeneratorPatternValue = PatternFrameBase & {
    kind: "pattern-value";
    pattern: DestructuringPattern;
    initializer: Expr | null;
    value: Value;
    reference: EvaluationReference | null;
};
export type GeneratorPatternArray = PatternFrameBase & {
    kind: "pattern-array";
    pattern: ArrayPattern;
    iterator: IteratorRecord;
    index: number;
};
export type GeneratorPatternObject = PatternFrameBase & {
    kind: "pattern-object";
    pattern: ObjectPattern;
    input: Value;
    object: GuestObject;
    excluded: Set<PropertyKey>;
    index: number;
};
export type PatternTargetSource =
    | { kind: "property"; object: GuestObject; input: Value; key: PropertyKey }
    | { kind: "iterator"; iterator: IteratorRecord; rest: boolean }
    | { kind: "object-rest"; object: GuestObject; excluded: Set<PropertyKey> };
export type GeneratorPatternTarget = PatternFrameBase & {
    kind: "pattern-target";
    pattern: DestructuringPattern;
    initializer: Expr | null;
    source: PatternTargetSource;
    phase: "reference" | "read";
    reference: EvaluationReference | null;
};
export type GeneratorPattern =
    | GeneratorPatternTarget
    | GeneratorPatternValue
    | GeneratorPatternArray
    | GeneratorPatternObject;
export type GeneratorPatternResume = {
    kind: "pattern-resume";
    frame: ScriptFrameSnapshot;
    depth: number;
    value: Value;
    expressions: GeneratorExpressionFrame[];
    receiver: GeneratorYieldReceiver | null;
};
export type GeneratorFrame =
    | GeneratorPatternResume
    | GeneratorPattern
    | GeneratorForSource
    | AsyncIteratorCloseFrame
    | GeneratorSwitch
    | GeneratorSequence
    | GeneratorLoop
    | GeneratorForLoop
    | GeneratorCatch
    | GeneratorFinally
    | GeneratorCleanup
    | GeneratorForOf
    | GeneratorForIn
    | GeneratorLabel;
export type ExecutionContinuation = {
    asyncGenerator?: true;
    sequences: GeneratorFrame[];
    expressionFrames: GeneratorExpressionFrame[];
    yieldLoc: Location | null;
    receiver: GeneratorYieldReceiver | null;
    delegate: {
        iterator: IteratorRecord;
        asynchronous: AsyncDelegate | null;
        loc: Location;
        depth: number;
    } | null;
};
export type ContinuationResult =
    | ValueCompletion
    | { type: "async-delegate-yield"; value: Value }
    | { type: "yield"; result: Value }
    | { type: "await"; value: Value; loc: Location; depth: number };
export type ExpressionContinuationResult =
    | ContinuationResult
    | { type: "suspended-delegate" }
    | { type: "suspended-pattern" };
