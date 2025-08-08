#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

const RUNTIME_EXECUTABLE = "./build/rift";
const TEST_DIR = "./test";

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  // Simple assert function injected into test files
  getAssertCode() {
    return `
// Helper functions for tests - using only supported JavaScript features
function createArray() {
    return [];
}

function createTempObjects() {
    // Create some temporary objects for GC testing (simplified)
    var temp = [];
    temp.push({id: 1, data: "temp_1"});
    temp.push({id: 2, data: "temp_2"});
    temp.push({id: 3, data: "temp_3"});
    return temp;
}

function gcStats() {
    console.log("GC Stats: [Simulated - GC stats not available]");
}

function gc() {
    console.log("GC: [Simulated - Manual GC trigger not available]");
}

// Note: These are helper functions for the test suite
`;
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

  async runSingleTest(testFile) {
    const relativePath = path.relative(".", testFile);

    try {
      // Read the test file content
      const testContent = fs.readFileSync(testFile, "utf8");

      // Create a temporary file with assert functions injected
      const tempTestFile = testFile + ".temp";
      const fullTestContent = this.getAssertCode() + "\n" + testContent;
      fs.writeFileSync(tempTestFile, fullTestContent);

      // Run the test
      const output = execSync(`${RUNTIME_EXECUTABLE} ${tempTestFile}`, {
        encoding: "utf8",
        timeout: 5000,
      });

      // Clean up temp file
      fs.unlinkSync(tempTestFile);

      // Parse output for PASS/FAIL patterns
      const lines = output.split("\n");
      let testPassed = 0;
      let testFailed = 0;
      let lastOutput = [];

      for (const line of lines) {
        // Handle both direct PASS/FAIL and [object Object] prefixed versions
        if (line.includes("PASS:") || line.includes("✅")) {
          testPassed++;
        } else if (line.includes("FAIL:") || line.includes("❌")) {
          testFailed++;
          lastOutput.push(chalk.red("❌ " + line.replace("FAIL:", "")));
        } else if (line.includes("Error:")) {
          // Count runtime errors as failures
          testFailed++;
          lastOutput.push(chalk.red("❌ " + line));
        } else if (
          line.trim() &&
          !line.includes("PASS:") &&
          !line.includes("FAIL:") &&
          !line.includes("✅") &&
          !line.includes("❌")
        ) {
          lastOutput.push(chalk.dim(line));
        }
      }

      // Consider a test passed if there are no FAIL/Error lines.
      // PASS markers improve reporting but are not strictly required.
      const success = testFailed === 0;

      if (success) {
        this.passed++;
        return {
          status: "passed",
          assertions: testPassed,
          output: lastOutput,
        };
      } else {
        this.failed++;
        return {
          status: "failed",
          assertions: testPassed,
          failures: testFailed,
          output: lastOutput,
        };
      }
    } catch (error) {
      // Clean up temp file if it exists
      const tempTestFile = testFile + ".temp";
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }

      this.failed++;
      return {
        status: "failed",
        error: error.message,
        output: [chalk.red("Runtime error: " + error.message)],
      };
    }
  }

  async findTestFiles() {
    const testFiles = [];

    function walk(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (file.endsWith('.js') && !file.includes('temp')) {
          testFiles.push(fullPath);
        }
      }
    }

    if (!fs.existsSync(TEST_DIR)) {
      console.error(chalk.red(`❌ Test directory ${TEST_DIR} not found`));
      process.exit(1);
    }

    walk(TEST_DIR);
    return testFiles.sort();
  }

  showHeader(totalTests) {
    console.log(chalk.bold.cyan("🧪 Rift JavaScript Tests"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();
    console.log(chalk.bold.green(`🎯 Found ${totalTests} test files`));
    console.log();
  }

  async run() {
    await this.buildRuntime();

    const testFiles = await this.findTestFiles();
    this.showHeader(testFiles.length);

    for (const testFile of testFiles) {
      const testName = path.basename(testFile);
      process.stdout.write(chalk.dim(`Running ${testName}... `));

      const result = await this.runSingleTest(testFile);

      this.results.push({
        name: testName,
        file: testFile,
        ...result,
      });

      if (result.status === "passed") {
        console.log(chalk.green(`✅ PASS (${result.assertions} assertions)`));
      } else {
        console.log(chalk.red(`❌ FAIL`));
        if (result.output && result.output.length > 0) {
          result.output.forEach((line) => console.log(`  ${line}`));
        }
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log();
    console.log(chalk.bold.cyan("📊 Test Results"));
    console.log(chalk.cyan("═".repeat(50)));
    console.log();

    const total = this.passed + this.failed;
    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log(
      chalk.green(`✅ Passed:   ${this.passed.toString().padStart(6)}`)
    );
    console.log(
      chalk.red(`❌ Failed:   ${this.failed.toString().padStart(6)}`)
    );
    console.log(chalk.dim("─".repeat(20)));
    console.log(chalk.bold(`📊 Total:    ${total.toString().padStart(6)}`));
    console.log(chalk.bold(`📈 Pass Rate: ${passRate}%`));
    console.log(chalk.dim(`⏱️  Runtime:  ${runtime}s`));

    if (this.failed > 0) {
      console.log();
      console.log(chalk.bold.red("❌ Failed Tests:"));
      console.log(chalk.red("─".repeat(30)));

      this.results
        .filter((r) => r.status === "failed")
        .forEach((r) => {
          console.log(chalk.red(`• ${r.name}`));
        });
    } else if (this.passed > 0) {
      console.log();
      console.log(chalk.bold.green("🎉 All tests passed!"));
    }

    console.log();

    // Exit with error code if tests failed
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Run the tests
const runner = new TestRunner();
await runner.run();
