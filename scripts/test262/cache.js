#!/usr/bin/env node

/**
 * Test262 Incremental Cache - Tracks test results to skip unchanged tests
 *
 * The cache stores:
 * - Runtime build fingerprint (to invalidate all results when runtime changes)
 * - Per-test file modification times and results
 *
 * A test is re-run if:
 * - The runtime was rebuilt since the last run
 * - The test file was modified since the last run
 * - The test isn't in the cache
 * - Force mode is enabled
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_FILE = ".test262-cache.json";
const CACHE_VERSION = 1;

export class Test262Cache {
  constructor() {
    this.cache = null;
    this.runtimeFingerprint = null;
    this.dirty = false;
  }

  /**
   * Load cache from disk
   * @returns {boolean} True if cache was loaded successfully
   */
  load() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

        // Check cache version compatibility
        if (data.version !== CACHE_VERSION) {
          console.log("Cache version mismatch, starting fresh");
          this.cache = this.createEmptyCache();
          return false;
        }

        this.cache = data;
        return true;
      }
    } catch (error) {
      console.log(`Failed to load cache: ${error.message}`);
    }

    this.cache = this.createEmptyCache();
    return false;
  }

  /**
   * Create an empty cache structure
   */
  createEmptyCache() {
    return {
      version: CACHE_VERSION,
      runtimeFingerprint: null,
      lastRun: null,
      tests: {},
    };
  }

  /**
   * Save cache to disk
   */
  save() {
    if (!this.dirty) {
      return;
    }

    try {
      this.cache.lastRun = new Date().toISOString();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error(`Failed to save cache: ${error.message}`);
    }
  }

  /**
   * Clear the cache file
   */
  static clear() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        console.log("Cache cleared");
        return true;
      }
      console.log("No cache file to clear");
      return false;
    } catch (error) {
      console.error(`Failed to clear cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the runtime build fingerprint
   * Uses the modification time of the rift executable
   * @param {string} runtimePath - Path to the runtime executable
   * @returns {string} Fingerprint string
   */
  getRuntimeFingerprint(runtimePath) {
    if (this.runtimeFingerprint) {
      return this.runtimeFingerprint;
    }

    try {
      const stat = fs.statSync(runtimePath);
      this.runtimeFingerprint = `${stat.mtime.getTime()}-${stat.size}`;
      return this.runtimeFingerprint;
    } catch (error) {
      // If we can't get the fingerprint, return a unique value to force re-run
      return `error-${Date.now()}`;
    }
  }

  /**
   * Check if the runtime has changed since last run
   * @param {string} runtimePath - Path to the runtime executable
   * @returns {boolean} True if runtime changed
   */
  hasRuntimeChanged(runtimePath) {
    const currentFingerprint = this.getRuntimeFingerprint(runtimePath);
    const cachedFingerprint = this.cache.runtimeFingerprint;

    if (cachedFingerprint !== currentFingerprint) {
      // Update the fingerprint for next time
      this.cache.runtimeFingerprint = currentFingerprint;
      this.dirty = true;
      return true;
    }

    return false;
  }

  /**
   * Get the modification time of a file
   * @param {string} filePath - Path to the file
   * @returns {number} Modification time in milliseconds, or 0 if error
   */
  getFileMtime(filePath) {
    try {
      return fs.statSync(filePath).mtime.getTime();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if a test needs to be run
   * @param {string} testPath - Path to the test file
   * @param {boolean} runtimeChanged - Whether the runtime has changed
   * @returns {Object} { needsRun: boolean, cachedResult: object|null }
   */
  checkTest(testPath, runtimeChanged) {
    // If runtime changed, all tests need to run
    if (runtimeChanged) {
      return { needsRun: true, cachedResult: null };
    }

    const cached = this.cache.tests[testPath];

    // Not in cache
    if (!cached) {
      return { needsRun: true, cachedResult: null };
    }

    // Check if test file has changed
    const currentMtime = this.getFileMtime(testPath);
    if (currentMtime !== cached.mtime) {
      return { needsRun: true, cachedResult: null };
    }

    // Test hasn't changed, use cached result
    return {
      needsRun: false,
      cachedResult: {
        status: cached.status,
        reason: cached.reason,
      },
    };
  }

  /**
   * Record a test result
   * @param {string} testPath - Path to the test file
   * @param {string} status - 'passed', 'failed', or 'skipped'
   * @param {string} reason - Optional reason for failure
   */
  recordResult(testPath, status, reason = null) {
    const mtime = this.getFileMtime(testPath);

    this.cache.tests[testPath] = {
      mtime,
      status,
      reason: reason ? reason.substring(0, 200) : null,
      recordedAt: Date.now(),
    };

    this.dirty = true;
  }

  /**
   * Get cache statistics
   * @returns {Object} Stats about the cache
   */
  getStats() {
    const tests = Object.values(this.cache.tests);
    return {
      totalCached: tests.length,
      passed: tests.filter((t) => t.status === "passed").length,
      failed: tests.filter((t) => t.status === "failed").length,
      skipped: tests.filter((t) => t.status === "skipped").length,
      lastRun: this.cache.lastRun,
    };
  }

  /**
   * Remove stale entries (tests that no longer exist)
   * @param {string[]} currentTestFiles - List of current test file paths
   * @returns {number} Number of entries removed
   */
  pruneStaleEntries(currentTestFiles) {
    const currentSet = new Set(currentTestFiles);
    const staleKeys = Object.keys(this.cache.tests).filter(
      (key) => !currentSet.has(key)
    );

    for (const key of staleKeys) {
      delete this.cache.tests[key];
    }

    if (staleKeys.length > 0) {
      this.dirty = true;
    }

    return staleKeys.length;
  }
}

export default Test262Cache;
