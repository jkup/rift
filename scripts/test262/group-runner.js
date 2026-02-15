#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Test262ResultsTracker } from "./results-tracker.js";
import {
  TEST262_DIR,
  RUNTIME_EXECUTABLE,
  parseTestFile,
  testUsesUnsupportedFeatures,
  runSingleTest as coreRunSingleTest,
} from "./core.js";

const __scriptDir = path.dirname(new URL(import.meta.url).pathname);
const GROUPS_CONFIG = path.join(__scriptDir, "groups.json");

/**
 * Test262GroupRunner - Run specific groups of Test262 tests
 * Provides targeted testing and group-based reports
 */
class Test262GroupRunner {
  constructor(groupId = null) {
    this.groups = this.loadGroups();
    this.tracker = new Test262ResultsTracker();
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = Date.now();
    // Use unique temp file per runner instance to enable parallel execution
    this.tempFile = groupId
      ? `/tmp/test262_temp_${groupId}.js`
      : `/tmp/test262_temp_${process.pid}_${Date.now()}.js`;
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

  /**
   * Run a single test using shared core logic
   * Wraps coreRunSingleTest to integrate with tracker and counters
   */
  async runSingleTest(testFile) {
    // Use the shared runSingleTest from core.js
    // This ensures consistent behavior: proper YAML parsing, feature checking,
    // negative test validation, and strict mode dual execution
    const result = coreRunSingleTest(testFile, this.tempFile);

    // Update counters and tracker based on result
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

    return result;
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

  /**
   * Run a single group and return results (used for parallel execution)
   */
  async runGroupForParallel(groupName) {
    const groupRunner = new Test262GroupRunner(groupName);
    const testFiles = await groupRunner.findTestFilesForGroup(groupName);

    if (testFiles.length === 0) {
      groupRunner.cleanup();
      return null;
    }

    for (const testFile of testFiles) {
      await groupRunner.runSingleTest(testFile);
    }

    groupRunner.cleanup();

    const total = groupRunner.passed + groupRunner.failed;
    const passRate = total > 0 ? (groupRunner.passed / total) * 100 : 0;

    return {
      name: groupName,
      passed: groupRunner.passed,
      failed: groupRunner.failed,
      skipped: groupRunner.skipped,
      total: total,
      passRate: passRate.toFixed(1),
      testCount: testFiles.length,
    };
  }

  /**
   * Clean up temp file
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempFile)) {
        fs.unlinkSync(this.tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async runAllGroups(options = {}) {
    const { concurrency = 4, sequential = false } = options;
    const startTime = Date.now();

    console.log(chalk.bold.cyan("\n🚀 Test262 All Groups Report\n"));
    console.log(chalk.cyan("═".repeat(70)));

    const groupNames = Object.keys(this.groups);

    if (sequential) {
      console.log(chalk.dim(`Running ${groupNames.length} groups sequentially...\n`));
    } else {
      console.log(chalk.dim(`Running ${groupNames.length} groups in parallel (concurrency: ${concurrency})...\n`));
    }

    let groupResults = [];

    if (sequential) {
      // Sequential execution (original behavior)
      for (const groupName of groupNames) {
        process.stdout.write(chalk.dim(`  ${groupName}... `));
        const result = await this.runGroupForParallel(groupName);
        if (result) {
          groupResults.push(result);
          console.log(chalk.green(`✅ ${result.passed}`) + chalk.red(` ❌ ${result.failed}`));
        } else {
          console.log(chalk.yellow("skipped (no tests)"));
        }
      }
    } else {
      // Parallel execution with concurrency limit
      const runWithConcurrencyLimit = async (items, limit, fn) => {
        const results = [];
        const executing = new Set();

        for (const item of items) {
          const promise = fn(item).then((result) => {
            executing.delete(promise);
            return { item, result };
          });
          executing.add(promise);
          results.push(promise);

          if (executing.size >= limit) {
            await Promise.race(executing);
          }
        }

        return Promise.all(results);
      };

      // Show progress as groups complete
      let completed = 0;
      const total = groupNames.length;

      const results = await runWithConcurrencyLimit(
        groupNames,
        concurrency,
        async (groupName) => {
          const result = await this.runGroupForParallel(groupName);
          completed++;
          const progress = ((completed / total) * 100).toFixed(0);
          process.stdout.write(`\r  Progress: ${completed}/${total} groups (${progress}%)`);
          return result;
        }
      );

      console.log("\n");

      // Collect results
      for (const { item: groupName, result } of results) {
        if (result) {
          groupResults.push(result);
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Print summary table
    console.log(chalk.bold.cyan("\n📊 Groups Summary Report\n"));
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

    // Print totals
    const totalTests = groupResults.reduce((sum, r) => sum + r.total, 0);
    const totalPassed = groupResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = groupResults.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = groupResults.reduce((sum, r) => sum + r.skipped, 0);
    const overallRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0.0";

    console.log(chalk.dim("─".repeat(70)));
    console.log(
      chalk.bold("TOTAL".padEnd(30)) +
        totalTests.toString().padStart(8) +
        chalk.green(totalPassed.toString().padStart(8)) +
        chalk.red(totalFailed.toString().padStart(8)) +
        chalk.bold(`${overallRate}%`.padStart(10))
    );

    console.log(chalk.cyan("\n" + "═".repeat(70)));
    console.log(chalk.dim(`\n⏱️  Total runtime: ${totalTime}s`));
    if (!sequential) {
      console.log(chalk.dim(`   (${groupNames.length} groups ran with concurrency ${concurrency})`));
    }
    console.log();
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
function parseArgs(args) {
  const options = {
    command: null,
    groupName: null,
    concurrency: 4,
    sequential: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--list" || arg === "-l") {
      options.command = "list";
    } else if (arg === "--all") {
      options.command = "all";
    } else if (arg === "--sequential" || arg === "-s") {
      options.sequential = true;
    } else if (arg === "--concurrency" || arg === "-c") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        options.concurrency = parseInt(next, 10) || 4;
        i++;
      }
    } else if (arg.startsWith("--concurrency=")) {
      options.concurrency = parseInt(arg.split("=")[1], 10) || 4;
    } else if (!arg.startsWith("-")) {
      options.groupName = arg;
    }
  }

  return options;
}

function printUsage() {
  console.log(chalk.bold.cyan("\n📋 Test262 Group Runner\n"));
  console.log("Usage:");
  console.log("  npm run test262:group -- [options] [group-name]");
  console.log("\nOptions:");
  console.log("  --list, -l              List available groups");
  console.log("  --all                   Run all groups");
  console.log("  --sequential, -s        Run groups sequentially (default: parallel)");
  console.log("  --concurrency, -c N     Max parallel groups (default: 4)");
  console.log("\nExamples:");
  console.log("  npm run test262:group -- core-language");
  console.log("  npm run test262:group -- --all");
  console.log("  npm run test262:group -- --all --concurrency 8");
  console.log("  npm run test262:group -- --all --sequential");
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (args.length === 0 || options.command === "list") {
    const runner = new Test262GroupRunner();
    runner.listGroups();
    return;
  }

  if (options.command === "all") {
    const runner = new Test262GroupRunner();
    await runner.runAllGroups({
      concurrency: options.concurrency,
      sequential: options.sequential,
    });
    return;
  }

  if (options.groupName) {
    const runner = new Test262GroupRunner(options.groupName);
    await runner.runGroup(options.groupName);
    return;
  }

  printUsage();
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error.message);
  process.exit(1);
});
