#include "api.h"

namespace rift {

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

std::shared_ptr<rift::ast::ASTNode> JavaScript::parse(const std::string& source) {
    rift::frontend::Lexer lexer(source);
    auto tokens = lexer.tokenize();

    rift::frontend::Parser parser(tokens);
    return parser.parse();
}

}  // namespace rift