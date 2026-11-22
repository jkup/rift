export const guards = Object.freeze({
    "source-units": "sourceUnits",
    "parse-depth": "parseDepth",
    steps: "steps",
    calls: "calls",
    "evaluation-depth": "evaluationDepth",
});

export function guardPhaseAllowed(code, phase) {
    if (!Object.hasOwn(guards, code)) {
        return false;
    }
    const parsing = code === "source-units" || code === "parse-depth";
    // RegExp construction and dynamic source parsing can hit parsing limits in a body.
    return phase === "parse"
        ? parsing
        : phase === "body" || (phase === "instantiation" && !parsing);
}
