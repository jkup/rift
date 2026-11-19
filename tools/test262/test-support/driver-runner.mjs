import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { scratchRoot } from "./environment.mjs";

export function createDriverRunner(prefix) {
    const output = mkdtempSync(join(scratchRoot, prefix));
    const results = [];
    function run(driver, lane, row, extra, check) {
        const file = row.file ?? join(output, results.length + ".js");
        if (row.file) {
            assert.equal(readFileSync(file, "utf8"), row.text, row.id + " runtime input");
        } else {
            writeFileSync(file, row.text);
        }
        const args = [file, row.id, ...extra];
        const command =
            lane === "node"
                ? process.execPath
                : `build/native/${driver}${process.platform === "win32" ? ".exe" : ""}`;
        const childArgs = lane === "node" ? [`build/node/test/${driver}.js`, ...args] : args;
        const child = spawnSync(command, childArgs, {
            encoding: "utf8",
            timeout: 60000,
            maxBuffer: 32 * 1024 * 1024,
        });
        const label = `${driver}/${lane}/${row.id}`;
        results.push({
            driver,
            lane,
            id: row.id,
            file,
            extra,
            status: child.status,
            signal: child.signal,
            error: child.error?.message ?? null,
        });
        try {
            assert.equal(child.error, undefined, label);
            assert.equal(child.signal, null, label);
            assert.equal(child.status, 0, label + ": " + child.stderr);
            assert.equal(child.stderr, "", label);
            check(child.stdout, label);
        } catch (error) {
            writeFileSync(
                join(output, `failure-${results.length}.txt`),
                (child.stdout ?? "") + (child.stderr ?? ""),
            );
            throw error;
        }
    }
    return {
        run,
        save: () =>
            writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2) + "\n"),
    };
}
