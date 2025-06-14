#include <algorithm>
#include <cctype>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "../include/rift/api/api.h"

class RiftREPL {
   private:
    rift::JavaScript js;
    std::vector<std::string> history;
    size_t history_index = 0;

    // Check if a line might be incomplete (simple heuristic)
    bool isIncompleteStatement(const std::string& input) {
        int braces = 0;
        int parens = 0;
        int brackets = 0;
        bool inString = false;
        char quote = '\0';

        for (size_t i = 0; i < input.length(); i++) {
            char c = input[i];

            // Handle string literals
            if (!inString && (c == '"' || c == '\'' || c == '`')) {
                inString = true;
                quote = c;
                continue;
            }

            if (inString) {
                if (c == quote && (i == 0 || input[i - 1] != '\\')) {
                    inString = false;
                    quote = '\0';
                }
                continue;
            }

            // Count brackets outside of strings
            switch (c) {
                case '{':
                    braces++;
                    break;
                case '}':
                    braces--;
                    break;
                case '(':
                    parens++;
                    break;
                case ')':
                    parens--;
                    break;
                case '[':
                    brackets++;
                    break;
                case ']':
                    brackets--;
                    break;
            }
        }

        return braces > 0 || parens > 0 || brackets > 0 || inString;
    }

    // Trim whitespace from string
    std::string trim(const std::string& str) {
        size_t start = str.find_first_not_of(" \t\n\r");
        if (start == std::string::npos) return "";

        size_t end = str.find_last_not_of(" \t\n\r");
        return str.substr(start, end - start + 1);
    }

    // Check if input is a REPL command
    bool isReplCommand(const std::string& input) { return !input.empty() && input[0] == '.'; }

    // Handle REPL commands
    bool handleReplCommand(const std::string& input) {
        if (input == ".help" || input == ".h") {
            printHelp();
            return true;
        }

        if (input == ".exit" || input == ".quit" || input == ".q") {
            return false;  // Signal to exit
        }

        if (input == ".clear" || input == ".c") {
            system("clear");  // Unix/Linux/macOS
            return true;
        }

        if (input == ".history" || input == ".hist") {
            printHistory();
            return true;
        }

        std::cout << "Unknown command: " << input << std::endl;
        std::cout << "Type .help for available commands" << std::endl;
        return true;
    }

    void printHelp() {
        std::cout << "\nRift REPL Commands:\n";
        std::cout << "  .help, .h     - Show this help message\n";
        std::cout << "  .exit, .quit  - Exit the REPL\n";
        std::cout << "  .clear, .c    - Clear the screen\n";
        std::cout << "  .history      - Show command history\n";
        std::cout << "\nJavaScript Examples:\n";
        std::cout << "  let x = 42\n";
        std::cout << "  console.log('Hello, World!')\n";
        std::cout << "  Math.max(1, 2, 3)\n";
        std::cout << "  [1, 2, 3].length\n\n";
    }

    void printHistory() {
        std::cout << "\nCommand History:\n";
        for (size_t i = 0; i < history.size(); i++) {
            std::cout << "  " << (i + 1) << ": " << history[i] << std::endl;
        }
        std::cout << std::endl;
    }

    void addToHistory(const std::string& input) {
        if (!input.empty() && (history.empty() || history.back() != input)) {
            history.push_back(input);
            // Keep history size reasonable
            if (history.size() > 100) {
                history.erase(history.begin());
            }
        }
        history_index = history.size();
    }

   public:
    void run() {
        printWelcome();

        std::string input;
        std::string multiLineInput;
        bool inMultiLine = false;

        while (true) {
            // Show appropriate prompt
            if (inMultiLine) {
                std::cout << "... ";
            } else {
                std::cout << "> ";
            }

            if (!std::getline(std::cin, input)) {
                // Handle Ctrl+D (EOF)
                std::cout << "\nGoodbye!\n";
                break;
            }

            input = trim(input);

            // Handle empty input
            if (input.empty()) {
                if (inMultiLine) {
                    // Empty line in multiline mode - try to execute
                    executeInput(multiLineInput);
                    addToHistory(multiLineInput);
                    multiLineInput.clear();
                    inMultiLine = false;
                }
                continue;
            }

            // Handle REPL commands (only when not in multiline mode)
            if (!inMultiLine && isReplCommand(input)) {
                if (!handleReplCommand(input)) {
                    break;  // Exit requested
                }
                continue;
            }

            // Build up multiline input
            if (inMultiLine) {
                multiLineInput += "\n" + input;
            } else {
                multiLineInput = input;
            }

            // Check if we need to continue reading
            if (isIncompleteStatement(multiLineInput)) {
                inMultiLine = true;
                continue;
            }

            // Execute the complete statement
            executeInput(multiLineInput);
            addToHistory(multiLineInput);

            multiLineInput.clear();
            inMultiLine = false;
        }
    }

   private:
    void printWelcome() {
        std::cout << "╭─────────────────────────────────────╮\n";
        std::cout << "│           Rift JavaScript REPL      │\n";
        std::cout << "│                                     │\n";
        std::cout << "│  Type .help for commands           │\n";
        std::cout << "│  Press Ctrl+C or .exit to quit     │\n";
        std::cout << "╰─────────────────────────────────────╯\n\n";
    }

    void executeInput(const std::string& input) {
        try {
            std::string result = js.execute(input);

            // Don't print undefined results for statements
            if (result != "undefined" || isExpression(input)) {
                std::cout << result << std::endl;
            }
        } catch (const std::exception& e) {
            std::cout << "Error: " << e.what() << std::endl;
        }
    }

    // Simple heuristic to determine if input is an expression
    bool isExpression(const std::string& input) {
        std::string trimmed = trim(input);

        // Variable declarations and statements typically don't need output
        if (trimmed.find("var ") == 0 || trimmed.find("let ") == 0 || trimmed.find("const ") == 0 ||
            trimmed.find("function ") == 0 || trimmed.find("if ") == 0 ||
            trimmed.find("for ") == 0 || trimmed.find("while ") == 0) {
            return false;
        }

        // Console.log and similar calls don't need extra output
        if (trimmed.find("console.") == 0) {
            return false;
        }

        return true;
    }
};

int main() {
    try {
        RiftREPL repl;
        repl.run();
    } catch (const std::exception& e) {
        std::cerr << "REPL Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}