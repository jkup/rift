#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Worker } from "worker_threads";
import { cpus } from "os";
import chalk from "chalk";
import { Test262ResultsTracker } from "./test262-results-tracker.js";
import { Test262Cache } from "./test262-cache.js";
import {
  TEST262_DIR,
  RUNTIME_EXECUTABLE,
  findTestFiles,
  runSingleTest,
} from "./test262-core.js";

// Default number of workers based on CPU cores
const DEFAULT_WORKER_COUNT = Math.max(1, cpus().length - 1);

/**
 * WorkerPool - Manages a pool of worker threads for parallel test execution
 */
class WorkerPool {
  constructor(workerCount, onResult, onProgress) {
    this.workerCount = workerCount;
    this.workers = [];
    this.pendingTests = [];
    this.activeTests = new Map();
    this.onResult = onResult;
    this.onProgress = onProgress;
    this.completedCount = 0;
    this.totalTests = 0;
  }

  async initialize() {
    const workerPath = new URL("./test262-worker.js", import.meta.url).pathname;

    const readyPromises = [];

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerPath, {
        workerData: { workerId: i },
      });

      const readyPromise = new Promise((resolve) => {
        const handler = (message) => {
          if (message.type === "ready") {
            worker.off("message", handler);
            resolve();
          }
        };
        worker.on("message", handler);
      });

      worker.on("message", (message) => {
        if (message.type === "result") {
          this.handleResult(worker, message);
        }
      });

      worker.on("error", (error) => {
        console.error(chalk.red(`Worker ${i} error:`), error);
      });

      this.workers.push(worker);
      readyPromises.push(readyPromise);
    }

    // Wait for all workers to be ready
    await Promise.all(readyPromises);
  }

  handleResult(worker, message) {
    const { testFile, index, result } = message;
    this.completedCount++;
    this.activeTests.delete(worker);

    // Report result
    this.onResult(testFile, index, result);

    // Report progress
    if (this.onProgress) {
      this.onProgress(this.completedCount, this.totalTests, testFile);
    }

    // Send next test to this worker
    this.assignNextTest(worker);
  }

  assignNextTest(worker) {
    if (this.pendingTests.length > 0) {
      const { testFile, index } = this.pendingTests.shift();
      this.activeTests.set(worker, testFile);
      worker.postMessage({ type: "run", testFile, index });
    }
  }

  async runTests(testFiles) {
    this.totalTests = testFiles.length;
    this.completedCount = 0;

    // Queue all tests
    this.pendingTests = testFiles.map((testFile, index) => ({
      testFile,
      index,
    }));

    // Start initial batch of tests
    for (const worker of this.workers) {
      this.assignNextTest(worker);
    }

    // Wait for all tests to complete
    return new Promise((resolve) => {
      const checkComplete = setInterval(() => {
        if (
          this.completedCount >= this.totalTests &&
          this.activeTests.size === 0
        ) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 100);
    });
  }

  async shutdown() {
    for (const worker of this.workers) {
      worker.postMessage({ type: "exit" });
    }

    await Promise.all(
      this.workers.map(
        (worker) =>
          new Promise((resolve) => {
            worker.on("exit", resolve);
          })
      )
    );
  }
}

class Test262Runner {
  constructor(options = {}) {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.cached = 0; // Tests using cached results
    this.results = [];
    this.startTime = Date.now();
    this.tracker = new Test262ResultsTracker();
    this.workerCount = options.workers || DEFAULT_WORKER_COUNT;
    this.sequential = options.sequential || false;
    this.incremental = options.incremental || false;
    this.force = options.force || false;
    this.cache = new Test262Cache();
    this.runtimeChanged = false;
  }

  displayStatus(currentTest = "", totalTests = 0, currentIndex = 0) {
    if (process.env.CI) {
      return;
    }

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const progress =
      totalTests > 0 ? ((currentIndex / totalTests) * 100).toFixed(1) : 0;

    const passedBox = chalk.green(
      `[P ${this.passed.toString().padStart(4)}]`
    );
    const failedBox = chalk.red(`[F ${this.failed.toString().padStart(4)}]`);
    const skippedBox = chalk.yellow(
      `[S ${this.skipped.toString().padStart(4)}]`
    );
    const cachedBox = this.incremental
      ? chalk.cyan(`[C ${this.cached.toString().padStart(4)}]`)
      : "";

    const progressBar = this.createProgressBar(currentIndex, totalTests, 20);

    let currentTestDisplay = "";
    if (currentTest) {
      const relativePath = path.relative(TEST262_DIR, currentTest);
      const maxLength = 40;
      currentTestDisplay =
        relativePath.length > maxLength
          ? "..." + relativePath.slice(-maxLength + 3)
          : relativePath;
    }

    const statusLine = [
      passedBox,
      failedBox,
      skippedBox,
      cachedBox,
      progressBar,
      chalk.dim(`${progress}%`),
      chalk.dim(`${elapsed}s`),
      currentTestDisplay ? chalk.dim(currentTestDisplay) : "",
    ]
      .filter(Boolean)
      .join(" ");

    process.stdout.write("\r" + statusLine + "\x1b[K");
  }

