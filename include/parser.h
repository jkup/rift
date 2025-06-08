#pragma once

// Bridge header for backward compatibility
// This header provides the old interface while using the new modular structure

#include "../src/frontend/ast/ast_node.h"
#include "../src/frontend/lexer/lexer.h"
#include "../src/frontend/lexer/token.h"
#include "../src/frontend/parser/parser.h"

namespace jsruntime {

// Re-export types for backward compatibility
using TokenType = frontend::TokenType;
using Token = frontend::Token;
using ASTNodeType = ast::ASTNodeType;
using ASTNode = ast::ASTNode;
using Lexer = frontend::Lexer;
using Parser = frontend::Parser;

}  // namespace jsruntime