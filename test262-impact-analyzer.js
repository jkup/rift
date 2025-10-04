#!/usr/bin/env node

import fs from "fs";
import chalk from "chalk";

/**
 * Test262 Impact Analyzer
 * Analyzes test results to prioritize feature implementation based on:
 * - Number of tests (more tests = more comprehensive coverage)
 * - Current pass rate (room for improvement)
 * - Real-world usage importance
 * - Implementation complexity estimate
 */

// Real-world importance scores based on common usage patterns
// Source: npm package analysis, MDN popularity, developer surveys
const REAL_WORLD_IMPORTANCE = {
  // Core language (essential for any JS)
  "language/expressions/addition": 10,
  "language/expressions/subtraction": 10,
  "language/expressions/multiplication": 10,
  "language/expressions/division": 10,
  "language/expressions/assignment": 10,
  "language/expressions/equals": 9,
  "language/expressions/strict-equals": 9,
  "language/statements/if": 10,
  "language/statements/for": 10,
  "language/statements/while": 9,
  "language/statements/return": 10,
  "language/statements/function": 10,
  
  // Types (fundamental)
  "language/types/number": 10,
  "language/types/string": 10,
  "language/types/boolean": 10,
  "language/types/undefined": 9,
  "language/types/null": 9,
  
  // Array methods (very commonly used)
  "built-ins/Array/prototype/map": 10,
  "built-ins/Array/prototype/filter": 10,
  "built-ins/Array/prototype/forEach": 9,
  "built-ins/Array/prototype/reduce": 8,
  "built-ins/Array/prototype/slice": 9,
  "built-ins/Array/prototype/indexOf": 9,
  "built-ins/Array/prototype/push": 10,
  "built-ins/Array/prototype/pop": 9,
  "built-ins/Array/prototype/join": 9,
  "built-ins/Array/prototype/concat": 8,
  "built-ins/Array/prototype/find": 8,
  "built-ins/Array/prototype/some": 7,
  "built-ins/Array/prototype/every": 7,
  "built-ins/Array/isArray": 9,
  "built-ins/Array": 9, // General Array
  
  // String methods (heavily used)
  "built-ins/String/prototype/charAt": 8,
  "built-ins/String/prototype/indexOf": 9,
  "built-ins/String/prototype/substring": 8,
  "built-ins/String/prototype/slice": 9,
  "built-ins/String/prototype/toLowerCase": 9,
  "built-ins/String/prototype/toUpperCase": 9,
  "built-ins/String/prototype/trim": 9,
  "built-ins/String/prototype/split": 10,
  "built-ins/String/prototype/replace": 9,
  "built-ins/String/prototype/match": 7,
  "built-ins/String": 8, // General String
  
  // Object methods (very important)
  "built-ins/Object/keys": 10,
  "built-ins/Object/values": 8,
  "built-ins/Object/entries": 8,
  "built-ins/Object/assign": 9,
  "built-ins/Object/create": 7,
  "built-ins/Object/defineProperty": 6,
  "built-ins/Object/getOwnPropertyNames": 7,
  "built-ins/Object": 8,
  
  // Math (commonly used)
  "built-ins/Math/floor": 9,
  "built-ins/Math/ceil": 8,
  "built-ins/Math/round": 9,
  "built-ins/Math/abs": 8,
  "built-ins/Math/max": 9,
  "built-ins/Math/min": 9,
  "built-ins/Math/random": 9,
  "built-ins/Math/sqrt": 7,
  "built-ins/Math/pow": 7,
  "built-ins/Math": 8,
  
  // Number methods
  "built-ins/Number/isNaN": 8,
  "built-ins/Number/isFinite": 7,
  "built-ins/Number/parseInt": 8,
  "built-ins/Number/parseFloat": 8,
  "built-ins/Number": 7,
  
  // Boolean
  "built-ins/Boolean": 7,
  
  // Function
  "built-ins/Function/prototype/call": 7,
  "built-ins/Function/prototype/apply": 7,
  "built-ins/Function/prototype/bind": 6,
  "built-ins/Function": 6,
  
  // Error handling (important for stability)
  "built-ins/Error": 8,
  "language/statements/throw": 8,
  "language/statements/try": 9,
  
  // Control flow
  "language/statements/break": 8,
  "language/statements/continue": 7,
  "language/statements/switch": 7,
  
  // Advanced (lower priority for now)
  "language/expressions/class": 5,
  "language/expressions/arrow-function": 6,
  "language/expressions/async-function": 4,
  "built-ins/Promise": 5,
  "built-ins/BigInt": 3,
  "built-ins/Temporal": 1,
};

