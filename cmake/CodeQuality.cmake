# CodeQuality.cmake - Comprehensive code quality tools for Rift
# This file provides functions to integrate various code quality tools

# Function to find and configure clang-tidy
function(enable_clang_tidy)
    find_program(CLANG_TIDY_PROGRAM clang-tidy)
    if(CLANG_TIDY_PROGRAM)
        message(STATUS "Found clang-tidy: ${CLANG_TIDY_PROGRAM}")
        set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY_PROGRAM};-checks=*,-fuchsia-*,-google-readability-todo,-readability-magic-numbers,-cppcoreguidelines-avoid-magic-numbers,-llvm-header-guard,-google-runtime-references,-modernize-use-trailing-return-type" PARENT_SCOPE)
        
        # Create a target for running clang-tidy on all sources
        file(GLOB_RECURSE ALL_CXX_SOURCE_FILES 
             ${CMAKE_SOURCE_DIR}/src/*.cpp
             ${CMAKE_SOURCE_DIR}/src/*.h
             ${CMAKE_SOURCE_DIR}/include/*.h)
        
        add_custom_target(clang-tidy
            COMMAND ${CLANG_TIDY_PROGRAM}
            -p ${CMAKE_BINARY_DIR}
            ${ALL_CXX_SOURCE_FILES}
            COMMENT "Running clang-tidy static analysis"
            VERBATIM)
    else()
        message(WARNING "clang-tidy not found. Install with: brew install llvm (macOS) or apt-get install clang-tidy (Ubuntu)")
    endif()
endfunction()

# Function to find and configure cppcheck
function(enable_cppcheck)
    find_program(CPPCHECK_PROGRAM cppcheck)
    if(CPPCHECK_PROGRAM)
        message(STATUS "Found cppcheck: ${CPPCHECK_PROGRAM}")
        
        add_custom_target(cppcheck
            COMMAND ${CPPCHECK_PROGRAM}
            --enable=all
            --std=c++17
            --language=c++
            --suppress=missingInclude
            --suppress=unusedFunction
            --suppress=unmatchedSuppression
            --inline-suppr
            --template=gcc
            --project=${CMAKE_BINARY_DIR}/compile_commands.json
            --error-exitcode=1
            ${CMAKE_SOURCE_DIR}/src
            ${CMAKE_SOURCE_DIR}/include
            COMMENT "Running cppcheck static analysis"
            VERBATIM)
    else()
        message(WARNING "cppcheck not found. Install with: brew install cppcheck (macOS) or apt-get install cppcheck (Ubuntu)")
    endif()
endfunction()

# Function to enable compile_commands.json generation
function(enable_compile_commands)
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON PARENT_SCOPE)
    message(STATUS "Enabled compile_commands.json generation")
endfunction()

# Function to add sanitizers
function(enable_sanitizers)
    option(ENABLE_SANITIZERS "Enable AddressSanitizer and UBSan" OFF)
    
    if(ENABLE_SANITIZERS)
        message(STATUS "Enabling AddressSanitizer and UBSan")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address -fsanitize=undefined -fno-sanitize-recover=all -fno-omit-frame-pointer" PARENT_SCOPE)
        set(CMAKE_LINKER_FLAGS "${CMAKE_LINKER_FLAGS} -fsanitize=address -fsanitize=undefined" PARENT_SCOPE)
    endif()
endfunction()

# Function to add compiler warnings
function(enable_warnings)
    if(MSVC)
        add_compile_options(/W4 /WX)
    else()
        add_compile_options(
            -Wall
            -Wextra
            -Wpedantic
            -Wconversion
            -Wsign-conversion
            -Wcast-qual
            -Wformat=2
            -Wundef
            -Werror=return-type
            -Werror=uninitialized
            -Wno-unused-parameter
        )
    endif()
    message(STATUS "Enabled comprehensive compiler warnings")
endfunction()

# Function to create a format target
function(enable_format_target)
    find_program(CLANG_FORMAT_PROGRAM clang-format)
    if(CLANG_FORMAT_PROGRAM)
        message(STATUS "Found clang-format: ${CLANG_FORMAT_PROGRAM}")
        
        file(GLOB_RECURSE ALL_SOURCE_FILES 
             ${CMAKE_SOURCE_DIR}/src/*.cpp
             ${CMAKE_SOURCE_DIR}/src/*.h
             ${CMAKE_SOURCE_DIR}/include/*.h)
        
        add_custom_target(format
            COMMAND ${CLANG_FORMAT_PROGRAM}
            -i
            -style=file
            ${ALL_SOURCE_FILES}
            COMMENT "Formatting source code with clang-format"
            VERBATIM)
            
        add_custom_target(format-check
            COMMAND ${CLANG_FORMAT_PROGRAM}
            --dry-run
            --Werror
            -style=file
            ${ALL_SOURCE_FILES}
            COMMENT "Checking source code formatting"
            VERBATIM)
    else()
        message(WARNING "clang-format not found. Install with: brew install clang-format (macOS) or apt-get install clang-format (Ubuntu)")
    endif()
endfunction()

# Function to create a comprehensive quality check target
function(create_quality_targets)
    add_custom_target(quality
        COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target format-check
        COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target clang-tidy
        COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR} --target cppcheck
        COMMENT "Running all code quality checks"
        VERBATIM)
endfunction()

# Main function to set up all code quality tools
function(setup_code_quality)
    enable_compile_commands()
    enable_warnings()
    enable_sanitizers()
    enable_clang_tidy()
    enable_cppcheck()
    enable_format_target()
    create_quality_targets()
    
    message(STATUS "Code quality tools configured. Available targets:")
    message(STATUS "  - format: Format all source files")
    message(STATUS "  - format-check: Check formatting without changing files")
    message(STATUS "  - clang-tidy: Run clang-tidy static analysis")
    message(STATUS "  - cppcheck: Run cppcheck static analysis")
    message(STATUS "  - quality: Run all quality checks")
endfunction() 