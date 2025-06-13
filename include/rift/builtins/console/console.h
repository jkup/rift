#pragma once

#include <iostream>

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

// Console built-in
class Console {
   public:
    // Create console object with all methods
    static std::shared_ptr<JSObject> create();

   private:
    // Console methods
    static Value log(const std::vector<Value>& args);
    static Value error(const std::vector<Value>& args);
    static Value warn(const std::vector<Value>& args);
    static Value info(const std::vector<Value>& args);

    // Helper for output
    static void printValues(const std::vector<Value>& args, std::ostream& stream);
};

}  // namespace rift::builtins