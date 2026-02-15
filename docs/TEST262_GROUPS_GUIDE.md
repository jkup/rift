# Test262 Group Testing Guide

This guide explains how to use the category-based Test262 testing system for Rift.

## 🚀 New! Impact Analysis

**Want to know what to work on for maximum value?**

```bash
npm run test262:analyze
```

See [`TEST262_IMPACT_ANALYSIS.md`](TEST262_IMPACT_ANALYSIS.md) for details on finding high-value features to implement.

## Quick Startt262 Group Testing Guide

This guide explains how to use the new category-based Test262 testing system for Rift.

## Quick Start

### List Available Test Groups

```bash
npm run test262:groups
```

This shows all available test groups with descriptions.

### Run a Specific Group

```bash
npm run test262:group -- <group-name>
```

**Examples:**
```bash
# Test core language features (operators, control flow, etc.)
npm run test262:group -- core-language

# Test Array built-in
npm run test262:group -- built-in-array

# Test basic types
npm run test262:group -- basic-types

# Test error handling
npm run test262:group -- error-handling
```

### Run All Groups with Summary

```bash
npm run test262:all-groups
```

This runs every test group and produces a summary table showing pass rates for each.

## Available Test Groups

| Group | Description |
|-------|-------------|
| **core-language** | Core language features - expressions, operators, control flow |
| **basic-types** | Primitive types and basic operations |
| **built-in-array** | Array built-in and all methods |
| **built-in-string** | String built-in and all methods |
| **built-in-object** | Object built-in and utilities |
| **built-in-math** | Math built-in and all methods |
| **built-in-boolean** | Boolean built-in and Boolean type |
| **built-in-number** | Number built-in and number operations |
| **built-in-function** | Function built-in and function features |
| **error-handling** | Error objects and exception handling |
| **advanced-language** | Advanced features - closures, scoping, prototypes |
| **control-flow** | Control flow statements (break, continue, return, switch) |
| **typeof-operators** | typeof, instanceof, in, delete operators |
| **not-yet-supported** | Features we know we don't support yet |

## Understanding Results

### Console Output

When you run a test group, you'll see:

```
📊 Results for basic-types

✅ Passed:   188
❌ Failed:   111
⏭️  Skipped:  0
────────────────────
📊 Total:    299
📈 Pass Rate: 62.9%
⏱️  Runtime:  19.0s
```

### JSON Results Files

Each group run creates a detailed JSON file: `test262-group-{group-name}-results.json`

This file contains:
- **Metadata**: Timestamp, commit, branch
- **Categories**: Test results organized by subcategory
- **Failed tests**: List of failing tests with error messages
- **Summary**: Statistics including strongest/weakest areas

### Full Test Suite with Categories

The regular `npm run test262` command now also generates:
- `test262-results.json` - Full categorized results
- Enhanced console output showing:
  - Overall pass rate
  - Strongest categories (≥70% pass rate)
  - Improvement opportunities (lowest pass rates)
  - Largest test categories

## Development Workflow

### Working on a Specific Feature

When implementing or fixing a feature, run its group frequently:

```bash
# Working on Array methods?
npm run test262:group -- built-in-array

# Working on string operations?
npm run test262:group -- built-in-string

# Working on operators?
npm run test262:group -- core-language
```

### Checking for Regressions

Before committing changes:

```bash
# Run all groups to see if you broke anything
npm run test262:all-groups
```

This gives you a quick overview of all feature areas.

### Comparing Results

Save baseline results before making changes:

```bash
npm run test262:group -- built-in-array
cp test262-group-built-in-array-results.json baseline.json
```

After making changes:

```bash
npm run test262:group -- built-in-array
# Compare test262-group-built-in-array-results.json with baseline.json
```

## Customizing Test Groups

Edit `scripts/test262/groups.json` to:
- Add new groups
- Modify existing groups
- Add more patterns to groups

Example group structure:
```json
{
  "my-group": {
    "description": "Description of what this tests",
    "patterns": [
      "language/expressions/addition",
      "language/expressions/subtraction"
    ]
  }
}
```

## Tips & Tricks

### Quick Tests During Development

Run the smallest relevant group for fast feedback:
- `basic-types` - 299 tests (~20s)
- `error-handling` - Focused on exceptions
- `typeof-operators` - Small, specific feature

### Understanding Failures

Check the JSON results file to see:
- Which specific tests failed
- Error messages for each failure
- Categories with highest failure rates

### Prioritizing Work

1. Run `npm run test262:all-groups`
2. Look at the summary table
3. Focus on groups with:
   - Low pass rate but high importance
   - Many tests (high impact)
   - Related to features you're working on

## Architecture

The new system consists of:

1. **scripts/test262/groups.json** - Configuration defining test groups
2. **scripts/test262/results-tracker.js** - Module for categorizing and tracking results
3. **scripts/test262/group-runner.js** - Script for running groups
4. **scripts/test262/runner.js** - Enhanced with category tracking

All test runners now produce structured JSON output with detailed category breakdowns, making it easy to understand progress and identify regressions.

## See Also

- `IDEAS.md` - Full list of ideas for improving Test262 testing
- `docs/CI_TEST262_GUIDE.md` - CI integration guide
- `test262/CONTRIBUTING.md` - Test262 authoring guide
