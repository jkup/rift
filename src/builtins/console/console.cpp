#include "console.h"

namespace rift::builtins {

std::shared_ptr<JSObject> Console::create() {
    auto console = std::make_shared<JSObject>();

    // Add console methods
    console->setProperty("log", Value(std::make_shared<JSFunction>(log)));
    console->setProperty("error", Value(std::make_shared<JSFunction>(error)));
    console->setProperty("warn", Value(std::make_shared<JSFunction>(warn)));
    console->setProperty("info", Value(std::make_shared<JSFunction>(info)));

    return console;
}

Value Console::log(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::error(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::warn(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

Value Console::info(const std::vector<Value>& args) {
    printValues(args, std::cout);
    return Value::undefined();
}

void Console::printValues(const std::vector<Value>& args, std::ostream& stream) {
    for (size_t i = 0; i < args.size(); ++i) {
        if (i > 0) {
            stream << " ";
        }
        stream << args[i].toString();
    }
    stream << std::endl;
}

}  // namespace rift::builtins