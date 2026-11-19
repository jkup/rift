import { jsonString } from "./observation-json.js";
import type {
    ChildV2,
    ScriptConstructor,
    ScriptOperation,
    ScriptOriginalThrow,
    ScriptResult,
    ScriptSite,
} from "./script-observation-types.js";

function textOrNull(value: string | null): string {
    return value === null ? "null" : jsonString(value);
}
function siteJSON(value: ScriptSite): string {
    return (
        '{"unitId":' +
        jsonString(value.unitId) +
        ',"realmId":' +
        jsonString(value.realmId) +
        ',"location":{"line":' +
        value.location.line +
        ',"column":' +
        value.location.column +
        "}}"
    );
}
function operationJSON(value: ScriptOperation): string {
    return (
        '{"stage":' +
        jsonString(value.stage) +
        ',"phase":' +
        jsonString(value.phase) +
        ',"unitId":' +
        jsonString(value.unitId) +
        ',"realmId":' +
        jsonString(value.realmId) +
        "}"
    );
}
function originalJSON(value: ScriptOriginalThrow): string {
    return (
        '{"valueKind":' +
        jsonString(value.valueKind) +
        ',"origin":' +
        jsonString(value.origin) +
        ',"site":' +
        siteJSON(value.site) +
        "}"
    );
}
function constructorJSON(value: ScriptConstructor): string {
    const secondary =
        value.secondary === null
            ? "null"
            : '{"site":' +
              siteJSON(value.secondary.site) +
              ',"valueKind":' +
              jsonString(value.secondary.valueKind) +
              ',"origin":' +
              jsonString(value.secondary.origin) +
              "}";
    return (
        '{"outcome":' +
        jsonString(value.outcome) +
        ',"name":' +
        textOrNull(value.name) +
        ',"realmId":' +
        textOrNull(value.realmId) +
        ',"secondary":' +
        secondary +
        "}"
    );
}
function resultJSON(value: ScriptResult): string {
    if (value.kind === "normal") {
        return '{"kind":"normal"}';
    }
    let result = '{"kind":' + jsonString(value.kind);
    if (value.kind === "throw") {
        result +=
            ',"phase":"runtime","original":' +
            originalJSON(value.original) +
            ',"constructor":' +
            constructorJSON(value.constructor);
    } else if (value.kind === "syntax-error") {
        result +=
            ',"phase":"parse","constructorName":"SyntaxError","ruleCode":' +
            jsonString(value.ruleCode);
    } else if (value.kind === "unsupported-syntax") {
        result += ',"capabilityCode":' + jsonString(value.capabilityCode);
    } else if (value.kind === "unsupported-operation") {
        result += ',"phase":"runtime","capabilityCode":' + jsonString(value.capabilityCode);
    } else if (value.kind === "unsupported-profile") {
        result += ',"reasonCode":' + jsonString(value.reasonCode);
    } else {
        result +=
            ',"guardCode":' +
            jsonString(value.guardCode) +
            ',"count":' +
            value.count +
            ',"limit":' +
            value.limit;
    }
    if (value.diagnostic !== undefined) {
        result += ',"diagnostic":' + jsonString(value.diagnostic);
    }
    return result + "}";
}
// Trusted structured data only: no guest property access, JSON.parse, or native
// dynamic serialization. The host boundary independently validates the bytes.
export function scriptObservationJSONRecord(value: ChildV2): string {
    let completed = "[";
    for (let i = 0; i < value.completedUnits.length; i++) {
        if (i > 0) {
            completed += ",";
        }
        completed += jsonString(value.completedUnits[i]);
    }
    completed += "]";
    const inspection =
        value.inspection === null
            ? "null"
            : '{"original":' +
              originalJSON(value.inspection.original) +
              ',"operation":' +
              operationJSON(value.inspection.operation) +
              "}";
    return (
        '{"driverVersion":2,"nonce":' +
        jsonString(value.nonce) +
        ',"requestSha256":' +
        jsonString(value.requestSha256) +
        ',"mode":' +
        jsonString(value.mode) +
        ',"operation":' +
        operationJSON(value.operation) +
        ',"source":' +
        (value.source === null ? "null" : siteJSON(value.source)) +
        ',"testBodyEvaluated":' +
        value.testBodyEvaluated +
        ',"harnessValidated":' +
        value.harnessValidated +
        ',"preflightId":' +
        textOrNull(value.preflightId) +
        ',"completedUnits":' +
        completed +
        ',"inspection":' +
        inspection +
        ',"result":' +
        resultJSON(value.result) +
        "}"
    );
}
