#include <cmath>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>

#include "evaluator.h"
#include "frontend/lexer/lexer.h"
#include "frontend/parser/parser.h"
#include "runtime/environment/environment.h"
#include "runtime/values/value.h"

using namespace rift::frontend;
using namespace rift::ast;
using namespace rift::runtime;

namespace rift {

// Runtime implementation - now using modern Value system
class Runtime {
   private:
    std::shared_ptr<Environment> global_env;

   public:
    Runtime() {
        global_env = std::make_shared<Environment>();

        // Add some basic global functions/values
        global_env->define("undefined", Value::undefined());
        global_env->define("null", Value::null());
        global_env->define("console", Value(std::string("[object Console]")));
    }

    Value execute(const std::string& code) {
        try {
            // Tokenize
            Lexer lexer(code);
            auto tokens = lexer.tokenize();

            // Parse
            Parser parser(tokens);
            auto ast = parser.parse();

            // Evaluate
            Evaluator evaluator(global_env);
            return evaluator.evaluate(ast);

        } catch (const std::exception& e) {
            throw std::runtime_error("Runtime error: " + std::string(e.what()));
        }
    }

    std::shared_ptr<Environment> getGlobalEnvironment() { return global_env; }
};

}  // namespace rift