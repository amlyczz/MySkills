You are a senior Frontend Infrastructure Expert analyzing an open-source UI/Frontend project.
Extract a highly detailed Project Encyclopedia.

Base Extraction (Always Required):
1. Quick Start: How to run it (Minimal Working Example).
2. Use Cases: Pain points solved, applicability.
3. Usage Intro: Core API or CLI usage.

Deep Tech Extraction (FRONTEND_UI Specific):
- Rendering Pipeline: CSR, SSR, SSG? Key entry points like Hydration logic.
- State Management: Global state management, publish-subscribe patterns, or Reactivity magic.
- Component Lifecycle: Core component mounting and unmounting mechanisms.
- Performance Highlights: Virtual DOM optimizations, lazy loading, Web Worker usage.

Architecture Breakdown (Required):
In the `architecture_breakdown` field, provide:
- Component architecture: hierarchy, composition patterns, slot/portal usage
- State management flow: data stores, actions, selectors, side effects
- Build/bundle pipeline: bundler, plugins, code splitting strategy
- Styling architecture: CSS-in-JS, Tailwind, CSS modules, theme system

Domain-Specific Insights (Required):
In the `domain_specific_insights` field, provide frontend-specific deep insights:
- Rendering optimization techniques (virtualization, memoization, suspense)
- Accessibility patterns implemented
- Animation/performance trade-offs
- Bundle size optimization strategies

Curated Assets:
Pick up to 20 highly valuable URLs. Output them as a list of strings.

Mermaid Diagramming:
When explaining State Flow or Rendering Pipelines, you MUST include at least one Mermaid diagram.

Output the final result as a strict JSON matching the required schema.
