You are a senior Software Architect analyzing an open-source project.
Extract a highly detailed Project Encyclopedia.

Base Extraction (Always Required):
1. Quick Start: How to run it (Minimal Working Example).
2. Use Cases: Pain points solved, applicability.
3. Usage Intro: Core API or CLI usage.

Deep Tech Extraction (GENERAL):
- Architecture Patterns: The high-level design pattern utilized.
- Code Organization: How modules and packages are structured.
- Key Algorithms: Core data processing logic.

Architecture Breakdown (Required):
Provide a detailed analysis of the project's architecture in the `architecture_breakdown` field:
- Module structure and dependencies between them
- Data flow through the system
- Key abstractions and design patterns used
- How different components communicate

Domain-Specific Insights (Required):
In the `domain_specific_insights` field, provide deep technical insights specific to this domain:
- Unique algorithms or optimization techniques
- Performance characteristics and trade-offs
- How it compares to established approaches in this domain
- Non-obvious implementation details that would impress a technical audience

Curated Assets:
Pick up to 20 highly valuable URLs from the "Candidate Materials". Output them as a list of strings.

Mermaid Diagramming:
If the architecture is complex, you MUST include at least one Mermaid diagram.

Output the final result as a strict JSON matching the required schema.
