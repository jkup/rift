#pragma once

#include <memory>
#include <string>
#include <tuple>
#include <vector>

#include "rift/execution/environment.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/types/value.h"

namespace rift::runtime {
class JSFunction;
class JSObject;
}  // namespace rift::runtime

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

class Rift;

/**
 * ClassBuilder
 *
 * Shared logic for building JavaScript classes from AST nodes.
 * Used by both evaluateClassDeclaration (StatementEvaluator) and
 * evaluateClassExpression (ExpressionEvaluator).
 */
class ClassBuilder {
  public:
    /**
     * Build a fully-constructed class constructor from AST nodes.
     *
     * @param class_name The class name (may be empty for anonymous class expressions)
     * @param superclass_node AST node for the extends clause (nullptr if none)
     * @param class_body AST node for the class body
     * @param env The enclosing environment
     * @param engine The Rift engine
     * @param is_declaration If true, class name is always bound in class env;
     *                       if false, only bound when non-empty (expression semantics)
     * @return The constructed class constructor function
     */
    static JSFunction* buildClass(const std::string& class_name,
                                  std::shared_ptr<ASTNode> superclass_node,
                                  std::shared_ptr<ASTNode> class_body,
                                  std::shared_ptr<Environment> env, Rift* engine,
                                  bool is_declaration);

  private:
    using ParamInfo = std::vector<
        std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>;

    struct ClassifiedMethods {
        std::shared_ptr<ASTNode> constructor_method;
        std::vector<std::shared_ptr<ASTNode>> instance_methods;
        std::vector<std::shared_ptr<ASTNode>> static_methods;
    };

    /** Categorize AST children into constructor, instance, and static methods. */
    static ClassifiedMethods classifyMethods(const std::shared_ptr<ASTNode>& class_body);

    /** Extract parameter tuples from an AST params node. */
    static ParamInfo extractParamInfo(const std::shared_ptr<ASTNode>& params_node);

    /**
     * Create method functions and attach them to a target object.
     *
     * @param methods The method AST nodes to process
     * @param target The object to attach methods to (prototype or constructor)
     * @param class_env The class-scoped environment
     * @param class_prototype The class prototype object (for HomeObject binding)
     * @param parent_prototype The parent prototype (for SuperPrototype binding, may be null)
     * @param engine The Rift engine
     * @param is_instance If true, bind HomeObject/SuperPrototype and setHomeObject
     */
    static void addMethods(const std::vector<std::shared_ptr<ASTNode>>& methods, JSObject* target,
                           std::shared_ptr<Environment> class_env, JSObject* class_prototype,
                           JSObject* parent_prototype, Rift* engine, bool is_instance);
};

}  // namespace rift::core
