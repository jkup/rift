import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { metadata, variants, localBytes, sha256, blobHash } from "./input.mjs";

const decode = (bytes) => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);

export async function discoverTests(root, prefix = "test") {
    const paths = [];
    for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
        const path = `${prefix}/${entry.name}`;
        if (entry.isSymbolicLink()) {
            throw new Error(`Corpus symlink is not supported: ${path}`);
        }
        if (entry.isDirectory()) {
            paths.push(...(await discoverTests(root, path)));
        } else if (
            entry.isFile() &&
            entry.name.endsWith(".js") &&
            !entry.name.includes("_FIXTURE")
        ) {
            paths.push(path);
        }
    }
    return paths.sort();
}

export function skipReason(meta, path, policy) {
    for (const flag of ["module", "async", "CanBlockIsTrue", "CanBlockIsFalse"]) {
        if (meta.flags.includes(flag)) {
            return `profile:${flag}`;
        }
    }
    if (path.startsWith("test/intl402/")) {
        return "profile:Intl";
    }
    for (const feature of meta.features) {
        if (Object.hasOwn(policy.features, feature)) {
            return `feature:${feature}: ${policy.features[feature]}`;
        }
    }
    return null;
}

export function sourceUnit(bytes, path, role, ordinal, variant = "raw") {
    const text = (variant === "strict" ? '"use strict";\n' : "") + decode(bytes);
    return {
        unit: {
            id: `u${ordinal}`,
            ordinal,
            role,
            path,
            blob: blobHash(bytes),
            sourceSha256: sha256(bytes),
            transformedSha256: sha256(Buffer.from(text)),
            byteLength: bytes.length,
            sourceUnits: text.length,
        },
        text,
    };
}

// Includes and transformed tests are snapshotted once; every worker reads these
// immutable inputs, never a mutable external checkout during execution.
export function inputStore(corpus, directory) {
    const includes = new Map();
    async function snapshot(bytes, path, role, variant = "raw") {
        const value = sourceUnit(bytes, path, role, 0, variant);
        const file = join(directory, `${value.unit.transformedSha256}.js`);
        try {
            await writeFile(file, value.text, { flag: "wx" });
        } catch (error) {
            if (error.code !== "EEXIST") {
                throw error;
            }
        }
        return { ...value, file };
    }
    async function include(name) {
        if (!includes.has(name)) {
            includes.set(
                name,
                localBytes(corpus, `harness/${name}`, "harness/").then((bytes) =>
                    snapshot(bytes, `harness/${name}`, "harness"),
                ),
            );
        }
        return includes.get(name);
    }
    async function prepareVariant(bytes, path, meta, variant, reason) {
        const row = { path, variant, negative: meta.negative, sourceSha256: sha256(bytes) };
        if (reason) {
            return { ...row, status: "skip", reason };
        }
        try {
            const harness =
                variant === "raw"
                    ? []
                    : await Promise.all(["assert.js", "sta.js", ...meta.includes].map(include));
            const test = await snapshot(bytes, path, "test", variant);
            // Host services are absent in this driver. Conservative scanning
            // includes harness text and is reported, never counted as a pass.
            const hostService = [...harness, test].some((value) =>
                /\$262\b|\$DONE\b/.test(value.text),
            );
            return hostService
                ? { ...row, status: "skip", reason: "profile:test262-host-services" }
                : { ...row, inputs: [...harness, test] };
        } catch (error) {
            return { ...row, status: "input-error", reason: error.message };
        }
    }
    async function prepare(path, policy) {
        try {
            const bytes = await localBytes(corpus, path);
            // YAML normalizes CR line endings; preserve the original source
            // bytes for execution, including tests of Function#toString.
            const meta = metadata(decode(bytes).replace(/\r\n?/g, "\n"), { allowRawModule: true });
            const reason = skipReason(meta, path, policy);
            return await Promise.all(
                variants(meta).map((variant) => prepareVariant(bytes, path, meta, variant, reason)),
            );
        } catch (error) {
            return [{ path, variant: null, status: "input-error", reason: error.message }];
        }
    }
    return { prepare, snapshot, include };
}

export async function readPolicy() {
    return JSON.parse(await readFile(new URL("runner-policy.json", import.meta.url), "utf8"));
}
