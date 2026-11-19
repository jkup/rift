import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { parseDocument, visit } from "yaml";

export const REVISION = "91c70759363c46557b694792bf34a2551a7af5ba";
const SELECTION_DIGEST = "eefae56c3fda22bdd1a504744c56f296eb76b5200c3b614d2041af205f1b773f";
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const blobHash = (bytes) =>
    createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
export class InputError extends Error {
    constructor(reasonCode) {
        super(reasonCode);
        this.reasonCode = reasonCode;
    }
}
const reject = (code) => {
    throw new InputError(code);
};

export async function frozenManifest() {
    const bytes = await readFile(
        new URL("../../fixtures/assistance/test262-starter-corpus/manifest.json", import.meta.url),
    );
    const manifest = JSON.parse(bytes);
    // The selection is immutable, including the declared execution metadata. The
    // canonical digest tolerates only checkout JSON whitespace, never source edits.
    if (sha256(JSON.stringify(manifest)) !== SELECTION_DIGEST) {
        reject("selection-mismatch");
    }
    return { manifest, manifestSha256: sha256(bytes) };
}

export function safePath(path, prefix) {
    if (
        typeof path !== "string" ||
        !path.startsWith(prefix) ||
        !path.endsWith(".js") ||
        path.includes("\\") ||
        path.includes(":") ||
        path.includes("\0") ||
        path.split("/").some((part) => !part || part === "." || part === "..")
    ) {
        reject("include-path");
    }
    return path;
}

export async function localBytes(root, path, prefix = "test/") {
    safePath(path, prefix);
    let base, file;
    try {
        base = await realpath(root);
        file = await realpath(resolve(base, path));
    } catch {
        reject(prefix === "harness/" ? "include-missing" : "retrieval");
    }
    const rel = relative(base, file);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
        reject("include-path");
    }
    try {
        if (!(await stat(file)).isFile()) {
            reject("retrieval");
        }
        return await readFile(file);
    } catch (error) {
        if (error instanceof InputError) {
            throw error;
        }
        reject(prefix === "harness/" ? "include-missing" : "retrieval");
    }
}

// Low-level byte verification is also useful for isolated synthetic fault tests;
// production callers get expected identities only from frozenManifest().
export function verifyBytes(bytes, expectedBlob) {
    if (!Buffer.isBuffer(bytes) || blobHash(bytes) !== expectedBlob) {
        reject("blob-mismatch");
    }
    let source;
    try {
        source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        reject("invalid-utf8");
    }
    return { source, blob: expectedBlob, sha256: sha256(bytes), byteLength: bytes.length };
}

