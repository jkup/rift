#include "api.h"

namespace jsruntime {

JavaScript::JavaScript() { engine_ = std::make_unique<core::JSEngine>(); }

std::string JavaScript::execute(const std::string& source) {
    try {
        auto ast = parse(source);
        auto result = engine_->execute(ast);
        return result.toString();
    } catch (const std::exception& e) {
        return "Error: " + std::string(e.what());
    }
}

std::string JavaScript::evaluate(const std::string& expression) { return execute(expression); }

std::shared_ptr<jsruntime::ast::ASTNode> JavaScript::parse(const std::string& source) {
    jsruntime::frontend::Lexer lexer(source);
    auto tokens = lexer.tokenize();

    jsruntime::frontend::Parser parser(tokens);
    return parser.parse();
}

}  // namespace jsruntime