#!/usr/bin/env node

import { parentPort, workerData } from "worker_threads";
import { runSingleTest, getHarnessContent } from "./test262-core.js";

// Pre-warm the harness cache when worker starts
getHarnessContent();

// Each worker uses a unique temp file to avoid conflicts
const workerId = workerData?.workerId || 0;
const tempFile = `/tmp/test262_temp_${workerId}.js`;

// Listen for test files to run
parentPort.on("message", (message) => {
  if (message.type === "run") {
    const { testFile, index } = message;

    try {
      const result = runSingleTest(testFile, tempFile);
      parentPort.postMessage({
        type: "result",
        testFile,
        index,
        result,
      });
    } catch (error) {
      parentPort.postMessage({
        type: "result",
        testFile,
        index,
        result: {
          status: "failed",
          reason: `Worker error: ${error.message}`,
        },
      });
    }
  } else if (message.type === "exit") {
    process.exit(0);
  }
});

// Signal ready
parentPort.postMessage({ type: "ready" });
