import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "./input.mjs";
import { parseScriptDriverResult } from "./script-driver-result.mjs";

export const defaultLimits = {
    sourceUnits: 100000,
    parseDepth: 128,
    steps: 100000,
    calls: 64,
    evaluationDepth: 256,
    wallMs: 10000,
    outputBytes: 1048576,
};

export function createBinding(row, limits) {
    const request = {
        requestVersion: 2,
        nonce: randomUUID(),
        mode: "script-observation",
        variant: row.variant,
        units: row.inputs.map((input, ordinal) => ({ ...input.unit, id: `u${ordinal}`, ordinal })),
        realms: [{ id: "test", profile: "script" }],
        limits,
        preflightId: null,
        action: row.negative?.phase === "parse" ? "parse-only" : "execute",
    };
    const { requestVersion: _version, ...binding } = request;
    return {
        ...binding,
        requestSha256: sha256(JSON.stringify(request)),
        sources: row.inputs.map((input, ordinal) => ({
            unitId: `u${ordinal}`,
            transformedText: input.text,
        })),
    };
}

// Transport failure always wins over a result file, including a valid pass
// written before a crash. Kill is forced so an unresponsive test cannot stall a worker.
export function runProcess(command, args, limits, signal) {
    return new Promise((resolve) => {
        const started = performance.now();
        const child = spawn(command, args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let status = null;
        let reason = null;
        let outputBytes = 0;
        const output = [];
        const stop = (kind, detail) => {
            if (status === null) {
                status = kind;
                reason = detail;
                child.kill("SIGKILL");
            }
        };
        const abort = () => stop("cancelled", "run interrupted");
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) {
            abort();
        }
        const timer = setTimeout(
            () => stop("timeout", `${limits.wallMs}ms deadline`),
            limits.wallMs,
        );
        const capture = (chunk) => {
            const remaining = Math.max(0, limits.outputBytes - outputBytes);
            if (remaining > 0) {
                output.push(chunk.subarray(0, remaining));
            }
            outputBytes += chunk.length;
            if (outputBytes > limits.outputBytes) {
                stop("output-limit", `${outputBytes} output bytes`);
            }
        };
        child.stdout.on("data", capture);
        child.stderr.on("data", capture);
        child.on("error", (error) => stop("harness-error", error.message));
        child.on("close", (code, exitSignal) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            if (status === null && (code !== 0 || exitSignal !== null)) {
                status = "crash";
                reason = `exit=${code} signal=${exitSignal}`;
            }
            resolve({
                status,
                reason,
                exitCode: code,
                signal: exitSignal,
                elapsedMs: performance.now() - started,
                outputBytes,
                output: Buffer.concat(output).toString("utf8"),
            });
        });
    });
}

export function classifyResult(observation, negative) {
    const result = observation.result;
    if (observation.operation.stage !== "test") {
        return { status: "harness-error", reason: result.kind };
    }
    if (result.kind.startsWith("unsupported-")) {
        return { status: "unsupported", reason: result.capabilityCode ?? result.reasonCode };
    }
    if (result.kind === "resource-limit") {
        return { status: "resource-limit", reason: result.guardCode };
    }
    if (negative === null) {
        return {
            status: result.kind === "normal" && observation.testBodyEvaluated ? "pass" : "fail",
        };
    }
    const parseMatch =
        negative.phase === "parse" &&
        result.kind === "syntax-error" &&
        result.constructorName === negative.type &&
        observation.operation.phase === "parse";
    const runtimeMatch =
        negative.phase === "runtime" &&
        result.kind === "throw" &&
        result.constructor.outcome === "available" &&
        result.constructor.name === negative.type;
    return { status: parseMatch || runtimeMatch ? "pass" : "fail" };
}

export async function executeTest(row, execution) {
    const { command, prefix = [], directory, limits, signal } = execution;
    if (signal?.aborted) {
        return { status: "cancelled", reason: "run interrupted before launch" };
    }
    const binding = createBinding(row, limits);
    const resultPath = join(directory, `${binding.nonce}.json`);
    const args = [
        ...prefix,
        "script-observation",
        binding.action,
        binding.nonce,
        binding.requestSha256,
        "-",
        resultPath,
        String(limits.steps),
        String(limits.calls),
        ...row.inputs.flatMap((input, ordinal) => [`u${ordinal}`, input.unit.role, input.file]),
    ];
    const transport = await runProcess(command, args, limits, signal);
    try {
        if (transport.status) {
            return transport;
        }
        if ((await stat(resultPath)).size > 65536) {
            throw new Error("oversized driver result");
        }
        const observation = parseScriptDriverResult(await readFile(resultPath), binding);
        return { ...transport, ...classifyResult(observation, row.negative), observation };
    } catch (error) {
        return { ...transport, status: "harness-error", reason: error.message };
    } finally {
        await unlink(resultPath).catch((error) => {
            if (error.code !== "ENOENT") {
                throw error;
            }
        });
    }
}

export async function checkHarness(store, execution) {
    const harness = await Promise.all([store.include("assert.js"), store.include("sta.js")]);
    const controls = [
        [
            "assert.sameValue(1, 1); assert.notSameValue(0, -0); assert.throws(TypeError, function(){throw new TypeError();});",
            null,
        ],
        ["assert(false);", { phase: "runtime", type: "Test262Error" }],
        ["assert.sameValue(0, -0);", { phase: "runtime", type: "Test262Error" }],
        ["assert.throws(TypeError, function(){});", { phase: "runtime", type: "Test262Error" }],
        [
            "assert.throws(TypeError, function(){throw new RangeError();});",
            { phase: "runtime", type: "Test262Error" },
        ],
    ];
    const results = [];
    for (const variant of ["non-strict", "strict"]) {
        for (const [source, negative] of controls) {
            const test = await store.snapshot(
                Buffer.from(source),
                "test/runner-control.js",
                "test",
                variant,
            );
            const result = await executeTest(
                { variant, negative, inputs: [...harness, test] },
                execution,
            );
            results.push({ variant, source, ...result });
        }
    }
    return results;
}