const flags = new Set([
    "onlyStrict",
    "noStrict",
    "raw",
    "module",
    "async",
    "generated",
    "CanBlockIsTrue",
    "CanBlockIsFalse",
    "non-deterministic",
]);
const keys = new Set([
    "description",
    "info",
    "esid",
    "es5id",
    "es6id",
    "author",
    "flags",
    "features",
    "includes",
    "locale",
    "negative",
]);
export function metadata(source) {
    const starts = [...source.matchAll(/\/\*---/g)];
    const ends = [...source.matchAll(/---\*\//g)];
    if (starts.length !== 1 || ends.length !== 1 || ends[0].index < starts[0].index) {
        reject("metadata");
    }
    let doc, value;
    try {
        doc = parseDocument(source.slice(starts[0].index + 5, ends[0].index), {
            version: "1.2",
            schema: "core",
            uniqueKeys: true,
            strict: true,
        });
        if (doc.errors.length || doc.warnings.length) {
            reject("metadata");
        }
        // No custom tags, aliases, merges or implicit object construction. Standard
        // scalar/collection syntax, folded prose and flow mappings remain YAML.
        visit(doc, {
            Node(_key, node) {
                if (node.tag || node.anchor) {
                    reject("metadata");
                }
            },
            Alias() {
                reject("metadata");
            },
        });
        value = doc.toJS({ maxAliasCount: 0 });
    } catch {
        reject("metadata");
    }
    if (
        !value ||
        Array.isArray(value) ||
        typeof value !== "object" ||
        Object.keys(value).some((key) => !keys.has(key)) ||
        typeof value.description !== "string" ||
        !value.description.trim()
    ) {
        reject("metadata");
    }
    for (const key of ["info", "esid", "author"]) {
        if (key in value && typeof value[key] !== "string") {
            reject("metadata");
        }
    }
    // Legacy section identifiers in S01-S05 are unquoted YAML numbers. They are
    // informational; retain the parsed scalar without altering execution metadata.
    for (const key of ["es5id", "es6id"]) {
        if (key in value && typeof value[key] !== "string" && !Number.isFinite(value[key])) {
            reject("metadata");
        }
    }
    for (const key of ["flags", "features", "includes", "locale"]) {
        if (!(key in value)) {
            value[key] = [];
        }
        if (!Array.isArray(value[key]) || value[key].some((x) => typeof x !== "string" || !x)) {
            reject("metadata");
        }
    }
    if (value.flags.some((x) => !flags.has(x))) {
        reject("unknown-flag");
    }
    for (const pair of [
        ["onlyStrict", "noStrict"],
        ["raw", "onlyStrict"],
        ["raw", "module"],
        ["module", "noStrict"],
        ["module", "onlyStrict"],
        ["raw", "async"],
        ["CanBlockIsTrue", "CanBlockIsFalse"],
    ]) {
        if (pair.every((x) => value.flags.includes(x))) {
            reject("incompatible-flags");
        }
    }
    for (const include of value.includes) {
        safePath(`harness/${include}`, "harness/");
    }
    if ("negative" in value) {
        const n = value.negative;
        if (
            !n ||
            Array.isArray(n) ||
            Object.keys(n).sort().join(",") !== "phase,type" ||
            !["parse", "resolution", "runtime"].includes(n.phase) ||
            typeof n.type !== "string" ||
            !n.type.trim() ||
            (n.phase === "resolution" && !value.flags.includes("module"))
        ) {
            reject("metadata");
        }
    } else {
        value.negative = null;
    }
    return value;
}

export function compareMetadata(meta, entry) {
    for (const key of ["flags", "features", "includes", "locale", "negative"]) {
        const expected = entry[key] ?? (key === "negative" ? null : []);
        const equal =
            key === "negative"
                ? (meta[key] === null && expected === null) ||
                  (meta[key] !== null &&
                      expected !== null &&
                      meta[key].phase === expected.phase &&
                      meta[key].type === expected.type)
                : JSON.stringify(meta[key]) === JSON.stringify(expected);
        if (!equal) {
            reject("manifest-metadata-mismatch");
        }
    }
}

export function variants(meta) {
    if (meta.flags.includes("module")) {
        return ["module"];
    }
    if (meta.flags.includes("raw")) {
        return ["raw"];
    }
    if (meta.flags.includes("onlyStrict")) {
        return ["strict"];
    }
    if (meta.flags.includes("noStrict")) {
        return ["non-strict"];
    }
    return ["non-strict", "strict"];
}
export function transform(bytes, variant) {
    return variant === "strict"
        ? Buffer.concat([Buffer.from('"use strict";\n'), bytes])
        : Buffer.from(bytes);
}
export function harnessPaths(meta) {
    if (meta.flags.includes("raw")) {
        return [];
    }
    return [
        "harness/assert.js",
        "harness/sta.js",
        ...(meta.flags.includes("async") ? ["harness/doneprintHandle.js"] : []),
        ...meta.includes.map((x) => `harness/${x}`),
    ];
}

export function blockers(meta, variant, id = null) {
    const list = [];
    const add = (status, reasonCode) => list.push({ status, reasonCode });
    if (variant === "module") {
        add("unsupported-feature", "module");
    }
    if (meta.flags.includes("async")) {
        add("unsupported-feature", "async");
    }
    for (const feature of meta.features) {
        if (feature === "async-functions") {
            add("unsupported-feature", "async-functions");
        } else if (feature !== "Symbol") {
            add("unsupported-feature", "unrecognized-feature");
        }
    }
    const missing = {
        U01: "asi",
        U02: "async-functions",
        U03: "asi",
        U09: "RegExp",
        U10: "asi",
        U11: "return-asi",
    }[id];
    if (missing && !list.some((x) => x.reasonCode === missing)) {
        add("unsupported-feature", missing);
    }
    if (meta.negative?.phase === "runtime") {
        add("unsupported-feature", "error-objects");
    }
    if (meta.flags.some((x) => x.startsWith("CanBlock")) || meta.locale.length) {
        add("unsupported-profile", "environment");
    }
    if (meta.flags.includes("non-deterministic")) {
        add("unsupported-profile", "nondeterministic-policy");
    }
    add(
        "unsupported-profile",
        variant === "strict"
            ? "strict-script-contract"
            : variant === "raw"
              ? "directive-script"
              : variant === "module"
                ? "module-profile"
                : "sloppy-script",
    );
    if (id === "U07") {
        add("unsupported-profile", "global-script");
    }
    if (variant !== "raw") {
        add("unsupported-feature", "harness-capabilities");
    }
    return list;
}

export function fixtureSelection(paths) {
    return {
        selected: paths.filter((p) => !p.endsWith("_FIXTURE.js")),
        excludedFixtures: paths.filter((p) => p.endsWith("_FIXTURE.js")),
    };
}

// No network, Git subprocess, reference-engine evaluation or capability-admission
// switch exists here. The caller supplies an exact-byte local export at the pin.
export async function planCorpus({ root, revision, lane, paths }) {
    if (!["node", "native"].includes(lane)) {
        reject("lane");
    }
    const { manifest, manifestSha256 } = await frozenManifest();
    if (
        !Array.isArray(paths) ||
        paths.length === 0 ||
        new Set(paths).size !== paths.length ||
        paths.some((path) => !manifest.entries.some((e) => e.path === path))
    ) {
        reject("selection-mismatch");
    }
    const files = [];
    for (const path of paths) {
        const entry = manifest.entries.find((e) => e.path === path);
        const file = { path, id: entry.id, variants: null, inputError: null };
        files.push(file);
        try {
            if (revision !== REVISION) {
                reject("revision-mismatch");
            }
            const bytes = await localBytes(root, path);
            const verified = verifyBytes(bytes, entry.blob);
            const meta = metadata(verified.source);
            compareMetadata(meta, entry);
            // Once valid metadata is known, an include failure cannot erase its pair.
            file.variants = variants(meta).map((variant) => ({
                id: `${REVISION}:${path}:${variant}:${lane}`,
                path,
                variant,
                lane,
                goal: variant === "module" ? "Module" : "Script",
                blob: entry.blob,
                sourceSha256: verified.sha256,
                byteLength: verified.byteLength,
                transformedSourceSha256: sha256(transform(bytes, variant)),
                metadata: meta,
                harness: [],
                blockers: blockers(meta, variant, entry.id),
            }));
            // Includes are checked before preflight even when every profile is blocked.
            const harness = [];
            for (const include of harnessPaths(meta)) {
                const input = await localBytes(root, include, "harness/");
                const blob = manifest.upstream.harnessBlobs[include];
                if (!blob) {
                    reject("include-unpinned");
                }
                const unit = verifyBytes(input, blob);
                harness.push({ path: include, blob, sha256: unit.sha256 });
            }
            for (const variant of file.variants) {
                variant.harness = harness;
            }
        } catch (error) {
            if (!(error instanceof InputError)) {
                throw error;
            }
            file.inputError = {
                status: "harness-error",
                stage: "input",
                reasonCode: error.reasonCode,
            };
        }
    }
    return {
        schemaVersion: 1,
        kind: "host-only-selection",
        revision,
        manifestSha256,
        lane,
        cache: false,
        files,
        excludedFixtures: [],
    };
}
