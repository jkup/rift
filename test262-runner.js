#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const chalk = require("chalk");

// Configuration
const TEST262_DIR = "./test262";
const RUNTIME_EXECUTABLE = "./build/jsruntime";

class Test262Runner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  // Clear the console and move cursor to top
  clearScreen() {
    process.stdout.write("\x1b[2J\x1b[0f");
  }

  // Create a colored box with count
  createStatusBox(label, count, color) {
    const countStr = count.toString().padStart(4, " ");
    const labelStr = label.padEnd(8, " ");
    return color(
      `┌─────────────┐\n│ ${labelStr} │\n│    ${countStr}    │\n└─────────────┘`
    );
  }

  // Display the current status with boxes
  displayStatus(currentTest = "", totalTests = 0, currentIndex = 0) {
    this.clearScreen();

    // Header
    console.log(chalk.bold.cyan("🚀 Test262 Runner for JSRuntime"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();

    // Status boxes
    const passedBox = this.createStatusBox("PASSED", this.passed, chalk.green);
    const failedBox = this.createStatusBox("FAILED", this.failed, chalk.red);
    const skippedBox = this.createStatusBox(
      "SKIPPED",
      this.skipped,
      chalk.yellow
    );

    // Display boxes side by side
    const passedLines = passedBox.split("\n");
    const failedLines = failedBox.split("\n");
    const skippedLines = skippedBox.split("\n");

    for (let i = 0; i < passedLines.length; i++) {
      console.log(`${passedLines[i]}  ${failedLines[i]}  ${skippedLines[i]}`);
    }

    console.log();

    // Progress info
    if (totalTests > 0) {
      const progress = ((currentIndex / totalTests) * 100).toFixed(1);
      const progressBar = this.createProgressBar(currentIndex, totalTests);
      console.log(
        chalk.bold(`Progress: ${currentIndex}/${totalTests} (${progress}%)`)
      );
      console.log(progressBar);
      console.log();
    }

    // Current test
    if (currentTest) {
      const relativePath = path.relative(TEST262_DIR, currentTest);
      console.log(chalk.bold("Currently running:"));
      console.log(chalk.dim(`  ${relativePath}`));
      console.log();
    }

    // Runtime info
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(chalk.dim(`Runtime: ${elapsed}s`));
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
    console.log(chalk.bold.cyan("🚀 Test262 Runner for JSRuntime"));
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

    // Skip tests that require features we don't support yet
    const unsupportedFeatures = [
      "async",
      "await",
      "class",
      "import",
      "export",
      "Symbol",
      "Proxy",
      "WeakMap",
      "WeakSet",
      "Map",
      "Set",
      "Promise",
      "generator",
      "destructuring",
      "template-literal",
    ];

    const codeContent = test.code.toLowerCase();
    for (const feature of unsupportedFeatures) {
      if (codeContent.includes(feature)) {
        this.skipped++;
        return { status: "skipped", reason: `Unsupported feature: ${feature}` };
      }
    }

    try {
      // Write test code to temporary file
      const tempFile = "/tmp/test262_temp.js";
      fs.writeFileSync(tempFile, test.code);

      // Run our runtime
      const result = execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {
        timeout: 5000,
        encoding: "utf8",
      });

      if (test.negative) {
        // Test expected to fail but didn't
        this.failed++;
        return { status: "failed", reason: "Expected error but test passed" };
      } else {
        this.passed++;
        return { status: "passed" };
      }
    } catch (error) {
      if (test.negative) {
        // Test expected to fail and did fail
        this.passed++;
        return { status: "passed", reason: "Expected error occurred" };
      } else {
        this.failed++;
        return {
          status: "failed",
          reason: error.message,
          stderr: error.stderr ? error.stderr.toString() : "",
        };
      }
    }
  }

  async findTestFiles() {
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
          testFiles.push(filePath);
        }
      }
    }

    // Start with basic language tests
    const basicDirs = [
      path.join(testDir, "language", "literals"),
      path.join(testDir, "language", "expressions", "addition"),
      path.join(testDir, "language", "expressions", "subtraction"),
      path.join(testDir, "language", "expressions", "multiplication"),
      path.join(testDir, "language", "expressions", "division"),
    ];

    for (const dir of basicDirs) {
      if (fs.existsSync(dir)) {
        walkDir(dir);
      }
    }

    return testFiles;
  }

  async run() {
    await this.setupTest262();
    await this.buildRuntime();

    const testFiles = await this.findTestFiles();

    console.log();
    console.log(
      chalk.bold.green(`🎯 Found ${testFiles.length} test files to run`)
    );
    console.log(chalk.dim("Press Ctrl+C to stop at any time"));
    console.log();

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

      // Small delay to make the updates visible
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Final display
    this.displayStatus("", testFiles.length, testFiles.length);

    // Wait a moment before showing summary
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.printSummary();
  }

  printSummary() {
    console.log();
    console.log(chalk.bold.cyan("📊 Final Results"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();

    // Summary stats with colors
    const total = this.passed + this.failed + this.skipped;
    const passRate =
      total > 0
        ? ((this.passed / (this.passed + this.failed)) * 100).toFixed(1)
        : 0;
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

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

    if (this.failed > 0) {
      console.log();
      console.log(chalk.bold.red("❌ Failed Tests:"));
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

// Run the test suite
const runner = new Test262Runner();
runner.run().catch(console.error);