// Estimated implementation complexity (1=easy, 10=very hard)
const COMPLEXITY_ESTIMATES = {
  // Already mostly working
  "language/types/number": 3,
  "language/types/string": 3,
  "language/types/boolean": 2,
  "language/types/undefined": 1,
  "language/types/null": 1,
  
  // Simple operators
  "language/expressions/addition": 2,
  "language/expressions/subtraction": 2,
  "language/expressions/multiplication": 2,
  "language/expressions/division": 2,
  
  // Simple array methods
  "built-ins/Array/prototype/push": 2,
  "built-ins/Array/prototype/pop": 2,
  "built-ins/Array/prototype/shift": 2,
  "built-ins/Array/prototype/unshift": 2,
  "built-ins/Array/prototype/indexOf": 3,
  "built-ins/Array/prototype/join": 3,
  "built-ins/Array/prototype/slice": 4,
  "built-ins/Array/prototype/concat": 4,
  "built-ins/Array/isArray": 2,
  
  // Callback-based array methods (need proper function handling)
  "built-ins/Array/prototype/map": 5,
  "built-ins/Array/prototype/filter": 5,
  "built-ins/Array/prototype/forEach": 4,
  "built-ins/Array/prototype/reduce": 6,
  "built-ins/Array/prototype/find": 5,
  "built-ins/Array/prototype/some": 5,
  "built-ins/Array/prototype/every": 5,
  
  // String methods (mostly straightforward)
  "built-ins/String/prototype/charAt": 2,
  "built-ins/String/prototype/indexOf": 3,
  "built-ins/String/prototype/substring": 3,
  "built-ins/String/prototype/slice": 3,
  "built-ins/String/prototype/toLowerCase": 2,
  "built-ins/String/prototype/toUpperCase": 2,
  "built-ins/String/prototype/trim": 3,
  "built-ins/String/prototype/split": 5,
  "built-ins/String/prototype/replace": 6,
  "built-ins/String/prototype/match": 7,
  
  // Object methods
  "built-ins/Object/keys": 4,
  "built-ins/Object/values": 4,
  "built-ins/Object/entries": 4,
  "built-ins/Object/assign": 5,
  "built-ins/Object/create": 6,
  "built-ins/Object/defineProperty": 8,
  
  // Math (mostly simple)
  "built-ins/Math": 2,
  
  // Number methods
  "built-ins/Number": 3,
  
  // Complex features
  "language/expressions/class": 9,
  "language/expressions/arrow-function": 7,
  "language/expressions/async-function": 9,
  "built-ins/Promise": 9,
  "built-ins/BigInt": 8,
};

class ImpactAnalyzer {
  constructor() {
    this.results = null;
  }

  loadResults(filename = "test262-results.json") {
    if (!fs.existsSync(filename)) {
      console.error(chalk.red(`❌ Results file not found: ${filename}`));
      console.log(
        chalk.yellow("\nRun 'npm run test262' first to generate results.")
      );
      process.exit(1);
    }
    this.results = JSON.parse(fs.readFileSync(filename, "utf8"));
  }

  getImportanceScore(categoryName) {
    // Try exact match first
    if (REAL_WORLD_IMPORTANCE[categoryName] !== undefined) {
      return REAL_WORLD_IMPORTANCE[categoryName];
    }

    // Try matching parent categories
    const parts = categoryName.split("/");
    for (let i = parts.length - 1; i >= 0; i--) {
      const partial = parts.slice(0, i + 1).join("/");
      if (REAL_WORLD_IMPORTANCE[partial] !== undefined) {
        return REAL_WORLD_IMPORTANCE[partial];
      }
    }

    // Default scoring based on category type
    if (categoryName.startsWith("built-ins/Array")) return 7;
    if (categoryName.startsWith("built-ins/String")) return 7;
    if (categoryName.startsWith("built-ins/Object")) return 6;
    if (categoryName.startsWith("built-ins/Math")) return 6;
    if (categoryName.startsWith("built-ins/Number")) return 5;
    if (categoryName.startsWith("language/expressions")) return 6;
    if (categoryName.startsWith("language/statements")) return 6;
    if (categoryName.startsWith("language/types")) return 7;

    return 5; // Default medium importance
  }

  getComplexityScore(categoryName) {
    // Try exact match
    if (COMPLEXITY_ESTIMATES[categoryName] !== undefined) {
      return COMPLEXITY_ESTIMATES[categoryName];
    }

    // Try matching parent
    const parts = categoryName.split("/");
    for (let i = parts.length - 1; i >= 0; i--) {
      const partial = parts.slice(0, i + 1).join("/");
      if (COMPLEXITY_ESTIMATES[partial] !== undefined) {
        return COMPLEXITY_ESTIMATES[partial];
      }
    }

    // Default complexity based on type
    if (categoryName.includes("prototype/")) return 4; // Methods
    if (categoryName.startsWith("built-ins/")) return 5; // Built-ins
    if (categoryName.startsWith("language/expressions")) return 5;
    if (categoryName.startsWith("language/statements")) return 5;

    return 5; // Default medium complexity
  }