  showHeader(totalTests) {
    if (process.env.CI) {
      console.log(`Running ${totalTests} tests...`);
      return;
    }

    console.log(chalk.bold.cyan("Test262 Runner for Rift"));
    console.log(chalk.cyan("=".repeat(50)));
    console.log();
    console.log(chalk.bold.green(`Found ${totalTests} test files to run`));

    if (!this.sequential) {
      console.log(
        chalk.dim(`Running in parallel with ${this.workerCount} workers`)
      );
    } else {
      console.log(chalk.dim("Running in sequential mode"));
    }

    if (this.incremental) {
      const stats = this.cache.getStats();
      console.log(
        chalk.cyan(
          `Incremental mode: ${stats.totalCached} cached results available`
        )
      );
      if (this.runtimeChanged) {
        console.log(chalk.yellow("Runtime changed - all tests will re-run"));
      }
    }

    console.log(chalk.dim("Press Ctrl+C to stop at any time"));
    console.log();
    console.log(chalk.bold("Legend:"));
    console.log(
      `${chalk.green("[P ####]")} Passed  ${chalk.red(
        "[F ####]"
      )} Failed  ${chalk.yellow("[S ####]")} Skipped`
    );
    console.log();
  }

  createProgressBar(current, total, width = 40) {
    const percentage = total > 0 ? current / total : 0;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    const filledBar = chalk.green("#".repeat(filled));
    const emptyBar = chalk.gray("-".repeat(empty));

    return `[${filledBar}${emptyBar}]`;
  }

  async setupTest262() {
    if (!process.env.CI) {
      console.log(chalk.bold.cyan("Test262 Runner for Rift"));
      console.log(chalk.cyan("=".repeat(50)));
      console.log();
      console.log(chalk.yellow("Setting up test262..."));
    }

    if (!fs.existsSync(TEST262_DIR)) {
      if (!process.env.CI) {
        console.log(chalk.blue("Cloning test262 repository..."));
      }
      try {
        execSync(
          `git clone --depth 1 https://github.com/tc39/test262.git ${TEST262_DIR}`,
          { stdio: process.env.CI ? "pipe" : "inherit" }
        );
        if (!process.env.CI) {
          console.log(chalk.green("Successfully cloned test262"));
        }
      } catch (error) {
        console.error(chalk.red("Failed to clone test262:"), error.message);
        process.exit(1);
      }
    } else {
      if (!process.env.CI) {
        console.log(chalk.green("test262 directory already exists"));
      }
    }
  }

  async buildRuntime() {
    if (!process.env.CI) {
      console.log(chalk.yellow("Building runtime..."));
    }

    if (!fs.existsSync("./build.sh")) {
      console.error(chalk.red("build.sh not found"));
      process.exit(1);
    }

    try {
      execSync("./build.sh", { stdio: process.env.CI ? "pipe" : "inherit" });
      if (!process.env.CI) {
        console.log(chalk.green("Runtime built successfully"));
      }
    } catch (error) {
      console.error(chalk.red("Failed to build runtime:"), error.message);
      process.exit(1);
    }

    if (!fs.existsSync(RUNTIME_EXECUTABLE)) {
      console.error(chalk.red("Runtime executable not found after build"));
      process.exit(1);
    }
  }

  recordResult(testFile, result) {
    if (result.status === "passed") {
      this.passed++;
      this.tracker.recordResult(testFile, "passed", result.reason);
    } else if (result.status === "failed") {
      this.failed++;
      this.tracker.recordResult(testFile, "failed", result.reason);
    } else if (result.status === "skipped") {
      this.skipped++;
      this.tracker.recordResult(testFile, "skipped", result.reason);
    }

    // Record to cache for incremental testing
    if (this.incremental) {
      this.cache.recordResult(testFile, result.status, result.reason);
    }

    const relativePath = path.relative(TEST262_DIR, testFile);
    this.results.push({
      file: relativePath,
      ...result,
    });
  }

