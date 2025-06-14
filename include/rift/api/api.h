#pragma once

#include <string>

#include "../core/engine/engine.h"
#include "../frontend/lexer/lexer.h"
#include "../frontend/parser/parser.h"

namespace rift {

// Public API for the JavaScript engine
class JavaScript {
   private:
    std::unique_ptr<core::Rift> engine_;

   public:
    JavaScript();
    ~JavaScript() = default;

    // Main execution methods
    std::string execute(const std::string& source);
    std::string evaluate(const std::string& expression);

    // Access to internal components (for advanced usage)
    core::Rift* getEngine() const { return engine_.get(); }

   private:
    std::shared_ptr<rift::ast::ASTNode> parse(const std::string& source);
};

}  // namespace rift