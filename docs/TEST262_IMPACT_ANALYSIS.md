# Test262 Impact Analysis - Finding High-Value Features

## Quick Start

```bash
# Run full test suite first (or any group)
npm run test262

# Analyze the results to find what to work on
npm run test262:analyze

# Or analyze a specific group's results
npm run test262:analyze test262-group-built-in-array-results.json
```

## What It Does

The impact analyzer helps you prioritize feature implementation by scoring each category based on:

1. **Test Count** - More tests = more comprehensive coverage
2. **Room for Improvement** - Low pass rate = more opportunity for impact
3. **Real-World Importance** - How often this feature is used in practice (based on npm package analysis, MDN popularity)
4. **Implementation Complexity** - Estimated difficulty (1=easy, 10=very hard)

## Understanding the Output

### 1. Top Priorities by Overall Impact

```
Rank  Feature                                        Impact    ROI   Tests   Pass  Importance  Complexity
#1    language/literals/numeric                        42.1    8.4     157  72.6%       5/10        5/10
#2    language/literals/string                         32.3    6.5      73  49.3%       5/10        5/10
#3    language/types/string                            26.9    8.9      24  41.7%      10/10        3/10
```

**Impact Score**: Overall value (0-100+ scale)
- Higher = more valuable to work on
- Considers test coverage, improvement opportunity, and real-world usage

**ROI (Return on Investment)**: Impact per unit of effort
- Impact Score / Complexity
- Higher = better "bang for your buck"

**Importance**: Real-world usage frequency (1-10)
- 10 = Critical (Array.map, String.split, Object.keys)
- 7-9 = Very Common (Array.forEach, String.indexOf)
- 5-6 = Moderately Common
- 1-4 = Less Common

**Complexity**: Implementation difficulty (1-10)
- 1-3 = Easy (simple methods, basic operators)
- 4-6 = Medium (callback-based methods, some edge cases)
- 7-10 = Hard (classes, async/await, Promise)

### 2. Quick Wins (High ROI, Low Complexity)

Features that give you the most value for the least effort:
```
🚀 Quick Wins (High ROI, Low Complexity):
1. language/types/string - ROI: 8.95 | 14 failing tests | 3/10 complexity
2. language/types/number - ROI: 8.63 | 12 failing tests | 3/10 complexity
```

**Perfect for**: Getting quick improvements in pass rate with minimal effort

### 3. High Impact Features (Worth the Effort)

Features with high overall impact, even if they take more work:
```
⭐ High Impact Features (Worth the Effort):
1. language/types/string - Impact: 26.85 | 10/10 importance | 41.7% pass
```

**Perfect for**: Major improvements that are worth investing time in

### 4. Low Hanging Fruit (Easy Fixes)

Features with poor pass rates but easy to fix:
```
🍎 Low Hanging Fruit (Easy Fixes with Decent Impact):
1. language/types/string - 41.7% pass | 14 failures | 3/10 complexity
```

**Perfect for**: Quick wins to boost overall pass rate

### 5. Test Group Recommendations

High-level focus areas:
```
Focus Area                           Avg Impact   Avg ROI     Tests   Pass Rate
language/literals                          26.5       5.3       237       59.6%
```

**Perfect for**: Deciding which test group to focus on

## Real Example: Using the Analysis

Let's say you have 2 hours to improve Test262 compatibility. Here's how to use the analyzer:

```bash
# 1. Run the full test suite
npm run test262

# 2. Analyze results
npm run test262:analyze
```

**Output shows:**

```
🚀 Quick Wins:
1. language/types/string - ROI: 8.95 | 14 failing tests | 3/10 complexity
2. String.prototype.trim - ROI: 7.2 | 8 failing tests | 3/10 complexity
```

**Decision**: Work on string type edge cases - high ROI, low complexity, 14 tests you can fix!

```bash
# 3. Run the specific group to see current state
npm run test262:group -- built-in-string

# 4. Check the JSON to see which specific tests fail
cat test262-group-built-in-string-results.json | jq '.categories["built-ins/String/prototype/trim"]'

# 5. Implement the fix

# 6. Rerun to verify
npm run test262:group -- built-in-string

# 7. Celebrate! 🎉
```

## Interpreting Importance Scores

The analyzer uses research-based importance scores:

**10/10 - Critical, used everywhere:**
- Array.map, Array.filter, Array.forEach
- String.split, String.indexOf, String.toLowerCase
- Object.keys, Object.assign
- Basic operators (assignment, equality, arithmetic)
- Core control flow (if, for, while)

**7-9/10 - Very Common:**
- Array.slice, Array.indexOf, Array.push
- String.replace, String.trim, String.substring
- Math.floor, Math.max, Math.random
- typeof, Error handling

**5-6/10 - Moderately Common:**
- Array.reduce, Object.create
- Less common Math methods
- Function.bind

**1-4/10 - Specialized/Advanced:**
- Classes, async/await, Promises
- BigInt, Temporal API
- Advanced array methods (flatMap)

## Tips

### Start with Quick Wins
```bash
# Look for features with:
# - ROI > 3.0
# - Complexity <= 4
# - Failed tests > 5
```

These give you the best results for your time investment.

### Balance Your Work

Don't only chase quick wins! Mix:
- **70%**: Quick wins and low hanging fruit (fast progress)
- **20%**: High impact features (major improvements)
- **10%**: Foundation work that unlocks other features

### Use Groups for Focus

After analyzing, run specific groups:
```bash
# Analyzer says: "language/types/string has high ROI"
npm run test262:group -- basic-types

# Focus your work there, get fast feedback
```

### Track Your Progress

Save baseline before starting:
```bash
npm run test262:analyze > baseline-analysis.txt

# After your work
npm run test262:analyze > after-analysis.txt

# Compare to see improvement
diff baseline-analysis.txt after-analysis.txt
```

## Generated Files

**test262-impact-report.json** - Detailed JSON report with:
- `topPriorities`: Top 20 features by impact
- `quickWins`: High ROI, low complexity features
- `highImpact`: Features worth the effort
- `allCategories`: Complete analysis data

Use this for:
- Programmatic analysis
- Generating charts/graphs
- Tracking progress over time
- Making data-driven decisions

## Examples of High-Impact Work

Based on typical analyzer output:

### Example 1: String Methods (High ROI)
```
Impact: 26.9 | ROI: 8.9 | 14 failures | 3/10 complexity
```
**Action**: Implement missing string edge cases - 2-3 hours, 14 tests pass

### Example 2: Array.prototype.map (High Importance)
```
Impact: 35.2 | ROI: 7.0 | 45 failures | 5/10 complexity | 10/10 importance
```
**Action**: Fix callback handling - 4-6 hours, widely used feature

### Example 3: Number Type Coercion (Low Hanging Fruit)
```
Impact: 25.9 | 12 failures | 3/10 complexity
```
**Action**: Fix number conversion edge cases - 1-2 hours

## See Also

- `docs/TEST262_GROUPS_GUIDE.md` - How to use test groups
- `docs/TEST262_IMPROVEMENT_IDEAS.md` - All improvement ideas
- `test262-groups.json` - Test group definitions
