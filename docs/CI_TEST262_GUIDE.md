# Test262 CI Integration Guide

This guide explains how to use the automated Test262 compatibility tracking in GitHub Actions.

## 🚀 Overview

The project includes two GitHub Actions workflows that automatically run Test262 compatibility tests:

1. **Test262 Compatibility Report** - Full comparison between PR and main branch
2. **Test262 Quick Check** - Fast subset testing for quick feedback

## 📊 Workflow Details

### 1. Test262 Compatibility Report (`.github/workflows/test262-comparison.yml`)

**Triggers:**
- Pull requests to `main` branch
- Pushes to `main` branch  
- Manual trigger via GitHub UI

**What it does:**
1. Builds your PR branch and runs full Test262 suite
2. Builds main branch and runs full Test262 suite
3. Compares results and calculates differences
4. Posts detailed comparison report as PR comment
5. Creates status check showing improvement/regression
6. Uploads full test results as artifacts

**Expected runtime:** ~30-45 minutes

### 2. Test262 Quick Check (`.github/workflows/test262-quick.yml`)

**Triggers:**
- Pull requests to `main` branch
- Manual trigger with custom test patterns

**What it does:**
1. Builds only your PR branch
2. Runs a focused subset of Test262 tests (default: `language/expressions/addition`)
3. Posts quick results as PR comment
4. Provides rapid feedback (5-15 minutes)

**Expected runtime:** ~5-15 minutes

## 🎯 How to Use

### For Pull Requests

When you create a PR that touches runtime code (`src/**`, `include/**`), both workflows will automatically run:

1. **Quick Check** runs first (~5-15 min) - gives you rapid feedback
2. **Full Comparison** runs in parallel (~30-45 min) - gives comprehensive analysis

### Manual Triggers

#### Run Quick Check with Custom Pattern
1. Go to Actions tab in GitHub
2. Select "Test262 Quick Check" workflow
3. Click "Run workflow"
4. Enter test pattern (e.g., `language/expressions/arithmetic` or `language/statements/for`)
5. Click "Run workflow"

#### Run Full Comparison
1. Go to Actions tab in GitHub  
2. Select "Test262 Compatibility Report" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

### Local Testing

You can also run filtered tests locally:

```bash
# Run specific test pattern
node test262-runner.js --include="language/expressions/addition"

# Run single test
node test262-runner.js test/language/expressions/addition/S11.6.1_A3.1_T2.1.js

# Run full suite (same as npm run test262)
node test262-runner.js
```

## 📋 Reading the Results

### PR Comments

Both workflows post comments on your PR:

#### Quick Check Comment
```
## 🚀 Quick Test262 Check

Pattern: `language/expressions/addition`  
Result: ✅ 12/20 tests passing (60.0%)

🎉 Some tests are passing!

*For full Test262 results, wait for the complete compatibility report.*
```

#### Full Comparison Comment
```
# 🧪 Test262 Compatibility Report

## 📊 Results Summary

| Branch | Passed | Failed | Total | Pass Rate | 
|--------|--------|--------|-------|-----------|
| **PR** | 1250 | 22119 | 23369 | 5.3% |
| **Main** | 1200 | 22169 | 23369 | 5.1% |
| **Diff** | **+50** | | | **+0.2%** |

## 🎉 IMPROVEMENT

🎉 **Congratulations!** This PR improves JavaScript compatibility by fixing additional test262 tests.

### What improved:
- 50 additional tests now pass
- 0.2% improvement in pass rate
```

### Status Checks

The full comparison creates a status check on your PR:
- ✅ Green: `Improved: +X tests passing`
- ❌ Red: `Regression: -X tests failing`  
- ➡️ Gray: `No change in test262 compatibility`

### Artifacts

Full test results are saved as downloadable artifacts:
- `test262-results` (from full comparison)
- `test262-quick-results` (from quick check)

## 🎯 Interpreting Results

### What Good Results Look Like

- **Improvements:** Any increase in passing tests is great!
  - `+1 test` = Small but meaningful progress
  - `+10 tests` = Significant improvement
  - `+100 tests` = Major feature implementation

- **Pass Rate:** Current baseline is ~5%, so any improvement is valuable
  - `5.0% → 5.1%` = Good progress
  - `5.0% → 6.0%` = Excellent progress
  - `5.0% → 10.0%` = Outstanding achievement

### What to Watch For

- **Regressions:** If tests that were passing now fail
  - Small regressions (-1 to -5) might be acceptable if you're adding +20
  - Large regressions (-50+) need investigation

- **No Change:** Often normal, especially for:
  - Refactoring that doesn't add features
  - Internal improvements
  - Non-language changes

## 🛠️ Debugging Failures

### If Quick Check Shows 0 Passing Tests
This is normal when working on areas that aren't covered by the default test pattern. Try:
1. Manual trigger with a different pattern relevant to your changes
2. Wait for full comparison to see the complete picture

### If Full Comparison Shows Regressions
1. Download the artifacts to see which specific tests broke
2. Run those tests locally: `node test262-runner.js path/to/failing/test.js`
3. Debug the specific failures

### If Workflows Don't Trigger
Check that your changes touch the right paths:
- `src/**` (runtime source code)
- `include/**` (headers)  
- `CMakeLists.txt` (build configuration)
- `test262-runner.js` (test runner)
- `package.json` (dependencies)

## 🎉 Success Stories

Examples of what different improvements mean:

- **Function expressions fix:** Could improve pass rate from 5% to 15%+ (massive)
- **New operator implementation:** Might add 50-200 passing tests
- **Bug fix in arithmetic:** Could add 5-20 passing tests
- **Memory management improvement:** Might add 10-50 passing tests

## 🚨 Troubleshooting

### Common Issues

1. **Timeout:** Tests take too long
   - Solution: Workflows have 30-45 min timeouts, should be sufficient

2. **Build Failure:** Runtime doesn't compile
   - Solution: Check build logs in Actions tab

3. **No Comment Posted:** Bot permissions issue
   - Solution: Should work automatically, contact maintainer if persistent

### Getting Help

If you encounter issues:
1. Check the Actions tab for detailed logs
2. Try running tests locally first
3. Open an issue with the workflow run URL

---

*This CI integration helps ensure that runtime improvements are automatically tracked and celebrated! 🎉* 