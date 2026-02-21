#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Worker } from "worker_threads";
import { cpus } from "os";
import chalk from "chalk";
import { Test262ResultsTracker } from "./results-tracker.js";
import { Test262Cache } from "./cache.js";
import {
  TEST262_DIR,
  RUNTIME_EXECUTABLE,
  findTestFiles,
  runSingleTest,
  preFilterTest,
} from "./core.js";

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
    const workerPath = new URL("./worker.js", import.meta.url).pathname;

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

    // Resolve when all tests are done
    if (this.completedCount >= this.totalTests && this.resolveAll) {
      this.resolveAll();
    }
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

    if (this.totalTests === 0) return;

    // Queue all tests
    this.pendingTests = testFiles.map((testFile, index) => ({
      testFile,
      index,
    }));

    // Wait for all tests to complete
    return new Promise((resolve) => {
      this.resolveAll = resolve;

      // Start initial batch of tests
      for (const worker of this.workers) {
        this.assignNextTest(worker);
      }
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

// ─── Display Helpers ──────────────────────────────────────────────────────────

function fmt(n) {
  return n.toLocaleString("en-US");
}

function makeBar(fraction, width, filledChar = "\u2588", emptyChar = "\u2591") {
  const filled = Math.round(width * Math.min(1, Math.max(0, fraction)));
  const empty = width - filled;
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/** Color a percentage string based on its value */
function colorPct(pctNum, bold = false) {
  const str = (typeof pctNum === "number" ? pctNum.toFixed(1) : pctNum) + "%";
  if (pctNum >= 70) return bold ? chalk.bold.green(str) : chalk.green(str);
  if (pctNum >= 40) return bold ? chalk.bold.yellow(str) : chalk.yellow(str);
  return bold ? chalk.bold.red(str) : chalk.red(str);
}

/** Color a bar based on pass rate */
function colorBar(fraction, width) {
  const filled = Math.round(width * Math.min(1, Math.max(0, fraction)));
  const empty = width - filled;
  const filledStr = "\u2588".repeat(filled);
  const emptyStr = "\u2591".repeat(empty);
  if (fraction >= 0.7) return chalk.green(filledStr) + chalk.dim(emptyStr);
  if (fraction >= 0.4) return chalk.yellow(filledStr) + chalk.dim(emptyStr);
  return chalk.red(filledStr) + chalk.dim(emptyStr);
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
    this.includePattern = null;
    this.totalTestCount = 0;
  }

  getResultsFilename() {
    if (this.includePattern) {
      // Sanitize pattern for use as filename
      const safe = this.includePattern.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
      return `test262-results-${safe}.json`;
    }
    return "test262-results.json";
  }

  displayStatus(currentTest = "", totalTests = 0, currentIndex = 0) {
    if (process.env.CI) {
      return;
    }

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
    const pct = totalTests > 0 ? (currentIndex / totalTests) : 0;
    const pctStr = (pct * 100).toFixed(1);

    // Multi-color bar: filled portion = pass(green) + fail(red) + skip(gray), rest = not yet run
    const barW = 30;
    const done = this.passed + this.failed + this.skipped;
    const doneChars = Math.round(barW * (totalTests > 0 ? done / totalTests : 0));
    const todoChars = barW - doneChars;
    // Split the filled portion proportionally by pass/fail/skip
    const passFrac = done > 0 ? this.passed / done : 0;
    const failFrac = done > 0 ? this.failed / done : 0;
    const passChars = Math.round(doneChars * passFrac);
    const failChars = Math.round(doneChars * failFrac);
    const skipChars = Math.max(0, doneChars - passChars - failChars);
    const bar = chalk.green("\u2588".repeat(passChars)) +
                chalk.red("\u2588".repeat(failChars)) +
                chalk.dim("\u2588".repeat(skipChars)) +
                chalk.dim("\u2591".repeat(Math.max(0, todoChars)));

    const p = chalk.green(`\u2713${fmt(this.passed)}`);
    const f = chalk.red(`\u2717${fmt(this.failed)}`);
    const s = chalk.dim(`\u25CB${fmt(this.skipped)}`);

    let line = `  ${bar}  ${chalk.bold.cyan(pctStr + "%")}  ${p} ${f} ${s}  ${chalk.dim(elapsed + "s")}`;

    if (currentTest) {
      const rel = path.relative(TEST262_DIR, currentTest);
      const maxLen = 35;
      const display = rel.length > maxLen ? "\u2026" + rel.slice(-maxLen + 1) : rel;
      line += "  " + chalk.dim(display);
    }

    process.stdout.write("\r\x1b[K" + line);
  }

  showHeader(totalTests) {
    if (process.env.CI) {
      console.log(`Running ${totalTests} tests...`);
      return;
    }

    console.log();
    console.log(
      "  " + chalk.yellow("\u26A1") + " " + chalk.bold.cyan("RIFT") +
      chalk.dim("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  ") +
      chalk.white("ECMAScript Test262")
    );
    console.log("  " + chalk.dim("\u2500".repeat(60)));
    console.log();

    const info = [
      chalk.bold.white(fmt(totalTests) + " tests"),
    ];
    if (!this.sequential) {
      info.push(chalk.cyan(this.workerCount + " workers"));
    } else {
      info.push(chalk.cyan("sequential"));
    }
    if (this.incremental) {
      const stats = this.cache.getStats();
      info.push(chalk.magenta(fmt(stats.totalCached) + " cached"));
      if (this.runtimeChanged) {
        info.push(chalk.yellow("runtime changed"));
      }
    }

    console.log("  " + info.join(chalk.dim("  \u00B7  ")));
    console.log();
  }

  async setupTest262() {
    if (!fs.existsSync(TEST262_DIR)) {
      if (!process.env.CI) {
        process.stdout.write("  " + chalk.dim("Cloning test262... "));
      }
      try {
        execSync(
          `git clone --depth 1 https://github.com/tc39/test262.git ${TEST262_DIR}`,
          { stdio: "pipe" }
        );
        if (!process.env.CI) {
          console.log(chalk.green("\u2713"));
        }
      } catch (error) {
        console.error(chalk.red("\u2717 Failed to clone test262:"), error.message);
        process.exit(1);
      }
    }
  }

  async buildRuntime() {
    if (!process.env.CI) {
      process.stdout.write("  " + chalk.dim("Building... "));
    }

    try {
      // Use fast incremental build if build directory exists, otherwise do a full build
      if (fs.existsSync("./build/Makefile")) {
        const jobs = cpus().length;
        execSync(`make -j${jobs}`, { stdio: "pipe", cwd: "./build" });
      } else {
        if (!fs.existsSync("./build.sh")) {
          console.error(chalk.red("build.sh not found"));
          process.exit(1);
        }
        execSync("./build.sh", { stdio: "pipe" });
      }
      if (!process.env.CI) {
        console.log(chalk.green("\u2713"));
      }
    } catch (error) {
      if (!process.env.CI) {
        console.log(chalk.red("\u2717"));
      }
      console.error(chalk.red("Build failed:"), error.message);
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
    this.includePattern = includePattern;
    if (!process.env.CI) {
      console.log();
    }
    await this.setupTest262();
    await this.buildRuntime();

    const testFiles = findTestFiles(includePattern);
    this.totalTestCount = testFiles.length;

    if (includePattern) {
      if (!process.env.CI) {
        console.log("  " + chalk.cyan(`Filter: "${includePattern}" \u2192 ${testFiles.length} tests`));
      }
      if (testFiles.length === 0) {
        console.error(chalk.red(`No tests matched pattern "${includePattern}"`));
        console.error(chalk.dim("Pattern is matched as a substring of the test file path (relative to test262/test/)"));
        return;
      }
    }

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

    // Pre-filter: check skip conditions in main thread to avoid worker round-trips
    const actualTestsToRun = [];
    for (const testFile of testsToRun) {
      const skipResult = preFilterTest(testFile);
      if (skipResult) {
        this.recordResult(testFile, skipResult);
      } else {
        actualTestsToRun.push(testFile);
      }
    }
    testsToRun = actualTestsToRun;

    this.showHeader(testFiles.length);

    if (this.incremental && !this.force && !process.env.CI) {
      console.log(
        "  " + chalk.cyan(
          `Running ${fmt(testsToRun.length)} tests (${fmt(this.cached)} cached)`
        )
      );
      console.log();
    }

    if (testsToRun.length > 0) {
      if (this.sequential) {
        await this.runSequential(testsToRun);
      } else {
        await this.runParallel(testsToRun);
      }
    }

    // Clear the progress line
    if (!process.env.CI) {
      process.stdout.write("\r\x1b[K");
    }

    // Save cache if incremental mode is enabled
    if (this.incremental) {
      this.cache.save();
    }

    this.printSummary();
  }

  printSummary() {
    const total = this.passed + this.failed + this.skipped;
    const runTests = this.passed + this.failed;
    const runPassRate = runTests > 0 ? ((this.passed / runTests) * 100).toFixed(1) : "0.0";
    const overallPassRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : "0.0";
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // ─── CI mode: machine-readable output (parsed by GitHub Actions) ─────
    if (process.env.CI) {
      console.log(`\nTest Results:`);
      console.log(`Passed: ${this.passed}`);
      console.log(`Failed: ${this.failed}`);
      console.log(`Skipped: ${this.skipped}`);
      if (this.incremental && this.cached > 0) {
        console.log(`Cached: ${this.cached}`);
      }
      console.log(`Total: ${total}`);
      console.log(`Pass Rate (run): ${runPassRate}%`);
      console.log(`Pass Rate (all): ${overallPassRate}%`);
      console.log(`Runtime: ${runtime}s`);

      const resultsFile = this.tracker.saveResults(this.getResultsFilename());
      console.log(`Results saved to: ${resultsFile}`);
      return;
    }

    // ─── Interactive mode: visual output ─────────────────────────────────

    const W = 60; // box width
    const runPctNum = parseFloat(runPassRate);
    const allPctNum = parseFloat(overallPassRate);

    // Header
    console.log();
    console.log(
      "  " + chalk.yellow("\u26A1") + " " + chalk.bold.cyan("RIFT") +
      chalk.dim("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  ") +
      chalk.white("ECMAScript Test262")
    );
    console.log("  " + chalk.dim("\u2500".repeat(W)));

    // Big pass count + rate
    const runFraction = runTests > 0 ? this.passed / runTests : 0;
    console.log();
    console.log(
      "  " + chalk.bold.cyan(fmt(this.passed)) +
      chalk.dim(" / " + fmt(runTests) + " tests passing") +
      "    " + colorPct(runPctNum, true)
    );
    console.log();

    // Main progress bar — green for pass, red for fail, dim for skipped
    const barWidth = 44;
    const passCols = Math.round(barWidth * (runTests > 0 ? this.passed / total : 0));
    const failCols = Math.round(barWidth * (runTests > 0 ? this.failed / total : 0));
    const skipCols = barWidth - passCols - failCols;
    const mainBar = chalk.green("\u2588".repeat(passCols)) +
                    chalk.red("\u2588".repeat(failCols)) +
                    chalk.dim("\u2591".repeat(Math.max(0, skipCols)));
    console.log("  " + mainBar);
    console.log();

    // Stats line
    console.log(
      "  " +
      chalk.bold.green("\u2713 " + fmt(this.passed) + " passed") + "    " +
      chalk.bold.red("\u2717 " + fmt(this.failed) + " failed") + "    " +
      chalk.dim("\u25CB " + fmt(this.skipped) + " skipped")
    );
    console.log();

    // Info box with cyan borders
    const bdr = chalk.cyan;
    console.log("  " + bdr("\u250C" + "\u2500".repeat(W - 2) + "\u2510"));

    const runLine = "  Pass Rate (run)  ";
    const runVal = runPassRate.padStart(6) + "%";
    const runDetail = "    " + fmt(this.passed) + " / " + fmt(runTests);
    const runPad = Math.max(0, W - 2 - runLine.length - runVal.length - runDetail.length);
    console.log("  " + bdr("\u2502") + chalk.white(runLine) +
      colorPct(runPctNum, true) + chalk.dim(runDetail) +
      " ".repeat(runPad) + bdr("\u2502"));

    const allLine = "  Pass Rate (all)  ";
    const allVal = overallPassRate.padStart(6) + "%";
    const allDetail = "    " + fmt(this.passed) + " / " + fmt(total);
    const allPad = Math.max(0, W - 2 - allLine.length - allVal.length - allDetail.length);
    console.log("  " + bdr("\u2502") + chalk.white(allLine) +
      colorPct(allPctNum, false) + chalk.dim(allDetail) +
      " ".repeat(allPad) + bdr("\u2502"));

    const rtLine = `  Runtime            ${runtime.padStart(5)}s    ${this.workerCount} workers`;
    console.log("  " + bdr("\u2502") + chalk.dim(rtLine) +
      " ".repeat(Math.max(0, W - 2 - rtLine.length)) + bdr("\u2502"));

    if (this.incremental && this.cached > 0) {
      const cacheInfo = `  Cached             ${fmt(this.cached).padStart(6)}`;
      console.log("  " + bdr("\u2502") + chalk.magenta(cacheInfo) +
        " ".repeat(Math.max(0, W - 2 - cacheInfo.length)) + bdr("\u2502"));
    }
    console.log("  " + bdr("\u2514" + "\u2500".repeat(W - 2) + "\u2518"));

    // Category breakdowns from tracker
    const report = this.tracker.generateReport();
    const { summary } = report;

    // Strongest categories
    if (summary.strongestCategories && summary.strongestCategories.length > 0) {
      console.log();
      console.log("  " + chalk.bold.green("\u2605") + " " + chalk.bold.white("Almost There") + chalk.dim("  (70-99% pass rate)"));
      console.log("  " + chalk.dim("\u2500".repeat(W)));
      summary.strongestCategories.slice(0, 8).forEach((cat) => {
        const rate = cat.passRate / 100;
        const nameStr = cat.name.length > 30 ? cat.name.slice(0, 29) + "\u2026" : cat.name;
        console.log(
          "  " + chalk.white(nameStr.padEnd(31)) +
          colorBar(rate, 12) + " " +
          colorPct(cat.passRate, true) +
          chalk.dim("  " + cat.passed + "/" + cat.total)
        );
      });
    }

    // Largest categories
    if (summary.largestCategories && summary.largestCategories.length > 0) {
      console.log();
      console.log("  " + chalk.bold.yellow("\u25C6") + " " + chalk.bold.white("Largest Suites"));
      console.log("  " + chalk.dim("\u2500".repeat(W)));
      summary.largestCategories.slice(0, 5).forEach((cat) => {
        const rate = cat.passRate / 100;
        const nameStr = cat.name.length > 26 ? cat.name.slice(0, 25) + "\u2026" : cat.name;
        console.log(
          "  " + chalk.white(nameStr.padEnd(27)) +
          chalk.cyan(cat.total.toString().padStart(5)) + "  " +
          colorBar(rate, 12) + " " +
          colorPct(cat.passRate, false)
        );
      });
    }

    // Save results
    const resultsFile = this.tracker.saveResults(this.getResultsFilename());
    console.log();
    console.log("  " + chalk.dim("Saved to " + resultsFile));
    console.log();
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

  // Helper to extract value from --flag=value syntax
  function extractEqualValue(arg, flag) {
    if (arg.startsWith(flag + "=")) {
      return arg.slice(flag.length + 1);
    }
    return null;
  }

  for (let i = 0; i < args.length; i++) {
    const eqInclude = extractEqualValue(args[i], "--include");
    const eqWorkers = extractEqualValue(args[i], "--workers");

    if (args[i] === "--include" && i + 1 < args.length) {
      options.includePattern = args[i + 1];
      i++;
    } else if (eqInclude !== null) {
      options.includePattern = eqInclude;
    } else if (args[i] === "--workers" && i + 1 < args.length) {
      options.workers = parseInt(args[i + 1], 10);
      if (isNaN(options.workers) || options.workers < 1) {
        console.error(chalk.red("Invalid worker count, using default"));
        options.workers = DEFAULT_WORKER_COUNT;
      }
      i++;
    } else if (eqWorkers !== null) {
      options.workers = parseInt(eqWorkers, 10);
      if (isNaN(options.workers) || options.workers < 1) {
        console.error(chalk.red("Invalid worker count, using default"));
        options.workers = DEFAULT_WORKER_COUNT;
      }
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

Usage: npm run test262 [-- options] [single-test-or-directory]

Options:
  --include <pattern>   Only run tests matching pattern (substring match on path)
  --workers <count>     Number of parallel workers (default: ${DEFAULT_WORKER_COUNT})
  --sequential, -s      Run tests sequentially (no parallelism)
  --incremental, -i     Skip unchanged tests (uses cached results)
  --force, -f           Force re-run all tests (ignores cache)
  --clear-cache         Clear the test cache and exit
  --help, -h            Show this help message

Examples:
  npm run test262                                                     # Run all tests
  npm run test262 -- --workers 4                                      # Run with 4 workers
  npm run test262 -- --sequential                                     # Run sequentially
  npm run test262 -- --incremental                                    # Skip unchanged tests
  npm run test262 -- -i --force                                       # Re-run all, update cache
  npm run test262 -- --include "Array"                                # Only Array tests
  npm run test262 -- --include="built-ins/Temporal"                   # Only Temporal tests
  npm run test262 -- --include "built-ins/Temporal/Instant"           # Only Instant tests
  npm run test262 -- test/built-ins/Temporal/                         # Run directory of tests
  npm run test262 -- test/language/expressions/addition/test.js       # Run single test
`);
      process.exit(0);
    } else if (args[i].startsWith("--")) {
      console.error(chalk.red(`Unknown option: ${args[i]}`));
      console.error(chalk.dim("Run with --help to see available options"));
      process.exit(1);
    } else {
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
  const fullPath = path.resolve(`${TEST262_DIR}/${options.singleTest}`);

  // Check if path exists
  if (!fs.existsSync(fullPath)) {
    // Maybe they passed a path relative to test262/test/ instead of test262/
    const altPath = path.resolve(`${TEST262_DIR}/test/${options.singleTest}`);
    if (fs.existsSync(altPath)) {
      options.singleTest = `test/${options.singleTest}`;
    } else {
      console.error(chalk.red(`Error: Path not found: ${fullPath}`));
      process.exit(1);
    }
  }

  const resolvedPath = path.resolve(`${TEST262_DIR}/${options.singleTest}`);

  if (fs.statSync(resolvedPath).isDirectory()) {
    // Convert directory argument to an --include pattern run
    // Strip leading "test/" prefix if present for the include pattern
    let pattern = options.singleTest;
    if (pattern.startsWith("test/")) {
      pattern = pattern.slice(5);
    }
    // Strip trailing slash
    if (pattern.endsWith("/")) {
      pattern = pattern.slice(0, -1);
    }
    console.log(chalk.cyan(`Running all tests in directory: ${pattern}`));
    try {
      await runner.run(pattern);
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      const result = runSingleTest(resolvedPath);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
} else {
  try {
    await runner.run(options.includePattern);
  } catch (error) {
    console.error(error);
  }
}
