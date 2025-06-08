#include <fstream>
#include <iostream>
#include <sstream>

#include "api/api.h"

void print_usage(const char* program_name) {
    std::cout << "Usage: " << program_name << " [options] [file]\n";
    std::cout << "Options:\n";
    std::cout << "  -e <code>    Execute code directly\n";
    std::cout << "  -h, --help   Show this help message\n";
    std::cout << "  file         Execute JavaScript file\n";
}

std::string read_file(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

int main(int argc, char* argv[]) {
    try {
        jsruntime::JavaScript js;

        if (argc == 1) {
            // Interactive mode (REPL) - for now just show help
            std::cout << "JSRuntime - Minimal JavaScript Runtime\n";
            print_usage(argv[0]);
            return 0;
        }

        std::string code;

        if (argc >= 3 && std::string(argv[1]) == "-e") {
            // Execute code directly
            code = argv[2];
        } else if (argc >= 2) {
            if (std::string(argv[1]) == "-h" || std::string(argv[1]) == "--help") {
                print_usage(argv[0]);
                return 0;
            }
            // Execute file
            code = read_file(argv[1]);
        } else {
            print_usage(argv[0]);
            return 1;
        }

        auto result = js.execute(code);
        std::cout << result << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}