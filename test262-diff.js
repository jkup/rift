#!/usr/bin/env node

/**
 * Test262 Diff Tool
 *
 * Compares test262 results between branches to identify regressions and improvements.
 *
 * Usage:
 *   node test262-diff.js                    # Compare current results to main branch
 *   node test262-diff.js --baseline <file>  # Compare current to specific baseline file
 *   node test262-diff.js --current <file>   # Specify current results file
 *   node test262-diff.js --verbose          # Show all changed tests (not just first 50)
 *   node test262-diff.js --json             # Output as JSON
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Test262ResultsTracker from './test262-results-tracker.js';

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        baseline: null,
        commit: null,
        current: 'test262-results.json',
        verbose: false,
        json: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--baseline':
            case '-b':
                options.baseline = args[++i];
                break;
            case '--commit':
                options.commit = args[++i];
                break;
            case '--current':
            case '-c':
                options.current = args[++i];
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--json':
            case '-j':
                options.json = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

function printUsage() {
    console.log(`
Test262 Diff Tool - Find which tests changed between branches/commits

Usage:
  node test262-diff.js [options]

Options:
  --baseline, -b <file>   Baseline results file (default: fetches from main branch)
  --commit <hash>         Fetch baseline from specific git commit (instead of main)
  --current, -c <file>    Current results file (default: test262-results.json)
  --verbose, -v           Show all changed tests (default: first 10 per category)
  --json, -j              Output results as JSON
  --help, -h              Show this help message

Examples:
  # Compare current branch to main
  node test262-diff.js

  # Compare against a specific commit
  node test262-diff.js --commit 9413b53299e53367ed7d32efde272fa8bc1aa2fd

  # Compare two specific result files
  node test262-diff.js --baseline old-results.json --current new-results.json

  # Get JSON output for CI integration
  node test262-diff.js --json

  # Show all regressions (not truncated)
  node test262-diff.js --verbose
`);
}

function getResultsFromCommit(commitish) {
    console.log(`Fetching test262-results.json from ${commitish}...`);

    try {
        const content = execSync(`git show ${commitish}:test262-results.json`, {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large results file
        });
        const results = JSON.parse(content);
        console.log(`Loaded results from ${commitish}`);
        return results;
    } catch (error) {
        throw new Error(`Could not find test262-results.json in ${commitish}`);
    }
}

function getMainBranchResults() {
    console.log('Fetching test262-results.json from main branch...');

    try {
        // Try to get the file from main branch
        let mainResults;
        try {
            mainResults = getResultsFromCommit('main');
        } catch (e) {
            // Try origin/main if local main doesn't have the file
            try {
                mainResults = getResultsFromCommit('origin/main');
            } catch (e2) {
                throw new Error('Could not find test262-results.json in main or origin/main branch');
            }
        }

        return mainResults;
    } catch (error) {
        console.error('Error fetching main branch results:', error.message);
        console.error('\nTip: Make sure test262-results.json is committed to the main branch.');
        console.error('     Or use --baseline <file> or --commit <hash> to specify a baseline.');
        process.exit(1);
    }
}

function formatTestPath(testPath) {
    // Shorten long paths for readability
    return testPath.replace('test/built-ins/', 'built-ins/')
                   .replace('test/language/', 'language/')
                   .replace('test/annexB/', 'annexB/');
}

function groupByCategory(tests) {
    const grouped = {};
    for (const test of tests) {
        const category = test.category || 'unknown';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(test);
    }
    return grouped;
}

function printResults(comparison, options) {
    const { newlyFailing, newlyPassing, summary } = comparison;

    if (options.json) {
        console.log(JSON.stringify({
            regressions: newlyFailing,
            improvements: newlyPassing,
            summary: summary
        }, null, 2));
        return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('                    TEST262 DIFF RESULTS');
    console.log('='.repeat(70) + '\n');

    // Summary
    console.log('SUMMARY');
    console.log('-'.repeat(40));
    console.log(`  Baseline pass rate: ${summary.baselinePassRate.toFixed(2)}%`);
    console.log(`  Current pass rate:  ${summary.currentPassRate.toFixed(2)}%`);
    console.log(`  Net change:         ${summary.netChange >= 0 ? '+' : ''}${summary.netChange} tests`);
    console.log();
    console.log(`  Regressions:   ${newlyFailing.length} tests now FAILING`);
    console.log(`  Improvements:  ${newlyPassing.length} tests now PASSING`);

    // Regressions (newly failing)
    if (newlyFailing.length > 0) {
        console.log(`\n${'!'.repeat(3)} REGRESSIONS: ${newlyFailing.length} tests now FAILING ${'!'.repeat(3)}`);
        console.log('-'.repeat(60));

        const grouped = groupByCategory(newlyFailing);
        const categories = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

        for (const category of categories) {
            const tests = grouped[category];
            console.log(`\n  [${category}] (${tests.length} tests)`);

            const displayTests = options.verbose ? tests : tests.slice(0, 10);
            for (const test of displayTests) {
                console.log(`    - ${formatTestPath(test.path)}`);
                if (test.reason) {
                    const reason = test.reason.substring(0, 100);
                    console.log(`      Error: ${reason}${test.reason.length > 100 ? '...' : ''}`);
                }
            }

            if (!options.verbose && tests.length > 10) {
                console.log(`    ... and ${tests.length - 10} more`);
            }
        }
    } else {
        console.log('\nNo regressions detected.');
    }

    // Improvements (newly passing)
    if (newlyPassing.length > 0) {
        console.log(`\n${'*'.repeat(3)} IMPROVEMENTS: ${newlyPassing.length} tests now PASSING ${'*'.repeat(3)}`);
        console.log('-'.repeat(60));

        const grouped = groupByCategory(newlyPassing);
        const categories = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

        for (const category of categories) {
            const tests = grouped[category];
            console.log(`\n  [${category}] (${tests.length} tests)`);

            const displayTests = options.verbose ? tests : tests.slice(0, 10);
            for (const test of displayTests) {
                console.log(`    + ${formatTestPath(test.path)}`);
            }

            if (!options.verbose && tests.length > 10) {
                console.log(`    ... and ${tests.length - 10} more`);
            }
        }
    } else {
        console.log('\nNo improvements detected.');
    }

    // Final verdict
    console.log('\n' + '='.repeat(70));
    if (newlyFailing.length > 0) {
        console.log(`RESULT: REGRESSION DETECTED - ${newlyFailing.length} tests now failing`);
        console.log('='.repeat(70) + '\n');
        process.exitCode = 1;
    } else if (newlyPassing.length > 0) {
        console.log(`RESULT: IMPROVEMENT - ${newlyPassing.length} more tests now passing!`);
        console.log('='.repeat(70) + '\n');
    } else {
        console.log('RESULT: NO CHANGES - Test results are identical');
        console.log('='.repeat(70) + '\n');
    }
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printUsage();
        process.exit(0);
    }

    // Load current results
    if (!fs.existsSync(options.current)) {
        console.error(`Error: Current results file not found: ${options.current}`);
        console.error('Run "npm run test262" first to generate results.');
        process.exit(1);
    }

    console.log(`Loading current results from: ${options.current}`);
    const currentResults = Test262ResultsTracker.loadResults(options.current);

    // Load baseline results
    let baselineResults;
    if (options.baseline) {
        if (!fs.existsSync(options.baseline)) {
            console.error(`Error: Baseline file not found: ${options.baseline}`);
            process.exit(1);
        }
        console.log(`Loading baseline from: ${options.baseline}`);
        baselineResults = Test262ResultsTracker.loadResults(options.baseline);
    } else if (options.commit) {
        try {
            baselineResults = getResultsFromCommit(options.commit);
        } catch (error) {
            console.error(`Error: ${error.message}`);
            console.error('\nTip: Make sure test262-results.json was committed at that point.');
            process.exit(1);
        }
    } else {
        baselineResults = getMainBranchResults();
    }

    // Compare results
    console.log('\nComparing results...');
    const comparison = Test262ResultsTracker.compareResults(baselineResults, currentResults);

    // Print results
    printResults(comparison, options);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
