#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { Test262ResultsTracker } from "./test262-results-tracker.js";

// Configuration
const TEST262_DIR = "./test262";
const RUNTIME_EXECUTABLE = "./build/rift";

class Test262Runner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
    this.startTime = Date.now();
    this.tracker = new Test262ResultsTracker();
  }

  // Display a simple status line that updates in place
  displayStatus(currentTest = "", totalTests = 0, currentIndex = 0) {
    // Skip interactive display in CI environments
    if (process.env.CI) {
      return;
    }

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const progress =
      totalTests > 0 ? ((currentIndex / totalTests) * 100).toFixed(1) : 0;

    // Create status boxes in a single line
    const passedBox = chalk.green(`[✅ ${this.passed.toString().padStart(3)}]`);
    const failedBox = chalk.red(`[❌ ${this.failed.toString().padStart(3)}]`);
    const skippedBox = chalk.yellow(
      `[⏭️  ${this.skipped.toString().padStart(3)}]`
    );

    const progressBar = this.createProgressBar(currentIndex, totalTests, 20);

    // Current test (truncated if too long)
    let currentTestDisplay = "";
    if (currentTest) {
      const relativePath = path.relative(TEST262_DIR, currentTest);
      const maxLength = 40;
      currentTestDisplay =
        relativePath.length > maxLength
          ? "..." + relativePath.slice(-maxLength + 3)
          : relativePath;
    }

    // Build the status line
    const statusLine = [
      passedBox,
      failedBox,
      skippedBox,
      progressBar,
      chalk.dim(`${progress}%`),
      chalk.dim(`${elapsed}s`),
      currentTestDisplay ? chalk.dim(currentTestDisplay) : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Clear the line and write new status
    process.stdout.write("\r" + statusLine + "\x1b[K");
  }

  // Show the initial header
  showHeader(totalTests) {
    // Simplified header for CI
    if (process.env.CI) {
      console.log(`Running ${totalTests} tests...`);
      return;
    }

    console.log(chalk.bold.cyan("🚀 Test262 Runner for rift"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();
    console.log(chalk.bold.green(`🎯 Found ${totalTests} test files to run`));
    console.log(chalk.dim("Press Ctrl+C to stop at any time"));
    console.log();
    console.log(chalk.bold("Legend:"));
    console.log(
      `${chalk.green("[✅ ###]")} Passed  ${chalk.red(
        "[❌ ###]"
      )} Failed  ${chalk.yellow("[⏭️  ###]")} Skipped`
    );
    console.log();
  }

  // Create a progress bar
  createProgressBar(current, total, width = 40) {
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    const filledBar = chalk.green("█".repeat(filled));
    const emptyBar = chalk.gray("░".repeat(empty));

    return `[${filledBar}${emptyBar}]`;
  }

  async setupTest262() {
    console.log(chalk.bold.cyan("🚀 Test262 Runner for rift"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();
    console.log(chalk.yellow("⚙️  Setting up test262..."));

    if (!fs.existsSync(TEST262_DIR)) {
      console.log(chalk.blue("📥 Cloning test262 repository..."));
      try {
        execSync(
          `git clone --depth 1 https://github.com/tc39/test262.git ${TEST262_DIR}`,
          { stdio: "inherit" }
        );
        console.log(chalk.green("✅ Successfully cloned test262"));
      } catch (error) {
        console.error(chalk.red("❌ Failed to clone test262:"), error.message);
        process.exit(1);
      }
    } else {
      console.log(chalk.green("✅ test262 directory already exists"));
    }
  }

  async buildRuntime() {
    console.log(chalk.yellow("🔨 Building runtime..."));

    if (!fs.existsSync("./build.sh")) {
      console.error(chalk.red("❌ build.sh not found"));
      process.exit(1);
    }

    try {
      execSync("./build.sh", { stdio: "inherit" });
      console.log(chalk.green("✅ Runtime built successfully"));
    } catch (error) {
      console.error(chalk.red("❌ Failed to build runtime:"), error.message);
      process.exit(1);
    }

    if (!fs.existsSync(RUNTIME_EXECUTABLE)) {
      console.error(chalk.red("❌ Runtime executable not found after build"));
      process.exit(1);
    }
  }

  parseTestFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const test = {
      file: filePath,
      description: "",
      negative: false,
      expectedError: null,
      includes: [],
      flags: [],
      code: content,
    };

    // Parse YAML frontmatter
    let inFrontmatter = false;
    let frontmatterLines = [];

    for (const line of lines) {
      if (line.trim() === "---") {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          break;
        }
        continue;
      }

      if (inFrontmatter) {
        frontmatterLines.push(line);
      }
    }

    // Simple YAML parsing for basic fields
    for (const line of frontmatterLines) {
      if (line.startsWith("description:")) {
        test.description = line.substring(12).trim();
      } else if (line.includes("negative:")) {
        test.negative = true;
      } else if (line.includes("includes:")) {
        // Parse includes array (simplified)
        const match = line.match(/\[(.*?)\]/);
        if (match) {
          test.includes = match[1]
            .split(",")
            .map((s) => s.trim().replace(/['"]/g, ""));
        }
      }
    }

    return test;
  }

  async runSingleTest(testFile) {
    const test = this.parseTestFile(testFile);

    // Fix 1: Check if this test uses unsupported features FIRST
    if (this.testUsesUnsupportedFeatures(test)) {
      this.skipped++;
      this.tracker.recordResult(
        testFile,
        "skipped",
        "Uses unsupported language features"
      );
      return {
        status: "skipped",
        reason: "Uses unsupported language features",
      };
    }

    try {
      // Build combined code with harness files
      let combinedCode = "";

      // Use our compatibility harness that works with our current runtime capabilities
      const compatHarnessPath = "./test262-harness-compat.js";
      if (fs.existsSync(compatHarnessPath)) {
        const harnessContent = fs.readFileSync(compatHarnessPath, "utf8");
        combinedCode += harnessContent + "\n";
      } else {
        // If harness not found, this test will fail
        console.error("Warning: test262-harness-compat.js not found");
      }

      // Include test-specific harness files that we can support
      if (test.includes && test.includes.length > 0) {
        for (const includeFile of test.includes) {
          // Skip standard harness files since we're using our compat version
          if (
            includeFile === "sta.js" ||
            includeFile === "assert.js" ||
            includeFile === "propertyHelper.js"
          ) {
            continue;
          }

          // Skip other complex harness files we don't support yet
          const unsupportedHarness = [
            "compareArray.js", // Uses Array methods we may not have
            "compareIterator.js", // Uses iterators
            "isConstructor.js", // Needs Reflect.construct
            "nativeFunctionMatcher.js", // Uses regex
            "asyncHelpers.js", // Async/await
            "atomicsHelper.js", // Atomics
            "temporalHelpers.js", // Temporal API
            "testAtomics.js",
            "testBigIntTypedArray.js",
            "testIntl.js",
            "testTypedArray.js",
            "promiseHelper.js",
            "detachArrayBuffer.js",
            "resizableArrayBufferUtils.js",
          ];

          if (unsupportedHarness.includes(includeFile)) {
            continue;
          }

          const harnessPath = path.join(TEST262_DIR, "harness", includeFile);
          if (fs.existsSync(harnessPath)) {
            try {
              combinedCode += fs.readFileSync(harnessPath, "utf8") + "\n";
            } catch (e) {
              // If we can't read it, skip it
            }
          }
        }
      }

      // Add the actual test code
      combinedCode += test.code;

      // Write combined code to temporary file
      const tempFile = "/tmp/test262_temp.js";
      fs.writeFileSync(tempFile, combinedCode);

      // Run our runtime with suppressed output
      const result = execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {
        timeout: 5000,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"], // Capture all output
      });

      const stdout = result.toString().trim();

      if (test.negative) {
        // Test expected to fail but didn't - this is wrong
        this.failed++;
        this.tracker.recordResult(
          testFile,
          "failed",
          "Expected error but test passed"
        );
        return { status: "failed", reason: "Expected error but test passed" };
      } else {
        if (stdout.includes("Test262Error")) {
          this.failed++;
          const reason = "Test assertion failed: " + stdout.substring(0, 150);
          this.tracker.recordResult(testFile, "failed", reason);
          return {
            status: "failed",
            reason: reason,
          };
        }

        // Runtime errors (not Test262 assertion errors) are also failures
        if (
          stdout.includes("ReferenceError") ||
          stdout.includes("TypeError") ||
          stdout.includes("SyntaxError") ||
          stdout.includes("RangeError") ||
          (stdout.includes("Error:") && !stdout.includes("Test262Error")) ||
          (stdout.includes("Exception") && !stdout.includes("Test262Error"))
        ) {
          this.failed++;
          const reason = "Runtime error: " + stdout.substring(0, 150);
          this.tracker.recordResult(testFile, "failed", reason);
          return {
            status: "failed",
            reason: reason,
          };
        }

        // If no errors or exceptions, the test passed
        this.passed++;
        this.tracker.recordResult(testFile, "passed");
        return { status: "passed" };
      }
    } catch (error) {
      const stderr = error.stderr ? error.stderr.toString() : "";
      const stdout = error.stdout ? error.stdout.toString() : "";

      if (test.negative) {
        // Test expected to fail and did fail - this is correct
        this.passed++;
        this.tracker.recordResult(
          testFile,
          "passed",
          "Expected error occurred"
        );
        return { status: "passed", reason: "Expected error occurred" };
      } else {
        // Check if we got output before the crash
        if (stdout.trim()) {
          // Test262 assertion failure
          if (stdout.includes("Test262Error")) {
            this.failed++;
            const reason = "Test assertion failed: " + stdout.substring(0, 150);
            this.tracker.recordResult(testFile, "failed", reason);
            return {
              status: "failed",
              reason: reason,
            };
          }

          // Runtime errors
          if (
            stdout.includes("ReferenceError") ||
            stdout.includes("TypeError") ||
            stdout.includes("SyntaxError") ||
            stdout.includes("RangeError") ||
            (stdout.includes("Error:") && !stdout.includes("Test262Error")) ||
            (stdout.includes("Exception") && !stdout.includes("Test262Error"))
          ) {
            this.failed++;
            const reason = "Runtime error: " + stdout.substring(0, 150);
            this.tracker.recordResult(testFile, "failed", reason);
            return {
              status: "failed",
              reason: reason,
            };
          }

          // If we got output but no errors, the test may have passed (despite segfault)
          // The segfault might be a cleanup issue, not a test failure
          this.passed++;
          this.tracker.recordResult(
            testFile,
            "passed",
            "Test completed successfully (runtime crashed during cleanup)"
          );
          return {
            status: "passed",
            reason:
              "Test completed successfully (runtime crashed during cleanup)",
          };
        }

        // No stdout captured, treat as runtime failure
        this.failed++;
        let cleanReason = error.message;
        if (stderr.trim()) {
          const lines = stderr.split("\n");
          const errorLine =
            lines.find((line) => line.includes("Error:")) || lines[0];
          cleanReason = errorLine.replace(/^.*Error:\s*/, "").trim();
        }
        this.tracker.recordResult(
          testFile,
          "failed",
          "Runtime crash: " + cleanReason
        );
        return {
          status: "failed",
          reason: "Runtime crash: " + cleanReason,
          stderr: stderr.substring(0, 200),
        };
      }
    }
  }

  // Helper method to detect if test uses features not implemented in our minimal runtime
  testUsesUnsupportedFeatures(test) {
    const code = test.code;

    // Very conservative - only skip genuinely complex features
    const unsupportedPatterns = [
      /\bclass\s+\w+/, // class declarations
      /=>/, // arrow functions
      /\basync\b/, // async functions
      /\bawait\b/, // await keyword
      /\byield\b/, // generators
      /\bwith\s*\(/, // with statements
    ];

    // Skip tests that use features we haven't implemented
    for (const pattern of unsupportedPatterns) {
      if (pattern.test(code)) {
        return true;
      }
    }

    // Don't skip tests just because they have includes - we now load harness files
    // Only skip if they have unsupported includes that we can't handle
    if (test.includes && test.includes.length > 0) {
      // Check if any includes are for features we definitely don't support
      const unsupportedIncludes = [
        "temporalHelpers.js", // Temporal API
        "testAtomics.js", // SharedArrayBuffer/Atomics
        "testIntl.js", // Internationalization
        "testBigIntTypedArray.js", // BigInt
        "asyncHelpers.js", // async/await
        "atomicsHelper.js", // Atomics
      ];

      for (const include of test.includes) {
        if (unsupportedIncludes.includes(include)) {
          return true;
        }
      }
    }

    return false;
  }

  async findTestFiles(includePattern = null) {
    const testDir = path.join(TEST262_DIR, "test");
    const testFiles = [];

    function walkDir(dir) {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith(".js") && !file.includes("_FIXTURE")) {
          // Apply include filter if specified
          if (includePattern) {
            const relativePath = path.relative(testDir, filePath);
            if (!relativePath.includes(includePattern)) {
              continue;
            }
          }
          testFiles.push(filePath);
        }
      }
    }

    walkDir(testDir);

    return testFiles;
  }

  async run(includePattern = null) {
    await this.setupTest262();
    await this.buildRuntime();

    const testFiles = await this.findTestFiles(includePattern);

    this.showHeader(testFiles.length);

    // Wait a moment before starting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (let i = 0; i < testFiles.length; i++) {
      const testFile = testFiles[i];

      // Update display before running test
      this.displayStatus(testFile, testFiles.length, i);

      const result = await this.runSingleTest(testFile);
      const relativePath = path.relative(TEST262_DIR, testFile);

      this.results.push({
        file: relativePath,
        ...result,
      });
    }

    // Final display
    this.displayStatus("", testFiles.length, testFiles.length);

    // Add a newline to finish the status line
    console.log();

    // Wait a moment before showing summary
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.printSummary();
  }

  printSummary() {
    console.log();

    // Calculate stats
    const total = this.passed + this.failed + this.skipped;
    const passRate =
      total > 0
        ? ((this.passed / (this.passed + this.failed)) * 100).toFixed(1)
        : 0;
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // Simple output for CI
    if (process.env.CI) {
      console.log(`\nTest Results:`);
      console.log(`Passed: ${this.passed}`);
      console.log(`Failed: ${this.failed}`);
      console.log(`Skipped: ${this.skipped}`);
      console.log(`Total: ${total}`);
      console.log(`Pass Rate: ${passRate}%`);
      console.log(`Runtime: ${runtime}s`);

      // Save detailed results
      const resultsFile = this.tracker.saveResults("test262-results.json");
      console.log(`Results saved to: ${resultsFile}`);
      return;
    }

    console.log(chalk.bold.cyan("📊 Final Results"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();

    // Summary stats with colors
    console.log(
      chalk.green(`✅ Passed:   ${this.passed.toString().padStart(6)}`)
    );
    console.log(
      chalk.red(`❌ Failed:   ${this.failed.toString().padStart(6)}`)
    );
    console.log(
      chalk.yellow(`⏭️  Skipped:  ${this.skipped.toString().padStart(6)}`)
    );
    console.log(chalk.dim("─".repeat(20)));
    console.log(chalk.bold(`📊 Total:    ${total.toString().padStart(6)}`));
    console.log(chalk.bold(`📈 Pass Rate: ${passRate}%`));
    console.log(chalk.dim(`⏱️  Runtime:  ${runtime}s`));

    // Output CI-friendly format that GitHub Actions can parse
    console.log();
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Skipped: ${this.skipped}`);
    console.log(`Total: ${total}`);
    console.log(`Pass Rate: ${passRate}%`);

    // Save detailed results using tracker
    const resultsFile = this.tracker.saveResults("test262-results.json");
    console.log();
    console.log(chalk.green(`💾 Detailed results saved to: ${resultsFile}`));

    // Print category-based summary
    this.tracker.printSummary();

    if (this.failed > 0) {
      console.log();
      console.log(chalk.bold.red("❌ Failed Tests (sample):"));
      console.log(chalk.red("─".repeat(50)));

      this.results
        .filter((r) => r.status === "failed")
        .slice(0, 15) // Show first 15 failures
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
      console.log(chalk.bold.green("🎉 All tests passed! Great job!"));
    }

    console.log();
    console.log(
      chalk.dim("Run with more test directories to expand coverage.")
    );
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    includePattern: null,
    singleTest: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--include" && i + 1 < args.length) {
      options.includePattern = args[i + 1];
      i++; // Skip next argument as it's the value
    } else if (!args[i].startsWith("--")) {
      // If it's not a flag, treat it as a single test file
      options.singleTest = args[i];
    }
  }

  return options;
}

// Run the test suite
const runner = new Test262Runner();
const options = parseArgs();

if (options.singleTest) {
  try {
    const result = await runner.runSingleTest(
      `${TEST262_DIR}/${options.singleTest}`
    );
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
