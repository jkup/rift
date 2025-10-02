cmake_minimum_required(VERSION 3.16)
project(Rift VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable compile_commands.json generation for clang-tidy
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Add cmake modules path
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

# Include code quality tools
include(CodeQuality)
setup_code_quality()

# Define source files organized by module
set(FRONTEND_SOURCES
    src/frontend/lexer/lexer.cpp
    src/frontend/parser/parser.cpp
)

set(RUNTIME_SOURCES
    src/runtime/values/value.cpp
    src/runtime/values/object.cpp
    src/runtime/environment/environment.cpp
)

set(MEMORY_SOURCES
    src/memory/mark_sweep_gc.cpp
    src/memory/object_manager.cpp
    src/memory/gc_environment.cpp
    src/memory/gc_protector.cpp
)

set(BUILTINS_SOURCES
    src/builtins/console/console.cpp
    src/builtins/math/math.cpp
    src/builtins/json/json.cpp
    src/builtins/global/global.cpp
    src/builtins/string/string.cpp
    src/builtins/array/array.cpp
    src/builtins/object/object.cpp
    src/builtins/boolean/boolean.cpp
    src/builtins/error/error.cpp
)

set(CORE_SOURCES
    src/core/engine/engine.cpp
    src/core/engine/builtin_manager.cpp
    src/core/engine/statement_evaluator.cpp
    src/core/engine/expression_evaluator.cpp
    src/core/engine/operation_handler.cpp
)

set(API_SOURCES
    src/api/api.cpp
)

# Add the main executable
add_executable(rift
    src/main.cpp
    ${FRONTEND_SOURCES}
    ${RUNTIME_SOURCES}
    ${MEMORY_SOURCES}
    ${BUILTINS_SOURCES}
    ${CORE_SOURCES}
    ${API_SOURCES}
    ${LEGACY_SOURCES}
)

target_include_directories(rift PRIVATE include src)

# Enable debug symbols and warnings
target_compile_options(rift PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -g>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# Add GC debugging support (uncomment to enable GC debug output)
# target_compile_definitions(rift PRIVATE DEBUG_GC)

# Install target
install(TARGETS rift DESTINATION bin) 