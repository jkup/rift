type ProducerLimits = {
    sourceUnits: number; parseDepth: number; steps: number; calls: number;
    evaluationDepth: number; wallMs: number; outputBytes: number;
};
type ProducerUnit = { id: string; role: "harness" | "test"; text: string };
type ScriptProducerRequest = {
    mode: "conformance"; variant: "raw" | "non-strict" | "strict";
    action: "execute" | "parse-only"; nonce: string; requestSha256: string;
    preflightId: string | null; limits: ProducerLimits; units: ProducerUnit[];
};
function producerNeed(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
function producerIdentifier(value: string): boolean {
    if (typeof value !== "string" || value.length === 0) return false;
    for (let n = 0; n < value.length; n++) if (value.charCodeAt(n) < 33 || value.charCodeAt(n) > 126) return false;
    return true;
}
function producerHash(value: string): boolean {
    if (typeof value !== "string" || value.length !== 64) return false;
    for (let n = 0; n < value.length; n++) {
        const c = value.charCodeAt(n);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    }
    return true;
}
function producerDecimal(text: string): number {
    if (text.length === 0) throw new Error("script-producer/limit");
    for (let n = 0; n < text.length; n++) producerNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    producerNeed(Number.isSafeInteger(value), "limit");
    return value;
}
function parseProducerArguments(args: string[]): ScriptProducerRequest {
    producerNeed(Array.isArray(args), "arguments");
    for (let n = 0; n < args.length; n++) producerNeed(typeof args[n] === "string", "arguments");
    producerNeed(args.length >= 17 && (args.length - 14) % 3 === 0, "argc");
    producerNeed(args[0] === "conformance", "mode");
    producerNeed(args[1] === "raw" || args[1] === "non-strict" || args[1] === "strict", "variant");
    producerNeed(args[2] === "execute" || args[2] === "parse-only", "action");
    producerNeed(producerIdentifier(args[3]), "nonce");
    producerNeed(producerHash(args[4]), "request-hash");
    producerNeed(producerIdentifier(args[5]), "preflight");
    producerNeed(args[6].length > 0, "result-path");
    const limits: ProducerLimits = { sourceUnits: producerDecimal(args[7]), parseDepth: producerDecimal(args[8]), steps: producerDecimal(args[9]),
        calls: producerDecimal(args[10]), evaluationDepth: producerDecimal(args[11]), wallMs: producerDecimal(args[12]), outputBytes: producerDecimal(args[13]) };
    const request: ScriptProducerRequest = { mode: "conformance", variant: args[1] as ScriptProducerRequest["variant"],
        action: args[2] as ScriptProducerRequest["action"], nonce: args[3], requestSha256: args[4],
        preflightId: args[5] === "-" ? null : args[5], limits, units: [] };
    for (let n = 14; n < args.length; n += 3) {
        producerNeed(args[n] === "u" + ((n - 14) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        request.units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
    }
    // Decimal syntax already guarantees nonnegative safe integers. Check fixed
    // limits only after every triple, preserving the positional error order.
    producerNeed(limits.sourceUnits === 100000 && limits.parseDepth === 128 && limits.evaluationDepth === 256, "fixed-limit");
    producerNeed(limits.wallMs <= 2147483647, "wall-limit");
    producerNeed(request.variant === "raw" ? request.units.length === 1 && request.preflightId === null : request.preflightId !== null, "variant-preflight");
    return request;
}

function prepareProducerRequest(args: string[], sourceTexts: string[]): ScriptProducerRequest {
    const request = parseProducerArguments(args);
    producerNeed(Array.isArray(sourceTexts) && sourceTexts.length === request.units.length, "source-texts");
    for (let n = 0; n < request.units.length; n++) {
        producerNeed(typeof sourceTexts[n] === "string", "source-texts");
        request.units[n].text = sourceTexts[n];
    }
    if (request.variant === "strict")
        producerNeed(request.units[request.units.length - 1].text.startsWith('"use strict";\n'), "strict-transform");
    return request;
}

// Positional data only: no public API accepts or returns a producer request record.
// Ordinary string arrays; extra array properties are ignored. No hostile-object guarantee.
export function validateConformanceScriptArguments(args: string[]): void { parseProducerArguments(args); }