  async runParallel(testFiles) {
    const pool = new WorkerPool(
      this.workerCount,
      (testFile, index, result) => {
        this.recordResult(testFile, result);
      },
      (completed, total, currentTest) => {
        this.displayStatus(currentTest, total, completed);
      }
    );

    await pool.initialize();
    await pool.runTests(testFiles);
    await pool.shutdown();
  }

  async runSequential(testFiles) {
    for (let i = 0; i < testFiles.length; i++) {
      const testFile = testFiles[i];
      this.displayStatus(testFile, testFiles.length, i);

      const result = runSingleTest(testFile);
      this.recordResult(testFile, result);
    }

    this.displayStatus("", testFiles.length, testFiles.length);
  }

  async run(includePattern = null) {
    await this.setupTest262();
    await this.buildRuntime();

    const testFiles = findTestFiles(includePattern);

    // Initialize incremental cache if enabled
    let testsToRun = testFiles;
    if (this.incremental && !this.force) {
      this.cache.load();
      this.runtimeChanged = this.cache.hasRuntimeChanged(RUNTIME_EXECUTABLE);

      // Prune stale entries from cache
      this.cache.pruneStaleEntries(testFiles);

      // Filter tests that need to run
      testsToRun = [];
      for (const testFile of testFiles) {
        const { needsRun, cachedResult } = this.cache.checkTest(
          testFile,
          this.runtimeChanged
        );

        if (needsRun) {
          testsToRun.push(testFile);
        } else {
          // Use cached result
          this.cached++;
          if (cachedResult.status === "passed") {
            this.passed++;
          } else if (cachedResult.status === "failed") {
            this.failed++;
          } else if (cachedResult.status === "skipped") {
            this.skipped++;
          }

          this.tracker.recordResult(
            testFile,
            cachedResult.status,
            cachedResult.reason
          );

          const relativePath = path.relative(TEST262_DIR, testFile);
          this.results.push({
            file: relativePath,
            ...cachedResult,
            cached: true,
          });
        }
      }
    }

    this.showHeader(testFiles.length);

    if (this.incremental && !this.force) {
      console.log(
        chalk.cyan(
          `Running ${testsToRun.length} tests (${this.cached} cached)`
        )
      );
      console.log();
    }

    // Wait a moment before starting
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (testsToRun.length > 0) {
      if (this.sequential) {
        await this.runSequential(testsToRun);
      } else {
        await this.runParallel(testsToRun);
      }
    }

    // Add a newline to finish the status line
    console.log();

    // Save cache if incremental mode is enabled
    if (this.incremental) {
      this.cache.save();
    }

    // Wait a moment before showing summary
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.printSummary();
  }

