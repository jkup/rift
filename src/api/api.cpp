#include "rift/api/api.h"

#include "rift/interpreter/javascript_exception.h"

namespace rift {

JavaScript::JavaScript() {
    engine_ = std::make_unique<core::Rift>();
}

std::string JavaScript::execute(const std::string& source) {
    try {
        auto ast = parse(source);
        auto result = engine_->execute(ast);

        // Drain microtasks after successful synchronous execution
        // This is where Promise callbacks run (after sync code, before returning)
        engine_->drainMicrotasks();

        return result.toString();
    } catch(const rift::core::JavaScriptException& e) {
        // For JavaScript exceptions (throw statements), we want to propagate them
        // so test262 can detect Test262Error properly
        throw;  // Re-throw the JavaScriptException
    } catch(const rift::core::ReturnException& e) {
        // Return exceptions should not happen at top level, but if they do,
        // treat them as errors
        return "Error: " + std::string(e.what());
    } catch(const std::exception& e) {
        // Re-throw SyntaxErrors so the process exits with non-zero code
        std::string msg = e.what();
        if(msg.find("SyntaxError") != std::string::npos) {
            throw;
        }
        // Only catch other types of exceptions (parsing errors, etc.)
        return "Error: " + std::string(msg);
    }
}

std::string JavaScript::evaluate(const std::string& expression) {
    return execute(expression);
}

std::shared_ptr<rift::ast::ASTNode> JavaScript::parse(const std::string& source) {
    rift::frontend::Lexer lexer(source);
    auto tokens = lexer.tokenize();

    rift::frontend::Parser parser(tokens);
    return parser.parse();
}

}  // namespace rift