  calculateImpactScore(category) {
    const stats = category.stats;
    const total = stats.passed + stats.failed;
    
    if (total === 0) return 0;

    const passRate = (stats.passed / total) * 100;
    const failureCount = stats.failed;

    // Factors for impact score
    const testCount = total;
    const roomForImprovement = 100 - passRate; // More room = more impact
    const importance = this.getImportanceScore(category.name);
    const complexity = this.getComplexityScore(category.name);

    // Impact formula (higher = better to work on)
    // - Test count matters (more tests = more comprehensive)
    // - Room for improvement matters (50% pass = more opportunity than 90%)
    // - Real-world importance matters (Array.map > obscure feature)
    // - Lower complexity is better (quick wins)
    
    const impactScore =
      (testCount * 0.2) +           // More tests = more impact (0-60 range)
      (roomForImprovement * 0.3) +  // More room = more opportunity (0-30 range)
      (importance * 0.35) +          // Real-world importance (0-3.5 range)
      ((10 - complexity) * 0.15);   // Lower complexity = higher score (0-1.5 range)

    // ROI = Impact per unit of effort
    const roi = impactScore / complexity;

    return {
      impactScore: parseFloat(impactScore.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      importance,
      complexity,
      testCount,
      passRate: parseFloat(passRate.toFixed(1)),
      roomForImprovement: parseFloat(roomForImprovement.toFixed(1)),
    };
  }

  analyzeCategories() {
    if (!this.results) {
      throw new Error("No results loaded. Call loadResults() first.");
    }

    const categories = [];

    for (const [name, stats] of Object.entries(this.results.categories)) {
      const total = stats.passed + stats.failed;
      if (total < 3) continue; // Skip tiny categories

      const impact = this.calculateImpactScore({ name, stats });

      categories.push({
        name,
        ...impact,
        passed: stats.passed,
        failed: stats.failed,
        total,
      });
    }

    return categories;
  }

  printTopPriorities(limit = 20) {
    console.log(chalk.bold.cyan("\n🎯 Feature Priority Analysis\n"));
    console.log(chalk.cyan("═".repeat(100)));

    const categories = this.analyzeCategories();

    // Sort by impact score
    const byImpact = [...categories].sort(
      (a, b) => b.impactScore - a.impactScore
    );

    console.log(
      chalk.bold("\n📊 Top Priorities by Overall Impact (Value × Opportunity):\n")
    );
    console.log(
      chalk.bold(
        "Rank".padEnd(6) +
          "Feature".padEnd(45) +
          "Impact".padStart(8) +
          "ROI".padStart(7) +
          "Tests".padStart(8) +
          "Pass".padStart(7) +
          "Importance".padStart(12) +
          "Complexity".padStart(12)
      )
    );
    console.log(chalk.dim("─".repeat(100)));

    byImpact.slice(0, limit).forEach((cat, i) => {
      const impactColor =
        cat.impactScore > 20
          ? chalk.green
          : cat.impactScore > 15
          ? chalk.yellow
          : chalk.white;
      const roiColor =
        cat.roi > 3 ? chalk.green : cat.roi > 2 ? chalk.yellow : chalk.white;
      const passColor =
        cat.passRate < 30
          ? chalk.red
          : cat.passRate < 70
          ? chalk.yellow
          : chalk.green;

      console.log(
        chalk.bold(`#${(i + 1).toString().padEnd(5)}`) +
          cat.name.substring(0, 44).padEnd(45) +
          impactColor(cat.impactScore.toFixed(1).padStart(8)) +
          roiColor(cat.roi.toFixed(1).padStart(7)) +
          cat.total.toString().padStart(8) +
          passColor(`${cat.passRate}%`.padStart(7)) +
          `${cat.importance}/10`.padStart(12) +
          `${cat.complexity}/10`.padStart(12)
      );
    });

    // Quick wins (high ROI, low complexity)
    console.log(chalk.bold.green("\n\n🚀 Quick Wins (High ROI, Low Complexity):\n"));
    const quickWins = [...categories]
      .filter((c) => c.complexity <= 4 && c.roi > 2)
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10);

    quickWins.forEach((cat, i) => {
      console.log(
        chalk.green(`${i + 1}. ${cat.name}`) +
          chalk.dim(
            ` - ROI: ${cat.roi} | ${cat.failed} failing tests | ${cat.complexity}/10 complexity`
          )
      );
    });

    // High impact (regardless of complexity)
    console.log(chalk.bold.yellow("\n\n⭐ High Impact Features (Worth the Effort):\n"));
    const highImpact = [...categories]
      .filter((c) => c.impactScore > 15 && c.passRate < 80)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 10);

