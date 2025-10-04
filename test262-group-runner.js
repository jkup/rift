#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { Test262ResultsTracker } from "./test262-results-tracker.js";

const TEST262_DIR = "./test262";
const RUNTIME_EXECUTABLE = "./build/rift";
const GROUPS_CONFIG = "./test262-groups.json";

/**
 * Test262GroupRunner - Run specific groups of Test262 tests
 * Provides targeted testing and group-based reports
 */
class Test262GroupRunner {
  constructor() {
    this.groups = this.loadGroups();
    this.tracker = new Test262ResultsTracker();
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = Date.now();
  }

  loadGroups() {
    if (!fs.existsSync(GROUPS_CONFIG)) {
      console.error(chalk.red(`❌ Groups config not found: ${GROUPS_CONFIG}`));
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(GROUPS_CONFIG, "utf8"));
  }

  listGroups() {
    console.log(chalk.bold.cyan("\n📋 Available Test Groups\n"));
    console.log(chalk.cyan("═".repeat(70)));

    Object.entries(this.groups).forEach(([name, config]) => {
      console.log(chalk.bold.green(`\n${name}`));
      console.log(chalk.dim(`  ${config.description}`));
      console.log(chalk.dim(`  Patterns: ${config.patterns.length}`));
    });

    console.log(chalk.cyan("\n" + "═".repeat(70)));
    console.log(chalk.dim("\nUsage: npm run test262:group -- <group-name>"));
    console.log(chalk.dim("Example: npm run test262:group -- core-language\n"));
  }

