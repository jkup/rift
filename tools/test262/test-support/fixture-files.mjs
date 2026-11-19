import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

// Large regression inputs are compressed without changing their pinned bytes.
function compressedPath(file) {
    const path = resolve(file instanceof URL ? fileURLToPath(file) : file);
    const fixtureDirectory = ["", "test", "fixtures", "tooling", ""].join(sep);
    if (path.includes(fixtureDirectory) && path.endsWith(".json") && !existsSync(path)) {
        return path + ".gz";
    }
    return null;
}

function decode(bytes, options) {
    const encoding = typeof options === "string" ? options : options?.encoding;
    const plain = gunzipSync(bytes);
    return encoding ? plain.toString(encoding) : plain;
}

export function readFixtureFileSync(file, options) {
    const compressed = compressedPath(file);
    if (compressed !== null) {
        return decode(readFileSync(compressed), options);
    }
    return readFileSync(file, options);
}

export async function readFixtureFile(file, options) {
    const compressed = compressedPath(file);
    if (compressed !== null) {
        return decode(await readFile(compressed), options);
    }
    return readFile(file, options);
}
