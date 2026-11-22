import { runtimeCodes } from "./runtime-capability-codes.mjs";
import { createHash } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";
import { parseDocument } from "yaml";

// Closed v2 boundary. These private predicates are also retained in the full
// envelope boundary: neither module imports or widens the historical v1 API.
const integer = (x) => Number.isSafeInteger(x) && x >= 0;
const str = (x) => typeof x === "string" && x.length > 0;
const id = (x) => str(x) && /^[\x21-\x7e]+$/.test(x);
const bool = (x) => typeof x === "boolean";
const one = (values) => (x) => values.includes(x);
const nullable = (check) => (x) => x === null || check(x);
const array = (check) => (x) => Array.isArray(x) && x.every(check);
const hash = (n) => (x) => typeof x === "string" && new RegExp(`^[a-f0-9]{${n}}$`).test(x);
const sha = hash(64);
const path = (x) =>
    str(x) &&
    /^(test|harness)\//.test(x) &&
    x.endsWith(".js") &&
    !/[\\:\0]/.test(x) &&
    x.split("/").every((p) => p && p !== "." && p !== "..");
function record(x, fields) {
    return (
        x !== null &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        Object.keys(x).length === Object.keys(fields).length &&
        Object.entries(fields).every(([k, check]) => Object.hasOwn(x, k) && check(x[k]))
    );
}
const need = (condition) => {
    if (!condition) {
        throw new Error("protocol");
    }
};
const digest = (x) => createHash("sha256").update(x).digest("hex");
const modes = one(["script-observation", "conformance"]);
const variants = one(["strict", "non-strict", "raw"]);
const guards = {
    "source-units": "sourceUnits",
    "parse-depth": "parseDepth",
    steps: "steps",
    calls: "calls",
    "evaluation-depth": "evaluationDepth",
};
const syntaxCodes = [
    "lex.indeterminate-comment",
    "lex.leading-zero",
    "lex.numeric-literal",
    "lex.indeterminate-string-newline",
    "lex.string-escape",
    "lex.indeterminate-string-end",
    "lex.operator",
    "lex.character",
    "lex.regexp-literal",
    "parse.regexp-pattern",
    "parse.expected-token",
    "parse.binding-identifier",
    "parse.duplicate-binding",
    "parse.declaration-statement",
    "parse.return-context",
    "parse.line-terminator",
    "parse.throw-expression",
    "parse.loop-context",
    "parse.duplicate-parameter",
    "parse.property-name",
    "parse.assignment-target",
    "parse.delete-identifier",
    "parse.array-spread",
    "parse.object-key",
    "parse.prototype-literal",
    "parse.unexpected",
    "script.uncertified-conflict",
];
const limitsShape = (x) =>
    record(
        x,
        Object.fromEntries(
            [
                "sourceUnits",
                "parseDepth",
                "steps",
                "calls",
                "evaluationDepth",
                "wallMs",
                "outputBytes",
            ].map((k) => [k, integer]),
        ),
    );
const unitShape = (x) =>
    record(x, {
        id,
        ordinal: integer,
        role: one(["harness", "test"]),
        path,
        blob: hash(40),
        sourceSha256: sha,
        transformedSha256: sha,
        byteLength: integer,
        sourceUnits: integer,
    });
const realmShape = (x) => record(x, { id, profile: one(["script"]) });
const operationShape = (x) =>
    record(x, {
        stage: one(["harness", "test"]),
        phase: one(["parse", "instantiation", "body"]),
        unitId: id,
        realmId: id,
    });
const siteShape = (x) =>
    record(x, {
        unitId: id,
        realmId: id,
        location: (y) =>
            record(y, { line: (n) => integer(n) && n > 0, column: (n) => integer(n) && n > 0 }),
    });
const originalShape = (x) =>
    record(x, {
        valueKind: one([
            "undefined",
            "null",
            "boolean",
            "number",
            "bigint",
            "string",
            "symbol",
            "object",
        ]),
        origin: one(["guest", "engine-diagnostic"]),
        site: siteShape,
    });
const inspectionShape = nullable((x) =>
    record(x, { original: originalShape, operation: operationShape }),
);

