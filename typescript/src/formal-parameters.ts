import type { DestructuringPattern, FormalParameter } from "./syntax.js";

function patternContainsExpression(pattern: DestructuringPattern): boolean {
    if (pattern.kind === "array-pattern") {
        for (const element of pattern.elements) if (element !== null &&
            (element.initializer !== null || patternContainsExpression(element.pattern))) return true;
        return pattern.rest !== null && patternContainsExpression(pattern.rest);
    }
    if (pattern.kind === "object-pattern") {
        for (const property of pattern.properties) if (property.computed === true ||
            property.element.initializer !== null || patternContainsExpression(property.element.pattern)) return true;
        return pattern.rest !== null && patternContainsExpression(pattern.rest);
    }
    return false;
}
export function hasParameterExpressions(parameters: readonly FormalParameter[] | undefined): boolean {
    if (parameters === undefined) return false;
    for (const parameter of parameters) if (parameter.initializer !== null ||
        (parameter.kind === "pattern" && patternContainsExpression(parameter.pattern))) return true;
    return false;
}
export function hasParameterPatterns(parameters: readonly FormalParameter[] | undefined): boolean {
    if (parameters === undefined) return false;
    for (const parameter of parameters) if (parameter.kind === "pattern") return true;
    return false;
}
