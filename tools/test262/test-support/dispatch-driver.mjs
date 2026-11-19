import { readFixtureFileSync as readFileSync } from "./fixture-files.mjs";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { scratchRoot } from "./environment.mjs";

export function createDispatchDriver(name, fixtureDirectory, proposalDirectory) {
    const output = join(scratchRoot, name);
    const inputs = join(output, "inputs");
    mkdirSync(inputs, { recursive: true });
    const results = [];
    const read = (file) => JSON.parse(readFileSync(join(proposalDirectory, file)));
    function input(text) {
        for (const variant of ["alpha", "beta"]) {
            const path = join(fixtureDirectory, variant + ".js");
            if (readFileSync(path, "utf8") === text) {
                return path;
            }
        }
        const path = join(inputs, createHash("sha256").update(text).digest("hex") + ".js");
        writeFileSync(path, text);
        return path;
    }
    function observe(lane, request, mode, diagnostic, rule) {
        const args = [
            input(request.units[0].text),
            request.nonce,
            "observe",
            request.action,
            request.requestSha256,
            request.preflightId ?? "null",
            String(request.steps),
            String(request.calls),
            mode,
            diagnostic,
            rule,
        ];
        for (const unit of request.units) {
            args.push(unit.id, unit.role, input(unit.text));
        }
        const node = lane === "node";
        const suffix = process.platform === "win32" ? ".exe" : "";
        const command = node ? process.execPath : "build/native/" + name + suffix;
        const childArgs = node ? ["build/node/test/" + name + ".js", ...args] : args;
        const child = spawnSync(command, childArgs, {
            encoding: "utf8",
            timeout: 60000,
            maxBuffer: 32 * 1024 * 1024,
        });
        const record = {
            lane,
            label: request.nonce,
            args,
            status: child.status,
            signal: child.signal,
            error: child.error?.message ?? null,
            stdout: child.stdout,
            stderr: child.stderr,
        };
        results.push(record);
        if (child.status !== 0 || child.signal || child.error) {
            writeFileSync(join(output, "driver-failure.json"), JSON.stringify(record, null, 2));
        }
        assert.equal(child.status, 0, request.nonce + ": " + child.stderr);
        assert.equal(child.signal, null);
        assert.equal(child.error, undefined);
        return child.stdout.trim();
    }
    return { output, read, observe, results };
}