    highImpact.forEach((cat, i) => {
      console.log(
        chalk.yellow(`${i + 1}. ${cat.name}`) +
          chalk.dim(
            ` - Impact: ${cat.impactScore} | ${cat.importance}/10 importance | ${cat.passRate}% pass`
          )
      );
    });

    // Low hanging fruit (bad pass rate but easy)
    console.log(
      chalk.bold.cyan("\n\n🍎 Low Hanging Fruit (Easy Fixes with Decent Impact):\n")
    );
    const lowHanging = [...categories]
      .filter((c) => c.complexity <= 3 && c.passRate < 50 && c.total >= 5)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 10);

    lowHanging.forEach((cat, i) => {
      console.log(
        chalk.cyan(`${i + 1}. ${cat.name}`) +
          chalk.dim(
            ` - ${cat.passRate}% pass | ${cat.failed} failures | ${cat.complexity}/10 complexity`
          )
      );
    });

    console.log(chalk.cyan("\n" + "═".repeat(100)));
    console.log(
      chalk.dim(
        "\nImpact Score = f(test count, improvement room, real-world importance, complexity)"
      )
    );
    console.log(
      chalk.dim("ROI = Impact / Complexity (higher = better value for effort)")
    );
    console.log(
      chalk.dim(
        "Importance = How frequently this feature is used in real-world code (1-10)"
      )
    );
    console.log(
      chalk.dim("Complexity = Estimated implementation difficulty (1-10)\n")
    );
  }

  printGroupRecommendations() {
    console.log(chalk.bold.magenta("\n📦 Test Group Recommendations\n"));
    console.log(chalk.magenta("═".repeat(80)));

    const categories = this.analyzeCategories();

    // Group by top-level category
    const grouped = {};
    categories.forEach((cat) => {
      const topLevel = cat.name.split("/").slice(0, 2).join("/");
      if (!grouped[topLevel]) {
        grouped[topLevel] = [];
      }
      grouped[topLevel].push(cat);
    });

    // Calculate average impact per group
    const groupStats = Object.entries(grouped)
      .map(([name, cats]) => ({
        name,
        avgImpact:
          cats.reduce((sum, c) => sum + c.impactScore, 0) / cats.length,
        avgROI: cats.reduce((sum, c) => sum + c.roi, 0) / cats.length,
        totalTests: cats.reduce((sum, c) => sum + c.total, 0),
        avgPassRate:
          cats.reduce((sum, c) => sum + c.passRate, 0) / cats.length,
        categories: cats.length,
      }))
      .sort((a, b) => b.avgImpact - a.avgImpact);

    console.log(
      chalk.bold(
        "Focus Area".padEnd(35) +
          "Avg Impact".padStart(12) +
          "Avg ROI".padStart(10) +
          "Tests".padStart(10) +
          "Pass Rate".padStart(12)
      )
    );
    console.log(chalk.dim("─".repeat(80)));

    groupStats.slice(0, 10).forEach((group) => {
      const impactColor =
        group.avgImpact > 15
          ? chalk.green
          : group.avgImpact > 10
          ? chalk.yellow
          : chalk.white;

      console.log(
        group.name.padEnd(35) +
          impactColor(group.avgImpact.toFixed(1).padStart(12)) +
          group.avgROI.toFixed(1).padStart(10) +
          group.totalTests.toString().padStart(10) +
          `${group.avgPassRate.toFixed(1)}%`.padStart(12)
      );
    });

    console.log(chalk.magenta("\n" + "═".repeat(80) + "\n"));
  }

  saveReport(filename = "test262-impact-report.json") {
    const categories = this.analyzeCategories();

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCategories: categories.length,
        avgImpactScore:
          categories.reduce((sum, c) => sum + c.impactScore, 0) /
          categories.length,
      },
      topPriorities: categories
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 20),
      quickWins: categories
        .filter((c) => c.complexity <= 4 && c.roi > 2)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 10),
      highImpact: categories
        .filter((c) => c.impactScore > 15)
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 10),
      allCategories: categories,
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n💾 Detailed report saved to: ${filename}\n`));
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const resultsFile = args[0] || "test262-results.json";

  const analyzer = new ImpactAnalyzer();
  analyzer.loadResults(resultsFile);
  analyzer.printTopPriorities(20);
  analyzer.printGroupRecommendations();
  analyzer.saveReport();
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error.message);
  process.exit(1);
});