  printSummary() {
    console.log();

    const total = this.passed + this.failed + this.skipped;
    const passRate =
      total > 0
        ? ((this.passed / (this.passed + this.failed)) * 100).toFixed(1)
        : 0;
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    if (process.env.CI) {
      console.log(`\nTest Results:`);
      console.log(`Passed: ${this.passed}`);
      console.log(`Failed: ${this.failed}`);
      console.log(`Skipped: ${this.skipped}`);
      if (this.incremental && this.cached > 0) {
        console.log(`Cached: ${this.cached}`);
      }
      console.log(`Total: ${total}`);
      console.log(`Pass Rate: ${passRate}%`);
      console.log(`Runtime: ${runtime}s`);

      const resultsFile = this.tracker.saveResults("test262-results.json");
      console.log(`Results saved to: ${resultsFile}`);
      return;
    }

    console.log(chalk.bold.cyan("Final Results"));
    console.log(chalk.cyan("=".repeat(50)));
    console.log();

    console.log(
      chalk.green(`Passed:   ${this.passed.toString().padStart(6)}`)
    );
    console.log(
      chalk.red(`Failed:   ${this.failed.toString().padStart(6)}`)
    );
    console.log(
      chalk.yellow(`Skipped:  ${this.skipped.toString().padStart(6)}`)
    );
    console.log(chalk.dim("-".repeat(20)));
    console.log(chalk.bold(`Total:    ${total.toString().padStart(6)}`));
    console.log(chalk.bold(`Pass Rate: ${passRate}%`));
    console.log(chalk.dim(`Runtime:  ${runtime}s`));

    if (!this.sequential) {
      console.log(chalk.dim(`Workers:  ${this.workerCount}`));
    }

    if (this.incremental && this.cached > 0) {
      console.log(chalk.cyan(`Cached:   ${this.cached.toString().padStart(6)}`));
    }

    console.log();
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Skipped: ${this.skipped}`);
    if (this.incremental && this.cached > 0) {
      console.log(`Cached: ${this.cached}`);
    }
    console.log(`Total: ${total}`);
    console.log(`Pass Rate: ${passRate}%`);

    const resultsFile = this.tracker.saveResults("test262-results.json");
    console.log();
    console.log(chalk.green(`Detailed results saved to: ${resultsFile}`));

    this.tracker.printSummary();

    if (this.failed > 0) {
      console.log();
      console.log(chalk.bold.red("Failed Tests (sample):"));
      console.log(chalk.red("-".repeat(50)));

      this.results
        .filter((r) => r.status === "failed")
        .slice(0, 15)
        .forEach((r, index) => {
          console.log(
            chalk.red(`${(index + 1).toString().padStart(2)}. ${r.file}`)
          );
          if (r.reason) {
            console.log(
              chalk.dim(
                `    ${r.reason.substring(0, 80)}${
                  r.reason.length > 80 ? "..." : ""
                }`
              )
            );
          }
          if (r.stderr) {
            console.log(
              chalk.dim(
                `    stderr: ${r.stderr.substring(0, 60)}${
                  r.stderr.length > 60 ? "..." : ""
                }`
              )
            );
          }
          console.log();
        });

      if (this.failed > 15) {
        console.log(chalk.dim(`... and ${this.failed - 15} more failures`));
      }
    } else if (this.passed > 0) {
      console.log();
      console.log(chalk.bold.green("All tests passed! Great job!"));
    }

    console.log();
    console.log(
      chalk.dim("Run with more test directories to expand coverage.")
    );
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    includePattern: null,
    singleTest: null,
    workers: DEFAULT_WORKER_COUNT,
    sequential: false,
    incremental: false,
    force: false,
    clearCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--include" && i + 1 < args.length) {
      options.includePattern = args[i + 1];
      i++;
    } else if (args[i] === "--workers" && i + 1 < args.length) {
      options.workers = parseInt(args[i + 1], 10);
      if (isNaN(options.workers) || options.workers < 1) {
        console.error(chalk.red("Invalid worker count, using default"));
        options.workers = DEFAULT_WORKER_COUNT;
      }
      i++;
    } else if (args[i] === "--sequential" || args[i] === "-s") {
      options.sequential = true;
    } else if (args[i] === "--incremental" || args[i] === "-i") {
      options.incremental = true;
    } else if (args[i] === "--force" || args[i] === "-f") {
      options.force = true;
    } else if (args[i] === "--clear-cache") {
      options.clearCache = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Test262 Runner for Rift

Usage: node test262-runner.js [options] [single-test]

Options:
  --include <pattern>   Only run tests matching pattern
  --workers <count>     Number of parallel workers (default: ${DEFAULT_WORKER_COUNT})
  --sequential, -s      Run tests sequentially (no parallelism)
  --incremental, -i     Skip unchanged tests (uses cached results)
  --force, -f           Force re-run all tests (ignores cache)
  --clear-cache         Clear the test cache and exit
  --help, -h            Show this help message

Examples:
  node test262-runner.js                           # Run all tests in parallel
  node test262-runner.js --workers 4               # Run with 4 workers
  node test262-runner.js --sequential              # Run sequentially
  node test262-runner.js --incremental             # Skip unchanged tests
  node test262-runner.js -i --force                # Re-run all and update cache
  node test262-runner.js --include "Array"         # Run only Array tests
  node test262-runner.js test/language/expressions/addition/test.js  # Run single test
`);
      process.exit(0);
    } else if (!args[i].startsWith("--")) {
      options.singleTest = args[i];
    }
  }

  return options;
}

// Run the test suite
const options = parseArgs();

// Handle --clear-cache option
if (options.clearCache) {
  Test262Cache.clear();
  process.exit(0);
}

const runner = new Test262Runner({
  workers: options.workers,
  sequential: options.sequential,
  incremental: options.incremental,
  force: options.force,
});

if (options.singleTest) {
  try {
    const result = runSingleTest(`${TEST262_DIR}/${options.singleTest}`);
    console.log(result);
  } catch (error) {
    console.error(error);
  }
} else {
  try {
    await runner.run(options.includePattern);
  } catch (error) {
    console.error(error);
  }
}
