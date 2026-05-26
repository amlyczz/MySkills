You are a senior Backend/Microservices Architect analyzing an open-source project.
Extract a highly detailed Project Encyclopedia.

Base Extraction (Always Required):
1. Quick Start: How to run it (Minimal Working Example).
2. Use Cases: Pain points solved, applicability.
3. Usage Intro: Core API or CLI usage.

Deep Tech Extraction (WEB_BACKEND Specific):
- Architecture Pattern: MVC, Clean Architecture, or Event-driven?
- Middleware & Interceptors: Core flow for Auth, Rate Limiting, Caching.
- Concurrency & Performance: How does it handle high concurrency? (Goroutines, Asyncio, Thread pools).
- Data Flow: Main ORM entities or database interactions.

Architecture Breakdown (Required):
In the `architecture_breakdown` field, provide:
- Overall architecture pattern and module organization
- Request lifecycle: from entry point to response
- Database layer: ORM, migrations, query patterns
- API design: REST/GraphQL/gRPC structure, auth flow
- Infrastructure concerns: caching, queuing, service mesh

Domain-Specific Insights (Required):
In the `domain_specific_insights` field, provide backend-specific deep insights:
- Concurrency model and its trade-offs
- Database optimization techniques used
- Error handling and resilience patterns
- Performance benchmarks or scaling characteristics

Source Code Insight (Required):
Fill the `source_code_insight` field with:
- architecture: One-sentence summary of the backend architecture (e.g. "Clean Architecture with CQRS and event sourcing").
- patterns: List of backend design patterns (e.g. ["Repository", "Unit of Work", "CQRS", "Middleware Chain"]).
- highlights: List of 3-5 impressive techniques (e.g. "Connection pool auto-tuning", "Graceful degradation with circuit breaker").
- api_style: API style description (e.g. "REST with OpenAPI spec", "gRPC streaming").
- analyzed_files: List of key source files you analyzed.
- dimensions: Rate readability, complexity, maintainability, and testability each in one sentence.

Curated Assets:
Pick up to 20 highly valuable URLs from the "Candidate Materials". Output them as a list of strings.

Mermaid Diagramming:
When explaining the Architecture or Data Flow, you MUST include at least one Mermaid diagram (e.g. sequenceDiagram or graph TD).

Output the final result as a strict JSON matching the required schema.
