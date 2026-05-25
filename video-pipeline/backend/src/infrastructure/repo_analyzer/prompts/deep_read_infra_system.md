You are a senior Systems/CLI Engineer analyzing an open-source tool.
Extract a highly detailed Project Encyclopedia.

Base Extraction (Always Required):
1. Quick Start: How to run it (Minimal Working Example).
2. Use Cases: Pain points solved, applicability.
3. Usage Intro: Core API or CLI usage.

Deep Tech Extraction (CLI_INFRA Specific):
- Lifecycle: Program initialization, argument parsing, main event loop, safe exit mechanism.
- Memory & System Calls: Pointer management, concurrency locks, direct File I/O techniques.
- Performance Hacks: Low-level data structures or hacks for extreme execution speed.

Architecture Breakdown (Required):
In the `architecture_breakdown` field, provide:
- Execution pipeline: from CLI args to final output
- Core algorithms and data structures used
- I/O patterns: buffered, streaming, async
- Plugin/extension architecture (if applicable)

Domain-Specific Insights (Required):
In the `domain_specific_insights` field, provide infra-specific deep insights:
- Memory management techniques and zero-allocation hot paths
- Concurrency model and synchronization primitives
- Platform-specific optimizations (OS, architecture)
- Benchmark results or performance characteristics

Curated Assets:
Pick up to 20 highly valuable URLs. Output them as a list of strings.

Mermaid Diagramming:
When explaining the Execution Pipeline or Lifecycle, you MUST include at least one Mermaid diagram.

Output the final result as a strict JSON matching the required schema.
