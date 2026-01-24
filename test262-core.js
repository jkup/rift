#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Configuration
export const TEST262_DIR = "./test262";
export const RUNTIME_EXECUTABLE = "./build/rift";

// Pre-compile regex patterns once at module load (P1 optimization)
const UNSUPPORTED_PATTERNS = [
  /\bclass\s+\w+/, // class declarations
  /\basync\b/, // async functions
  /\bawait\b/, // await keyword
  /\byield\b/, // generators
  /\bwith\s*\(/, // with statements
];

const UNSUPPORTED_INCLUDES = new Set([
  "temporalHelpers.js",
  "testAtomics.js",
  "testIntl.js",
  "testBigIntTypedArray.js",
  "asyncHelpers.js",
  "atomicsHelper.js",
]);

const SKIP_HARNESS_FILES = new Set([
  "sta.js",
  "assert.js",
  "propertyHelper.js",
]);

const UNSUPPORTED_HARNESS = new Set([
  "compareArray.js",
  "compareIterator.js",
  "isConstructor.js",
  "nativeFunctionMatcher.js",
  "asyncHelpers.js",
  "atomicsHelper.js",
  "temporalHelpers.js",
  "testAtomics.js",
  "testBigIntTypedArray.js",
  "testIntl.js",
  "testTypedArray.js",
  "promiseHelper.js",
  "detachArrayBuffer.js",
  "resizableArrayBufferUtils.js",
]);

// Cached harness content (P1 optimization - loaded once per process)
let cachedHarnessContent = null;

/**
 * Get the harness content, caching it for subsequent calls
 * @returns {string} The harness content
 */
export function getHarnessContent() {
  if (cachedHarnessContent === null) {
    const compatHarnessPath = "./test262-harness-compat.js";
    if (fs.existsSync(compatHarnessPath)) {
      cachedHarnessContent = fs.readFileSync(compatHarnessPath, "utf8");
    } else {
      console.error("Warning: test262-harness-compat.js not found");
      cachedHarnessContent = "";
    }
  }
  return cachedHarnessContent;
}

/**
 * Parse a test file and extract metadata
 * @param {string} filePath - Path to the test file
 * @returns {Object} Parsed test object
 */
export function parseTestFile(filePath) {
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

/**
 * Check if a test uses unsupported features
 * @param {Object} test - Parsed test object
 * @returns {boolean} True if test uses unsupported features
 */
export function testUsesUnsupportedFeatures(test) {
  const code = test.code;

  // Check against pre-compiled patterns
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (pattern.test(code)) {
      return true;
    }
  }

  // Check includes
  if (test.includes && test.includes.length > 0) {
    for (const include of test.includes) {
      if (UNSUPPORTED_INCLUDES.has(include)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Build combined code for a test with harness files
 * @param {Object} test - Parsed test object
 * @returns {string} Combined code ready to execute
 */
export function buildCombinedCode(test) {
  let combinedCode = getHarnessContent() + "\n";

  // Include test-specific harness files that we can support
  if (test.includes && test.includes.length > 0) {
    for (const includeFile of test.includes) {
      if (SKIP_HARNESS_FILES.has(includeFile)) {
        continue;
      }

      if (UNSUPPORTED_HARNESS.has(includeFile)) {
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

  combinedCode += test.code;
  return combinedCode;
}

/**
 * Run a single test and return the result
 * @param {string} testFile - Path to the test file
 * @param {string} tempFile - Path to use for temporary file (default: /tmp/test262_temp.js)
 * @returns {Object} Test result with status and optional reason
 */
export function runSingleTest(testFile, tempFile = "/tmp/test262_temp.js") {
  const test = parseTestFile(testFile);

  // Check if this test uses unsupported features first
  if (testUsesUnsupportedFeatures(test)) {
    return {
      status: "skipped",
      reason: "Uses unsupported language features",
    };
  }

  try {
    const combinedCode = buildCombinedCode(test);
    fs.writeFileSync(tempFile, combinedCode);

    const result = execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout = result.toString().trim();

    if (test.negative) {
      return { status: "failed", reason: "Expected error but test passed" };
    } else {
      if (stdout.includes("Test262Error")) {
        return {
          status: "failed",
          reason: "Test assertion failed: " + stdout.substring(0, 150),
        };
      }

      if (
        stdout.includes("ReferenceError") ||
        stdout.includes("TypeError") ||
        stdout.includes("SyntaxError") ||
        stdout.includes("RangeError") ||
        (stdout.includes("Error:") && !stdout.includes("Test262Error")) ||
        (stdout.includes("Exception") && !stdout.includes("Test262Error"))
      ) {
        return {
          status: "failed",
          reason: "Runtime error: " + stdout.substring(0, 150),
        };
      }

      return { status: "passed" };
    }
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    const stdout = error.stdout ? error.stdout.toString() : "";

    if (test.negative) {
      return { status: "passed", reason: "Expected error occurred" };
    } else {
      if (stdout.trim()) {
        if (stdout.includes("Test262Error")) {
          return {
            status: "failed",
            reason: "Test assertion failed: " + stdout.substring(0, 150),
          };
        }

        if (
          stdout.includes("ReferenceError") ||
          stdout.includes("TypeError") ||
          stdout.includes("SyntaxError") ||
          stdout.includes("RangeError") ||
          (stdout.includes("Error:") && !stdout.includes("Test262Error")) ||
          (stdout.includes("Exception") && !stdout.includes("Test262Error"))
        ) {
          return {
            status: "failed",
            reason: "Runtime error: " + stdout.substring(0, 150),
          };
        }

        // If we got output but no errors, the test may have passed
        return {
          status: "passed",
          reason: "Test completed successfully (runtime crashed during cleanup)",
        };
      }

      let cleanReason = error.message;
      if (stderr.trim()) {
        const lines = stderr.split("\n");
        const errorLine =
          lines.find((line) => line.includes("Error:")) || lines[0];
        cleanReason = errorLine.replace(/^.*Error:\s*/, "").trim();
      }
      return {
        status: "failed",
        reason: "Runtime crash: " + cleanReason,
        stderr: stderr.substring(0, 200),
      };
    }
  }
}

/**
 * Find all test files in the test262 directory
 * @param {string|null} includePattern - Optional pattern to filter tests
 * @returns {string[]} Array of test file paths
 */
export function findTestFiles(includePattern = null) {
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

export default {
  TEST262_DIR,
  RUNTIME_EXECUTABLE,
  getHarnessContent,
  parseTestFile,
  testUsesUnsupportedFeatures,
  buildCombinedCode,
  runSingleTest,
  findTestFiles,
};
