#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

// Configuration
const TEST262_DIR = "./test262";
const RUNTIME_EXECUTABLE = "./build/jsruntime";
const MAX_TESTS = 100; // Limit for initial testing

class Test262Runner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
  }

  async setupTest262() {
    console.log("Setting up test262...");

    if (!fs.existsSync(TEST262_DIR)) {
      console.log("Cloning test262 repository...");
      try {
        execSync(
          `git clone --depth 1 https://github.com/tc39/test262.git ${TEST262_DIR}`,
          { stdio: "inherit" }
        );
      } catch (error) {
        console.error("Failed to clone test262:", error.message);
        process.exit(1);
      }
    } else {
      console.log("test262 directory already exists");
    }
  }

  async buildRuntime() {
    console.log("Building runtime...");

    if (!fs.existsSync("./build.sh")) {
      console.error("build.sh not found");
      process.exit(1);
    }

    try {
      execSync("./build.sh", { stdio: "inherit" });
    } catch (error) {
      console.error("Failed to build runtime:", error.message);
      process.exit(1);
    }

    if (!fs.existsSync(RUNTIME_EXECUTABLE)) {
      console.error("Runtime executable not found after build");
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

    return testFiles.slice(0, MAX_TESTS);
  }

  async run() {
    console.log("🚀 Starting Test262 Runner for JSRuntime");
    console.log("=====================================\n");

    await this.setupTest262();
    await this.buildRuntime();

    const testFiles = await this.findTestFiles();
    console.log(`Found ${testFiles.length} test files to run\n`);

    let count = 0;
    for (const testFile of testFiles) {
      count++;
      const relativePath = path.relative(TEST262_DIR, testFile);
      process.stdout.write(
        `[${count}/${testFiles.length}] ${relativePath}... `
      );

      const result = await this.runSingleTest(testFile);

      if (result.status === "passed") {
        console.log("✅ PASS");
      } else if (result.status === "skipped") {
        console.log(`⏭️  SKIP (${result.reason})`);
      } else {
        console.log(`❌ FAIL (${result.reason})`);
        if (result.stderr) {
          console.log(`   stderr: ${result.stderr.substring(0, 100)}...`);
        }
      }

      this.results.push({
        file: relativePath,
        ...result,
      });
    }

    this.printSummary();
  }

  printSummary() {
    console.log("\n📊 Test Results Summary");
    console.log("=======================");
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⏭️  Skipped: ${this.skipped}`);
    console.log(
      `📈 Pass Rate: ${(
        (this.passed / (this.passed + this.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "failed")
        .slice(0, 10) // Show first 10 failures
        .forEach((r) => {
          console.log(`   ${r.file}: ${r.reason}`);
        });

      if (this.failed > 10) {
        console.log(`   ... and ${this.failed - 10} more`);
      }
    }
  }
}

// Run the test suite
const runner = new Test262Runner();
runner.run().catch(console.error);