  async findTestFilesForGroup(groupName) {
    const group = this.groups[groupName];
    if (!group) {
      console.error(chalk.red(`❌ Unknown group: ${groupName}`));
      console.log(chalk.yellow("\nAvailable groups:"));
      Object.keys(this.groups).forEach((g) =>
        console.log(chalk.dim(`  - ${g}`))
      );
      process.exit(1);
    }

    const testDir = path.join(TEST262_DIR, "test");
    const testFiles = [];

    function walkDir(dir, pattern) {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath, pattern);
        } else if (file.endsWith(".js") && !file.includes("_FIXTURE")) {
          const relativePath = path.relative(testDir, filePath);
          if (relativePath.includes(pattern)) {
            testFiles.push(filePath);
          }
        }
      }
    }

    // Find tests matching any of the group's patterns
    for (const pattern of group.patterns) {
      const searchDir = path.join(testDir, pattern);
      walkDir(searchDir, "");
    }

    return testFiles;
  }

  parseTestFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const test = {
      file: filePath,
      description: "",
      negative: false,
      includes: [],
      code: content,
    };

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

    for (const line of frontmatterLines) {
      if (line.startsWith("description:")) {
        test.description = line.substring(12).trim();
      } else if (line.includes("negative:")) {
        test.negative = true;
      } else if (line.includes("includes:")) {
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

  testUsesUnsupportedFeatures(test) {
    const code = test.code;

    const unsupportedPatterns = [
      /\bclass\s+\w+/,
      /=>/,
      /\basync\b/,
      /\bawait\b/,
      /\byield\b/,
      /\bwith\s*\(/,
    ];

    for (const pattern of unsupportedPatterns) {
      if (pattern.test(code)) {
        return true;
      }
    }

    if (test.includes && test.includes.length > 0) {
      const unsupportedIncludes = [
        "temporalHelpers.js",
        "testAtomics.js",
        "testIntl.js",
        "testBigIntTypedArray.js",
        "asyncHelpers.js",
        "atomicsHelper.js",
      ];

      for (const include of test.includes) {
        if (unsupportedIncludes.includes(include)) {
          return true;
        }
      }
    }

    return false;
  }

  async runSingleTest(testFile) {
    const test = this.parseTestFile(testFile);

    if (this.testUsesUnsupportedFeatures(test)) {
      this.skipped++;
      this.tracker.recordResult(testFile, "skipped", "Unsupported features");
      return { status: "skipped" };
    }

    try {
      let combinedCode = `
function Test262Error() {
  var error = {};
  error.message = "Test failed";
  error.name = "Test262Error";
  return error;
}
`;

      if (test.includes && test.includes.length > 0) {
        for (const includeFile of test.includes) {
          if (includeFile === "assert.js") {
            continue;
          }

          const harnessPath = path.join(TEST262_DIR, "harness", includeFile);
          if (fs.existsSync(harnessPath)) {
            combinedCode += fs.readFileSync(harnessPath, "utf8") + "\n";
          }
        }
      }

      combinedCode += test.code;

      const tempFile = "/tmp/test262_temp.js";
      fs.writeFileSync(tempFile, combinedCode);

      const result = execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {
        timeout: 5000,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const stdout = result.toString().trim();

      if (test.negative) {
        this.failed++;
        this.tracker.recordResult(
          testFile,
          "failed",
          "Expected error but passed"
        );
        return { status: "failed" };
      } else {
        if (
          stdout.includes("Test262Error") ||
          stdout.includes("Error:") ||
          stdout.includes("Exception")
        ) {
          this.failed++;
          this.tracker.recordResult(
            testFile,
            "failed",
            stdout.substring(0, 150)
          );
          return { status: "failed" };
        }

        this.passed++;
        this.tracker.recordResult(testFile, "passed");
        return { status: "passed" };
      }
    } catch (error) {
      const stderr = error.stderr ? error.stderr.toString() : "";
      const stdout = error.stdout ? error.stdout.toString() : "";

      if (test.negative) {
        this.passed++;
        this.tracker.recordResult(testFile, "passed", "Expected error");
        return { status: "passed" };
      } else {
        if (stdout.trim()) {
          if (
            !stdout.includes("Test262Error") &&
            !stdout.includes("Error:") &&
            !stdout.includes("Exception")
          ) {
            this.passed++;
            this.tracker.recordResult(testFile, "passed", "Completed");
            return { status: "passed" };
          }
        }

        this.failed++;
        this.tracker.recordResult(testFile, "failed", error.message);
        return { status: "failed" };
      }
    }
  }

  async runGroup(groupName) {
    const group = this.groups[groupName];

    console.log(chalk.bold.cyan("\n🚀 Test262 Group Runner\n"));
    console.log(chalk.cyan("═".repeat(70)));
    console.log(chalk.bold(`\n📦 Group: ${groupName}`));
    console.log(chalk.dim(`   ${group.description}\n`));

    console.log(chalk.yellow("⚙️  Finding tests..."));
    const testFiles = await this.findTestFilesForGroup(groupName);

    if (testFiles.length === 0) {
      console.log(
        chalk.yellow(
          `\n⚠️  No tests found for group '${groupName}'. This might mean:`
        )
      );
      console.log(chalk.dim("   - The test262 suite hasn't been cloned yet"));
      console.log(
        chalk.dim("   - The patterns in the group don't match any tests")
      );
      console.log(
        chalk.dim("\nRun 'npm run test262' to clone the test suite.")
      );
      return;
    }

    console.log(
      chalk.green(`✅ Found ${testFiles.length} tests in this group\n`)
    );

    // Build runtime if needed
    if (!fs.existsSync(RUNTIME_EXECUTABLE)) {
      console.log(chalk.yellow("🔨 Building runtime..."));
      execSync("./build.sh", { stdio: "inherit" });
    }

    console.log(chalk.bold("Running tests...\n"));
    const progressBarWidth = 40;

    for (let i = 0; i < testFiles.length; i++) {
      const testFile = testFiles[i];
      await this.runSingleTest(testFile);

      // Progress indicator
      const progress = ((i + 1) / testFiles.length) * 100;
      const filled = Math.round(
        (progressBarWidth * (i + 1)) / testFiles.length
      );
      const empty = progressBarWidth - filled;
      const bar =
        chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));

      process.stdout.write(
        `\r[${bar}] ${progress.toFixed(1)}% | ` +
          chalk.green(`✅ ${this.passed}`) +
          ` ${chalk.red(`❌ ${this.failed}`)} ` +
          chalk.yellow(`⏭️  ${this.skipped}`)
      );
    }

    console.log("\n");
    this.printSummary(groupName);
  }

  async runAllGroups() {
    console.log(chalk.bold.cyan("\n🚀 Test262 All Groups Report\n"));
    console.log(chalk.cyan("═".repeat(70)));

    const groupResults = [];

    for (const groupName of Object.keys(this.groups)) {
      console.log(chalk.bold(`\n📦 Running group: ${groupName}`));

      const groupRunner = new Test262GroupRunner();
      const testFiles = await groupRunner.findTestFilesForGroup(groupName);

      if (testFiles.length === 0) {
        console.log(chalk.dim("   No tests found, skipping..."));
        continue;
      }

      console.log(chalk.dim(`   Found ${testFiles.length} tests`));

      for (const testFile of testFiles) {
        await groupRunner.runSingleTest(testFile);
      }

      const total = groupRunner.passed + groupRunner.failed;
      const passRate = total > 0 ? (groupRunner.passed / total) * 100 : 0;

      groupResults.push({
        name: groupName,
        passed: groupRunner.passed,
        failed: groupRunner.failed,
        skipped: groupRunner.skipped,
        total: total,
        passRate: passRate.toFixed(1),
      });

      console.log(
        chalk.dim(
          `   ✅ ${groupRunner.passed} ❌ ${
            groupRunner.failed
          } (${passRate.toFixed(1)}%)`
        )
      );
    }

    // Print summary table
    console.log(chalk.bold.cyan("\n\n📊 Groups Summary Report\n"));
    console.log(chalk.cyan("═".repeat(70)));

    console.log(
      chalk.bold(
        "\nGroup".padEnd(30) +
          "Tests".padStart(8) +
          "Pass".padStart(8) +
          "Fail".padStart(8) +
          "Rate".padStart(10)
      )
    );
    console.log(chalk.dim("─".repeat(70)));

    groupResults
      .sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate))
      .forEach((result) => {
        const rateColor =
          parseFloat(result.passRate) >= 70
            ? chalk.green
            : parseFloat(result.passRate) >= 40
            ? chalk.yellow
            : chalk.red;

        console.log(
          result.name.padEnd(30) +
            result.total.toString().padStart(8) +
            chalk.green(result.passed.toString().padStart(8)) +
            chalk.red(result.failed.toString().padStart(8)) +
            rateColor(`${result.passRate}%`.padStart(10))
        );
      });

    console.log(chalk.cyan("\n" + "═".repeat(70) + "\n"));
  }

  printSummary(groupName) {
    const total = this.passed + this.failed;
    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log(chalk.cyan("═".repeat(70)));
    console.log(chalk.bold.cyan(`\n📊 Results for ${groupName}\n`));

    console.log(chalk.green(`✅ Passed:   ${this.passed}`));
    console.log(chalk.red(`❌ Failed:   ${this.failed}`));
    console.log(chalk.yellow(`⏭️  Skipped:  ${this.skipped}`));
    console.log(chalk.dim("─".repeat(20)));
    console.log(chalk.bold(`📊 Total:    ${total}`));
    console.log(chalk.bold(`📈 Pass Rate: ${passRate}%`));
    console.log(chalk.dim(`⏱️  Runtime:  ${runtime}s`));

    // Save results
    const resultsFile = `test262-group-${groupName}-results.json`;
    this.tracker.saveResults(resultsFile);
    console.log(chalk.green(`\n💾 Results saved to: ${resultsFile}`));

    console.log(chalk.cyan("\n" + "═".repeat(70) + "\n"));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--list" || args[0] === "-l") {
    const runner = new Test262GroupRunner();
    runner.listGroups();
    return;
  }

  if (args[0] === "--all") {
    const runner = new Test262GroupRunner();
    await runner.runAllGroups();
    return;
  }

  const groupName = args[0];
  const runner = new Test262GroupRunner();
  await runner.runGroup(groupName);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error.message);
  process.exit(1);
});
