#include <fstream>
#include <iostream>
#include <sstream>

#include "rift/api/api.h"
#include "rift/core/engine/javascript_exception.h"

// Temporal verification (temporal_capi Rust FFI)
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/Instant.hpp"
#include "temporal_rs/PlainDate.hpp"

void print_usage(const char* program_name) {
    std::cout << "Usage: " << program_name << " [options] [file]\n";
    std::cout << "Options:\n";
    std::cout << "  -e <code>    Execute code directly\n";
    std::cout << "  -h, --help   Show this help message\n";
    std::cout << "  file         Execute JavaScript file\n";
}

std::string read_file(const std::string& filename) {
    std::ifstream file(filename);
    if(!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

int verify_temporal() {
    std::cout << "Verifying temporal_capi integration...\n";

    // Test 1: Create Instant from epoch milliseconds
    auto instant_result = temporal_rs::Instant::from_epoch_milliseconds(1700000000000LL);
    if(!instant_result.is_ok()) {
        std::cerr << "FAIL: Could not create Instant from epoch milliseconds\n";
        return 1;
    }
    auto instant = std::move(instant_result).ok().value();
    int64_t ms = instant->epoch_milliseconds();
    std::cout << "  Instant.fromEpochMilliseconds(1700000000000) -> epoch_ms = " << ms << "\n";
    if(ms != 1700000000000LL) {
        std::cerr << "FAIL: epoch_milliseconds mismatch\n";
        return 1;
    }

    // Test 2: Create PlainDate
    auto date_result =
        temporal_rs::PlainDate::try_new(2025, 1, 15, temporal_rs::AnyCalendarKind::Iso);
    if(!date_result.is_ok()) {
        std::cerr << "FAIL: Could not create PlainDate(2025, 1, 15)\n";
        return 1;
    }
    auto date = std::move(date_result).ok().value();
    std::cout << "  PlainDate(2025, 1, 15) -> year=" << date->year()
              << " month=" << static_cast<int>(date->month())
              << " day=" << static_cast<int>(date->day()) << "\n";
    if(date->year() != 2025 || date->month() != 1 || date->day() != 15) {
        std::cerr << "FAIL: PlainDate values mismatch\n";
        return 1;
    }

    // Test 3: Create Duration and add to date
    auto dur_result = temporal_rs::Duration::create(0, 0, 0, 30, 0, 0, 0, 0, 0, 0);
    if(!dur_result.is_ok()) {
        std::cerr << "FAIL: Could not create Duration\n";
        return 1;
    }
    auto dur = std::move(dur_result).ok().value();
    auto added_result = date->add(*dur, std::nullopt);
    if(!added_result.is_ok()) {
        std::cerr << "FAIL: Could not add 30 days to PlainDate\n";
        return 1;
    }
    auto added = std::move(added_result).ok().value();
    std::cout << "  PlainDate + 30 days -> year=" << added->year()
              << " month=" << static_cast<int>(added->month())
              << " day=" << static_cast<int>(added->day()) << "\n";
    // 2025-01-15 + 30 days = 2025-02-14
    if(added->year() != 2025 || added->month() != 2 || added->day() != 14) {
        std::cerr << "FAIL: Date arithmetic mismatch\n";
        return 1;
    }

    // Test 4: Parse PlainDate from string
    auto parsed_result = temporal_rs::PlainDate::from_utf8("2024-12-25");
    if(!parsed_result.is_ok()) {
        std::cerr << "FAIL: Could not parse PlainDate from '2024-12-25'\n";
        return 1;
    }
    auto parsed = std::move(parsed_result).ok().value();
    std::cout << "  PlainDate.from('2024-12-25') -> year=" << parsed->year()
              << " month=" << static_cast<int>(parsed->month())
              << " day=" << static_cast<int>(parsed->day()) << "\n";

    std::cout << "All temporal_capi verification tests passed!\n";
    return 0;
}

int main(int argc, char* argv[]) {
    try {
        // Check for temporal verification flag before initializing JS engine
        if(argc >= 2 && std::string(argv[1]) == "--verify-temporal") {
            return verify_temporal();
        }

        rift::JavaScript js;

        if(argc == 1) {
            // Interactive mode (REPL) - for now just show help
            std::cout << "Rift - Minimal JavaScript Runtime\n";
            print_usage(argv[0]);
            return 0;
        }

        std::string code;

        if(argc >= 3 && std::string(argv[1]) == "-e") {
            // Execute code directly
            code = argv[2];
        } else if(argc >= 2) {
            if(std::string(argv[1]) == "-h" || std::string(argv[1]) == "--help") {
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

    } catch(const rift::core::JavaScriptException& e) {
        // Handle JavaScript throw statements - output the thrown value
        std::cout << e.what() << std::endl;
        return 0;  // Don't treat thrown exceptions as system errors
    } catch(const std::exception& e) {
        // Handle other system errors
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}