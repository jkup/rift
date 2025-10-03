#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Test262ResultsTracker - Categorizes and tracks Test262 test results
 * Provides insights into which categories/features are strong vs weak
 */
export class Test262ResultsTracker {
  constructor() {
    this.results = {
      metadata: {
        timestamp: new Date().toISOString(),
        commit: process.env.GITHUB_SHA || 'local',
        branch: process.env.GITHUB_REF || 'local'
      },
      categories: {},
      tests: [],
      summary: {}
    };
  }

  /**
   * Categorize a test based on its file path
   * @param {string} testPath - Full path to the test file
   * @returns {Object} Category information
   */
  categorizeTest(testPath) {
    // Extract category from path
    // e.g., "test262/test/built-ins/Array/prototype/map/..." -> "built-ins/Array"
    const normalizedPath = testPath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/test/')[1]?.split('/') || [];
    
    if (parts.length === 0) {
      return {
        topLevel: 'unknown',
        feature: 'unknown',
        subFeature: null,
        fullPath: 'unknown'
      };
    }

    return {
      topLevel: parts[0],           // "built-ins", "language", "annexB"
      feature: parts[1] || 'general',             // "Array", "expressions", etc.
      subFeature: parts[2] || null, // "prototype", "addition", etc.
      fullPath: parts.slice(0, 3).join('/')
    };
  }

  /**
   * Record a test result
   * @param {string} testPath - Path to the test file
   * @param {string} status - 'passed', 'failed', or 'skipped'
   * @param {string} reason - Optional reason for failure
   */
  recordResult(testPath, status, reason = null) {
    const category = this.categorizeTest(testPath);
    
    // Initialize category if needed
    if (!this.results.categories[category.fullPath]) {
      this.results.categories[category.fullPath] = {
        topLevel: category.topLevel,
        feature: category.feature,
        subFeature: category.subFeature,
        passed: 0,
        failed: 0,
        skipped: 0,
        failedTests: []
      };
    }
    
    // Update counts
    const cat = this.results.categories[category.fullPath];
    cat[status]++;
    
    // Store individual test info
    const testInfo = {
      path: testPath.replace(/.*test262\/test\//, ''),
      category: category.fullPath,
      status
    };
    
    // Only store reason for failed tests to save space
    if (status === 'failed' && reason) {
      testInfo.reason = reason.substring(0, 200); // Truncate long errors
      cat.failedTests.push({
        path: testInfo.path,
        reason: testInfo.reason
      });
    }
    
    this.results.tests.push(testInfo);
  }

  /**
   * Generate summary statistics and insights
   * @returns {Object} Complete results with summary
   */
  generateReport() {
    const categories = Object.entries(this.results.categories);
    
    // Calculate pass rates
    const categoryStats = categories.map(([name, stats]) => {
      const total = stats.passed + stats.failed;
      const passRate = total > 0 ? (stats.passed / total) * 100 : 0;
      
      return {
        name,
        ...stats,
        total,
        passRate: parseFloat(passRate.toFixed(2))
      };
    });

    // Sort by various metrics
    const byPassRate = [...categoryStats].sort((a, b) => b.passRate - a.passRate);
    const byTestCount = [...categoryStats].sort((a, b) => b.total - a.total);
    const byFailures = [...categoryStats].sort((a, b) => b.failed - a.failed);

    // Overall stats
    const totalPassed = categoryStats.reduce((sum, c) => sum + c.passed, 0);
    const totalFailed = categoryStats.reduce((sum, c) => sum + c.failed, 0);
    const totalSkipped = categoryStats.reduce((sum, c) => sum + c.skipped, 0);
    const totalTests = totalPassed + totalFailed;
    const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    this.results.summary = {
      overall: {
        total: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        passRate: parseFloat(overallPassRate.toFixed(2))
      },
      totalCategories: categories.length,
      strongestCategories: byPassRate
        .filter(c => c.passRate >= 70 && c.total >= 5)
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          passRate: c.passRate,
          passed: c.passed,
          total: c.total
        })),
      weakestCategories: byPassRate
        .filter(c => c.total >= 5) // Only categories with enough tests
        .slice(-10)
        .reverse()
        .map(c => ({
          name: c.name,
          passRate: c.passRate,
          failed: c.failed,
          total: c.total
        })),
      largestCategories: byTestCount
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          total: c.total,
          passRate: c.passRate
        })),
      mostFailures: byFailures
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          failed: c.failed,
          total: c.total,
          passRate: c.passRate
        }))
    };

    return {
      ...this.results,
      categoryStats: categoryStats.sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  /**
   * Save results to a JSON file
   * @param {string} filename - Output filename
   */
  saveResults(filename = 'test262-results.json') {
    const report = this.generateReport();
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Print a summary report to console
   */
  printSummary() {
    const report = this.generateReport();
    const { summary } = report;

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Test262 Results Summary');
    console.log('═'.repeat(60));
    
    console.log('\n🎯 Overall Results:');
    console.log(`   Total Tests: ${summary.overall.total}`);
    console.log(`   ✅ Passed: ${summary.overall.passed} (${summary.overall.passRate}%)`);
    console.log(`   ❌ Failed: ${summary.overall.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.overall.skipped}`);
    
    if (summary.strongestCategories.length > 0) {
      console.log('\n💪 Strongest Categories (≥70% pass rate):');
      summary.strongestCategories.forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name.padEnd(40)} ${cat.passRate.toFixed(1)}% (${cat.passed}/${cat.total})`);
      });
    }
    
    if (summary.weakestCategories.length > 0) {
      console.log('\n🎯 Improvement Opportunities (lowest pass rates):');
      summary.weakestCategories.forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name.padEnd(40)} ${cat.passRate.toFixed(1)}% (${cat.failed} failed)`);
      });
    }
    
    console.log('\n📦 Largest Test Categories:');
    summary.largestCategories.slice(0, 5).forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name.padEnd(40)} ${cat.total} tests (${cat.passRate.toFixed(1)}%)`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log(`📄 Detailed results saved to: test262-results.json`);
    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Load results from a JSON file
   * @param {string} filename - Input filename
   * @returns {Object} Loaded results
   */
  static loadResults(filename) {
    if (!fs.existsSync(filename)) {
      throw new Error(`Results file not found: ${filename}`);
    }
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  }

  /**
   * Compare two result sets and identify changes
   * @param {Object} baseline - Previous results
   * @param {Object} current - Current results
   * @returns {Object} Comparison report
   */
  static compareResults(baseline, current) {
    const baselineMap = new Map();
    baseline.tests.forEach(t => baselineMap.set(t.path, t.status));
    
    const newlyPassing = [];
    const newlyFailing = [];
    const stillPassing = [];
    const stillFailing = [];
    
    current.tests.forEach(test => {
      const prevStatus = baselineMap.get(test.path);
      
      if (prevStatus === 'failed' && test.status === 'passed') {
        newlyPassing.push(test);
      } else if (prevStatus === 'passed' && test.status === 'failed') {
        newlyFailing.push(test);
      } else if (test.status === 'passed') {
        stillPassing.push(test);
      } else if (test.status === 'failed') {
        stillFailing.push(test);
      }
    });
    
    return {
      newlyPassing,
      newlyFailing,
      stillPassing,
      stillFailing,
      summary: {
        regressions: newlyFailing.length,
        improvements: newlyPassing.length,
        netChange: newlyPassing.length - newlyFailing.length,
        baselinePassRate: baseline.summary?.overall?.passRate || 0,
        currentPassRate: current.summary?.overall?.passRate || 0
      }
    };
  }
}

export default Test262ResultsTracker;