function bindingState(b) {
    need(
        record(b, {
            nonce: id,
            requestSha256: sha,
            mode: modes,
            variant: variants,
            units: array(unitShape),
            realms: array(realmShape),
            preflightId: nullable(id),
            action: one(["parse-only", "execute"]),
            limits: limitsShape,
            sources: array((x) =>
                record(x, { unitId: id, transformedText: (x) => typeof x === "string" }),
            ),
        }),
    );
    need(
        b.limits.sourceUnits === 100000 &&
            b.limits.parseDepth === 128 &&
            b.limits.evaluationDepth === 256 &&
            b.limits.wallMs <= 2147483647,
    );
    need(
        b.units.length > 0 &&
            b.realms.length > 0 &&
            new Set(b.realms.map((r) => r.id)).size === b.realms.length,
    );
    need(
        b.units.every(
            (u, n) =>
                u.id === "u" + n &&
                u.ordinal === n &&
                u.role === (n === b.units.length - 1 ? "test" : "harness") &&
                u.path.startsWith(u.role + "/"),
        ),
    );
    need(b.variant !== "raw" || (b.units.length === 1 && b.preflightId === null));
    need(
        b.sources.length === b.units.length &&
            b.sources.every(
                (s, n) =>
                    s.unitId === b.units[n].id &&
                    s.transformedText.length === b.units[n].sourceUnits &&
                    digest(Buffer.from(s.transformedText, "utf8")) ===
                        b.units[n].transformedSha256 &&
                    new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
                        Buffer.from(s.transformedText, "utf8"),
                    ) === s.transformedText,
            ),
    );
    // Canonical field order is part of request identity, independent of callers'
    // object property insertion order. No expected result enters this hash.
    const units = b.units.map((u) => ({
        id: u.id,
        ordinal: u.ordinal,
        role: u.role,
        path: u.path,
        blob: u.blob,
        sourceSha256: u.sourceSha256,
        transformedSha256: u.transformedSha256,
        byteLength: u.byteLength,
        sourceUnits: u.sourceUnits,
    }));
    const realms = b.realms.map((r) => ({ id: r.id, profile: r.profile }));
    const limits = Object.fromEntries(
        [
            "sourceUnits",
            "parseDepth",
            "steps",
            "calls",
            "evaluationDepth",
            "wallMs",
            "outputBytes",
        ].map((k) => [k, b.limits[k]]),
    );
    need(
        digest(
            JSON.stringify({
                requestVersion: 2,
                nonce: b.nonce,
                mode: b.mode,
                variant: b.variant,
                units,
                realms,
                limits,
                preflightId: b.preflightId,
                action: b.action,
            }),
        ) === b.requestSha256,
    );
    return {
        units: new Map(b.units.map((u) => [u.id, u])),
        realms: new Set(b.realms.map((r) => r.id)),
        sources: new Map(b.sources.map((s) => [s.unitId, s.transformedText])),
    };
}
function constructorShape(c) {
    if (
        !record(c, {
            outcome: one([
                "available",
                "absent",
                "non-callable",
                "non-string-name",
                "foreign-profile",
                "unregistered-realm",
                "abrupt",
            ]),
            name: nullable((x) => typeof x === "string"),
            realmId: nullable(id),
            secondary: nullable(originalShape),
        })
    ) {
        return false;
    }
    if (c.outcome === "available") {
        return typeof c.name === "string" && c.realmId !== null && c.secondary === null;
    }
    if (c.outcome === "non-string-name") {
        return c.name === null && c.realmId !== null && c.secondary === null;
    }
    return (
        c.name === null &&
        c.realmId === null &&
        (c.outcome === "abrupt" ? c.secondary !== null : c.secondary === null)
    );
}
function resultShape(x, parent = false) {
    if (x === null || typeof x !== "object") {
        return false;
    }
    const fields = {
        normal: {},
        throw: { phase: one(["runtime"]), original: originalShape, constructor: constructorShape },
        "syntax-error": {
            phase: one(["parse"]),
            constructorName: one(["SyntaxError"]),
            ruleCode: one([
                "return-outside-function",
                "duplicate-block-lexical-function",
                "duplicate-strict-parameter",
                "assignment-target",
                "lexical-declaration-statement",
                "numeric-separator",
                "regexp-literal",
                "private-name",
                "async-function-statement",
                "strict-reserved-identifier",
                "strict-legacy-number",
                "strict-legacy-escape",
            ]),
        },
        "unsupported-syntax": { capabilityCode: one(syntaxCodes) },
        "unsupported-operation": { phase: one(["runtime"]), capabilityCode: one(runtimeCodes) },
        "unsupported-profile": { reasonCode: one(["strict", "realm"]) },
        "resource-limit": {
            guardCode: one([...Object.keys(guards), ...(parent ? ["output"] : [])]),
            count: integer,
            limit: integer,
        },
        ...(parent
            ? {
                  timeout: { wallMs: integer },
                  "host-fault": { faultCode: str },
                  "not-run": { reasonCode: str },
              }
            : {}),
    };
    if (!Object.hasOwn(fields, x.kind)) {
        return false;
    }
    const shape = { kind: one([x.kind]), ...fields[x.kind] };
    if (x.kind !== "normal" && Object.hasOwn(x, "diagnostic")) {
        shape.diagnostic = str;
    }
    if (!record(x, shape)) {
        return false;
    }
    if (
        x.kind === "throw" &&
        x.original.valueKind !== "object" &&
        x.constructor.outcome !== "absent"
    ) {
        return false;
    }
    return (
        x.kind !== "resource-limit" ||
        (x.guardCode === "calls" ? x.count >= x.limit : x.count > x.limit)
    );
}
function checkOperation(v, b, s) {
    const op = v.operation,
        o = v.result;
    need(
        operationShape(op) &&
            nullable(siteShape)(v.source) &&
            bool(v.testBodyEvaluated) &&
            bool(v.harnessValidated) &&
            nullable(id)(v.preflightId) &&
            array(id)(v.completedUnits) &&
            inspectionShape(v.inspection) &&
            resultShape(o),
    );
    const u = s.units.get(op.unitId);
    need(u && u.role === op.stage && s.realms.has(op.realmId));
    need(v.preflightId === b.preflightId && (!v.harnessValidated || b.preflightId !== null));
    need(
        b.variant !== "raw" ||
            (!v.harnessValidated && v.completedUnits.length === 0 && v.preflightId === null),
    );
    if (op.stage === "test" && b.mode === "conformance" && b.variant !== "raw") {
        need(v.harnessValidated && b.preflightId !== null);
    }
    need(v.testBodyEvaluated === (op.stage === "test" && op.phase === "body"));
    if (b.action === "parse-only") {
        need(op.stage !== "test" || op.phase === "parse");
    }
    // Current harness occurrence joins the prefix only after successful body
    // evaluation; merely parsing it is never completion evidence.
    const completed =
        u.ordinal + (op.stage === "harness" && op.phase === "body" && o.kind === "normal" ? 1 : 0);
    need(
        equal(
            v.completedUnits,
            b.units.slice(0, completed).map((u) => u.id),
        ),
    );
    function site(site) {
        need(siteShape(site) && s.realms.has(site.realmId));
        const unit = s.units.get(site.unitId);
        need(unit && unit.ordinal <= u.ordinal);
        const lines = s.sources.get(site.unitId).split(/\r\n|[\r\n\u2028\u2029]/);
        need(
            site.location.line <= lines.length &&
                site.location.column <= lines[site.location.line - 1].length + 1,
        );
    }
    if (o.kind === "normal") {
        need(v.source === null && v.inspection === null && op.phase !== "instantiation");
    } else {
        need(v.source !== null);
        site(v.source);
    }
    if (op.phase === "parse") {
        need(v.inspection === null && !["throw", "unsupported-operation"].includes(o.kind));
        if (v.source) {
            need(v.source.unitId === op.unitId && v.source.realmId === op.realmId);
        }
    }
    if (["syntax-error", "unsupported-syntax", "unsupported-profile"].includes(o.kind)) {
        need(op.phase === "parse");
    }
    if (o.kind === "throw") {
        need(op.phase !== "parse" && v.inspection === null && equal(v.source, o.original.site));
        site(o.original.site);
        if (o.constructor.realmId !== null) {
            need(s.realms.has(o.constructor.realmId));
        }
        if (o.constructor.secondary !== null) {
            site(o.constructor.secondary.site);
        }
    }
    if (o.kind === "unsupported-operation") {
        need(op.phase !== "parse");
    }
    if (o.kind === "resource-limit") {
        need(o.limit === b.limits[guards[o.guardCode]]);
        need(["source-units", "parse-depth"].includes(o.guardCode) === (op.phase === "parse"));
    }
    if (v.inspection !== null) {
        need(
            (b.action === "execute" || op.stage === "harness") &&
                op.phase !== "parse" &&
                ["resource-limit", "unsupported-operation"].includes(o.kind),
        );
        need(v.inspection.original.valueKind === "object" && equal(v.inspection.operation, op));
        site(v.inspection.original.site);
    }
}
function decode(json) {
    if (Buffer.isBuffer(json)) {
        need(json.length <= 65536);
        json = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(json);
    }
    need(typeof json === "string" && Buffer.byteLength(json, "utf8") <= 65536);
    const value = JSON.parse(json);
    const doc = parseDocument(json, { uniqueKeys: true, schema: "json", strict: true });
    need(doc.errors.length === 0 && doc.warnings.length === 0);
    return value;
}

export function parseScriptDriverResult(bytes, binding) {
    const s = bindingState(binding);
    need(Buffer.isBuffer(bytes));
    const v = decode(bytes);
    need(
        record(v, {
            driverVersion: one([2]),
            nonce: id,
            requestSha256: sha,
            mode: modes,
            operation: operationShape,
            source: nullable(siteShape),
            testBodyEvaluated: bool,
            harnessValidated: bool,
            preflightId: nullable(id),
            completedUnits: array(id),
            inspection: inspectionShape,
            result: resultShape,
        }),
    );
    need(
        v.nonce === binding.nonce &&
            v.requestSha256 === binding.requestSha256 &&
            v.mode === binding.mode,
    );
    checkOperation(v, binding, s);
    return v;
}
