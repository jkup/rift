import type { Observation, ObservationResult } from "./observation.js";

// Encode UTF-16 units explicitly: ASCII JSON also preserves lone surrogates on
// hosts whose UTF-8 writer would otherwise replace them. No guest traversal.
export function jsonString(value: string): string {
    const hex = "0123456789abcdef";
    let result = '"';
    for (let i = 0; i < value.length; i++) {
        const c = value.charCodeAt(i);
        if (c === 34) {
            result += '\\"';
        } else if (c === 92) {
            result += "\\\\";
        } else if (c < 32 || c > 126) {
            result +=
                "\\u" + hex[(c >> 12) & 15] + hex[(c >> 8) & 15] + hex[(c >> 4) & 15] + hex[c & 15];
        } else {
            result += value.charAt(i);
        }
    }
    return result + '"';
}
function observationJSON(value: Observation): string {
    if (value.kind === "normal") {
        return '{"kind":"normal"}';
    }
    if (value.kind === "syntax-error") {
        return (
            '{"kind":"syntax-error","phase":"parse","constructorName":"SyntaxError","ruleCode":' +
            jsonString(value.ruleCode) +
            "}"
        );
    }
    if (value.kind === "unsupported-syntax") {
        return (
            '{"kind":"unsupported-syntax","capabilityCode":' +
            jsonString(value.capabilityCode) +
            "}"
        );
    }
    if (value.kind === "resource-limit") {
        return (
            '{"kind":"resource-limit","guardCode":' +
            jsonString(value.guardCode) +
            ',"count":' +
            value.count +
            ',"limit":' +
            value.limit +
            "}"
        );
    }
    return (
        '{"kind":"throw","phase":"runtime","valueKind":' +
        jsonString(value.valueKind) +
        ',"constructor":{"outcome":' +
        jsonString(value.constructor.outcome) +
        ',"name":null,"realmId":null,"secondary":null}}'
    );
}
export function observationJSONRecord(value: ObservationResult, nonce: string): string {
    const location =
        value.location === null
            ? "null"
            : '{"line":' + value.location.line + ',"column":' + value.location.column + "}";
    let observation = observationJSON(value.observation);
    if (value.diagnostic !== null && value.observation.kind !== "normal") {
        observation =
            observation.slice(0, observation.length - 1) +
            ',"diagnostic":' +
            jsonString(value.diagnostic.message) +
            "}";
    }
    return (
        '{"driverVersion":1,"nonce":' +
        jsonString(nonce) +
        ',"mode":' +
        jsonString(value.mode) +
        ',"unit":' +
        jsonString(value.unit) +
        ',"stage":"test","bodyEvaluated":' +
        value.bodyEvaluated +
        ',"location":' +
        location +
        ',"observation":' +
        observation +
        "}"
    );
}
