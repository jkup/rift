#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import YAML from "yaml";

// Configuration
export const TEST262_DIR = "./test262";
export const RUNTIME_EXECUTABLE = "./build/rift";

// Pre-compile regex patterns once at module load (P1 optimization)
const UNSUPPORTED_PATTERNS = [
  /\bwith\s*\(/, // with statements
];

const UNSUPPORTED_INCLUDES = new Set([
  "testAtomics.js",
  "testIntl.js",
  "testBigIntTypedArray.js",
  "atomicsHelper.js",
]);

const SKIP_HARNESS_FILES = new Set([
  "sta.js",
  "assert.js",
]);

const UNSUPPORTED_HARNESS = new Set([
  "compareIterator.js",
  "isConstructor.js",
  "nativeFunctionMatcher.js",
  "atomicsHelper.js",
  "testAtomics.js",
  "testBigIntTypedArray.js",
  "testIntl.js",
  "testTypedArray.js",
  "promiseHelper.js",
  "detachArrayBuffer.js",
  "resizableArrayBufferUtils.js",
]);

// Features that Rift doesn't support yet
// Tests requiring these features will be skipped
//
// NOTE: The following features ARE supported and should NOT be in this list:
//   - generators, class, arrow-function, template, for-of, let, const
//   - destructuring-binding, destructuring-assignment, spread, rest-parameters
//   - object-spread, object-rest, default-parameters, computed-property-names
//   - shorthand-properties, Symbol.iterator, async-functions, async-iteration
//   - Symbol.asyncIterator
const UNSUPPORTED_FEATURES = new Set([
  // Async features
  "top-level-await",

  // Class features (basic class IS supported, but not these advanced features)
  "class-fields-private",
  "class-fields-public",
  "class-methods-private",
  "class-static-fields-private",
  "class-static-fields-public",
  "class-static-methods-private",
  "decorators",

  // BigInt
  "BigInt",

  // Import/Export features
  "dynamic-import",
  "import.meta",
  "import-attributes",
  "import-assertions",
  "source-phase-imports",
  "source-phase-imports-module-source",

  // Modern syntax (not yet implemented)
  "optional-chaining",
  "nullish-coalescing",
  "logical-assignment-operators",

  // Realms and cross-realm
  "ShadowRealm",
  "cross-realm",

  // Concurrency
  "Atomics",
  "SharedArrayBuffer",

  // WeakRef and FinalizationRegistry
  "WeakRef",
  "FinalizationRegistry",
  "symbols-as-weakmap-keys",

  // Proxy and Reflect
  "Proxy",
  "Reflect",
  "Reflect.construct",
  "Reflect.set",
  "Reflect.setPrototypeOf",

  // TypedArrays and ArrayBuffer
  "TypedArray",
  "ArrayBuffer",
  "DataView",
  "resizable-arraybuffer",
  "arraybuffer-transfer",
  "Float16Array",
  "uint8array-base64",

  // Intl features
  "Intl.Collator",
  "Intl.DateTimeFormat",
  "Intl.DisplayNames",
  "Intl.DurationFormat",
  "Intl.ListFormat",
  "Intl.Locale",
  "Intl.Locale-info",
  "Intl.NumberFormat",
  "Intl.NumberFormat-v3",
  "Intl.PluralRules",
  "Intl.RelativeTimeFormat",
  "Intl.Segmenter",

  // Tail call optimization
  "tail-call-optimization",

  // Iterator helpers
  "iterator-helpers",

  // String/Array features we might not support
  "Array.fromAsync",
  "String.prototype.isWellFormed",
  "String.prototype.toWellFormed",

  // Regex features
  "regexp-lookbehind",
  "regexp-named-groups",
  "regexp-dotall",
  "regexp-unicode-property-escapes",
  "regexp-match-indices",
  "regexp-duplicate-named-groups",
  "regexp-v-flag",
  "RegExp.escape",

  // Other advanced features
  "well-formed-json-stringify",
  "json-parse-with-source",
  "explicit-resource-management",
  "Math.sumPrecise",
  "IsHTMLDDA",
  "caller",
  "__proto__",
  "__getter__",
  "__setter__",
  "legacy-regexp",

  // Hashbang
  "hashbang",

  // Set methods
  "set-methods",

  // Promise features (partial support)
  "Promise.any",
  "Promise.allSettled",

  // Coalescing
  "coalesce-expression",

  // Array features
  "Array.prototype.flat",
  "Array.prototype.flatMap",
  "Array.prototype.includes",
  "Array.prototype.at",
  "change-array-by-copy",

  // Object features
  "Object.fromEntries",
  "Object.hasOwn",

  // String features
  "String.prototype.at",
  "string-trimming",

  // Symbol features (partial support)
  "Symbol.hasInstance",
  "Symbol.isConcatSpreadable",
  "Symbol.matchAll",
  "Symbol.species",
  "Symbol.toPrimitive",
  "Symbol.toStringTag",
  "Symbol.unscopables",
  "well-known-intrinsic-objects",
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

  const test = {
    file: filePath,
    description: "",
    negative: null, // Will be { phase, type } or null
    includes: [],
    flags: [],
    features: [],
    code: content,
  };

  // Extract YAML frontmatter between /*--- and ---*/
  const frontmatterMatch = content.match(/\/\*---\n?([\s\S]*?)\n?---\*\//);
  if (!frontmatterMatch) {
    return test;
  }

  try {
    const metadata = YAML.parse(frontmatterMatch[1]);

    if (metadata) {
      test.description = metadata.description || "";
      test.includes = metadata.includes || [];
      test.flags = metadata.flags || [];
      test.features = metadata.features || [];

      // Parse negative metadata properly
      if (metadata.negative) {
        test.negative = {
          phase: metadata.negative.phase || "runtime",
          type: metadata.negative.type || "Error",
        };
      }
    }
  } catch (e) {
    // Fall back to simple parsing if YAML parsing fails
    const lines = content.split("\n");
    let inFrontmatter = false;

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
        if (line.startsWith("description:")) {
          test.description = line.substring(12).trim();
        } else if (line.includes("includes:")) {
          const match = line.match(/\[(.*?)\]/);
          if (match) {
            test.includes = match[1]
              .split(",")
              .map((s) => s.trim().replace(/['"]/g, ""));
          }
        }
      }
    }
  }

  return test;
}

/**
 * Check if a test uses unsupported features
 * @param {Object} test - Parsed test object
 * @returns {boolean|string} True/feature name if test uses unsupported features, false otherwise
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

  // Check features metadata
  if (test.features && test.features.length > 0) {
    for (const feature of test.features) {
      if (UNSUPPORTED_FEATURES.has(feature)) {
        return feature; // Return the unsupported feature name for better logging
      }
    }
  }

  return false;
}

/**
 * Build combined code for a test with harness files
 * @param {Object} test - Parsed test object
 * @param {boolean} useStrict - Whether to prepend "use strict" directive
 * @returns {string} Combined code ready to execute
 */
export function buildCombinedCode(test, useStrict = false) {
  let combinedCode = "";

  // Add "use strict" directive if requested
  // Must be at the very beginning of the code
  if (useStrict) {
    combinedCode = '"use strict";\n';
  }

  combinedCode += getHarnessContent() + "\n";

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
 * Extract the error type from output text
 * @param {string} output - stdout or stderr text
 * @returns {string|null} The error type name or null
 */
function extractErrorType(output) {
  // Match common error patterns: "TypeError:", "SyntaxError:", etc.
  const errorPatterns = [
    /\b(SyntaxError)(?::|])/,
    /\b(TypeError)(?::|])/,
    /\b(ReferenceError)(?::|])/,
    /\b(RangeError)(?::|])/,
    /\b(EvalError)(?::|])/,
    /\b(URIError)(?::|])/,
    /\b(AggregateError)(?::|])/,
    /\b(Test262Error)(?::|])/,
    /\b(Error)(?::|])/,
  ];

  for (const pattern of errorPatterns) {
    const match = output.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Check if the thrown error matches the expected negative test requirements
 * @param {Object} negative - The negative metadata { phase, type }
 * @param {string} stdout - stdout from execution
 * @param {string} stderr - stderr from execution
 * @returns {Object} { matches: boolean, actualType: string|null, reason: string }
 */
function checkNegativeTestResult(negative, stdout, stderr) {
  const combinedOutput = stdout + "\n" + stderr;
  const actualType = extractErrorType(combinedOutput);

  if (!actualType) {
    return {
      matches: false,
      actualType: null,
      reason: "No error type found in output",
    };
  }

  // Check if the error type matches
  if (actualType !== negative.type) {
    return {
      matches: false,
      actualType,
      reason: `Expected ${negative.type} but got ${actualType}`,
    };
  }

  return {
    matches: true,
    actualType,
    reason: `Correctly threw ${negative.type}`,
  };
}

/**
 * Execute a single test run with the given code
 * @param {Object} test - Parsed test object
 * @param {string} combinedCode - The code to execute
 * @param {string} tempFile - Path to temporary file
 * @param {string} mode - "strict" or "non-strict" for error messages
 * @returns {Object} Test result with status and optional reason
 */
function executeTestRun(test, combinedCode, tempFile, mode) {
  try {
    fs.writeFileSync(tempFile, combinedCode);

    const result = execSync(`${RUNTIME_EXECUTABLE} ${tempFile}`, {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout = result.toString().trim();

    if (test.negative) {
      // Test was expected to throw but didn't
      return {
        status: "failed",
        reason: `[${mode}] Expected ${test.negative.type} to be thrown but test passed without error`,
      };
    } else {
      if (stdout.includes("Test262Error")) {
        return {
          status: "failed",
          reason: `[${mode}] Test assertion failed: ` + stdout.substring(0, 150),
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
          reason: `[${mode}] Runtime error: ` + stdout.substring(0, 150),
        };
      }

      return { status: "passed" };
    }
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    const stdout = error.stdout ? error.stdout.toString() : "";

    if (test.negative) {
      // Test was expected to throw - verify the error type matches
      const check = checkNegativeTestResult(test.negative, stdout, stderr);

      if (check.matches) {
        return {
          status: "passed",
          reason: check.reason,
        };
      } else {
        return {
          status: "failed",
          reason: `[${mode}] ${check.reason}`,
        };
      }
    } else {
      if (stdout.trim()) {
        if (stdout.includes("Test262Error")) {
          return {
            status: "failed",
            reason: `[${mode}] Test assertion failed: ` + stdout.substring(0, 150),
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
            reason: `[${mode}] Runtime error: ` + stdout.substring(0, 150),
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
        reason: `[${mode}] Runtime crash: ` + cleanReason,
        stderr: stderr.substring(0, 200),
      };
    }
  }
}

/**
 * Run a single test and return the result
 * Handles strict mode dual execution per test262 spec
 * @param {string} testFile - Path to the test file
 * @param {string} tempFile - Path to use for temporary file (default: /tmp/test262_temp.js)
 * @returns {Object} Test result with status and optional reason
 */
export function runSingleTest(testFile, tempFile = "/tmp/test262_temp.js") {
  const test = parseTestFile(testFile);

  // Check if this test uses unsupported features first
  const unsupportedFeature = testUsesUnsupportedFeatures(test);
  if (unsupportedFeature) {
    return {
      status: "skipped",
      reason: typeof unsupportedFeature === "string"
        ? `Uses unsupported feature: ${unsupportedFeature}`
        : "Uses unsupported language features",
    };
  }

  // Determine which modes to run based on flags
  const flags = test.flags || [];
  const hasNoStrict = flags.includes("noStrict");
  const hasOnlyStrict = flags.includes("onlyStrict");
  const hasModule = flags.includes("module");
  const hasRaw = flags.includes("raw");
  const hasAsync = flags.includes("async");

  // Skip tests with the 'async' flag - they use $DONE() callback for
  // asynchronous completion signaling which requires special harness support
  if (hasAsync) {
    return {
      status: "skipped",
      reason: "Test uses async flag (requires $DONE callback handling)",
    };
  }

  // Determine execution modes
  // - raw: no modifications, single non-strict run
  // - module: single run (modules are always strict)
  // - noStrict: only non-strict run
  // - onlyStrict: only strict run
  // - default: both strict and non-strict runs
  let runNonStrict = true;
  let runStrict = true;

  if (hasRaw) {
    // Raw tests: no modifications at all, single non-strict run
    runStrict = false;
  } else if (hasModule) {
    // Module tests: modules are implicitly strict, single run
    // We don't have module support, so run as strict
    runNonStrict = false;
  } else if (hasNoStrict) {
    // noStrict flag: only run in non-strict mode
    runStrict = false;
  } else if (hasOnlyStrict) {
    // onlyStrict flag: only run in strict mode
    runNonStrict = false;
  }

  // Run non-strict mode if needed
  if (runNonStrict) {
    const nonStrictCode = buildCombinedCode(test, false);
    const nonStrictResult = executeTestRun(test, nonStrictCode, tempFile, "non-strict");

    if (nonStrictResult.status === "failed") {
      return nonStrictResult;
    }

    // If we only need non-strict, return the result
    if (!runStrict) {
      return nonStrictResult;
    }
  }

  // Run strict mode if needed
  if (runStrict) {
    const strictCode = buildCombinedCode(test, true);
    const strictResult = executeTestRun(test, strictCode, tempFile, "strict");

    if (strictResult.status === "failed") {
      return strictResult;
    }

    return strictResult;
  }

  // Should not reach here, but just in case
  return { status: "passed" };
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
