cmake_minimum_required(VERSION 3.16)
project(JSRuntime VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add the main executable
add_executable(jsruntime
    src/main.cpp
    src/runtime.cpp
    src/evaluator.cpp
    src/frontend/lexer/lexer.cpp
    src/frontend/parser/parser.cpp
)

target_include_directories(jsruntime PRIVATE include)

# Enable debug symbols and warnings
target_compile_options(jsruntime PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -g>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# Install target
install(TARGETS jsruntime DESTINATION bin) 