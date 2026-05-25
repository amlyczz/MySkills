# Spec: Prompt Skills Standardization

## Problem
All LLM prompts (13 total across 5 infrastructure files) are hardcoded as Python string constants. This makes them:
- Hard to iterate on (requires code changes)
- Not portable (can't reuse in other projects)
- Not usable by Claude Code as skills

## Solution
Restructure prompts into standard Anthropic skill packages following the skill-creator specification.

### Skill Directory Structure (per Anthropic standard)
```
skill-name/
├── SKILL.md              # YAML frontmatter (name, description) + markdown instructions
└── references/           # Prompt templates loaded as needed
    ├── system-prompt.md
    └── user-prompt.md
```

### Skills Created

| Skill | Source Prompts | Purpose | Status |
|-------|---------------|---------|--------|
| `repo-analyzer` | `ANALYZE_REPO_SYSTEM/USER_PROMPT` | Repository analysis → ContentModel | Done |
| `script-composer` | `COMPOSE_SCRIPT_SYSTEM/USER_PROMPT` | ContentModel → narration Script | Done |
| `qa-evaluator` | `QA_SCRIPT_*, QA_BLUEPRINT_*` | Score + feedback for scripts/blueprints | Done |
| `visual-blueprint` | `STEP1_*, STEP2_*` + `template-catalog.md` | Script → layered visual Blueprint | Done |
| `domain-analysis` | `ANALYZE_DOMAIN_SYSTEM/USER` | Architecture pattern + audience + narrative angle | Done |

### Python Changes
1. Created `prompt_loader.py` utility that loads prompt templates from skill reference files
2. Updated all 6 infrastructure adapters to use `prompt_loader` instead of hardcoded strings
3. Skill path resolved relative to `video-pipeline/` project root

### Acceptance Criteria
- [x] All prompts externalized to `.md` files in skill `references/` dirs
- [x] Each skill has a valid `SKILL.md` with YAML frontmatter
- [x] Python code loads all prompts from external files (zero hardcoded prompt strings)
- [x] Skills are self-contained (can be copied to another project)
- [x] Existing tests pass without changes to test logic

---

# Spec: P2-C1 Deep Research Enhancement

## Problem
Only README + basic metadata collected. No code reading, dependency analysis, or deep source inspection.

## Solution
Enhanced `GitHubMaterialCollector` with:
1. `_fetch_core_source_files()` — reads up to 5 entry point files (src/index.*, src/main.*, etc.)
2. `_fetch_dependency_summary()` — parses package.json/pyproject.toml/go.mod/Cargo.toml for frameworks and key deps
3. Updated `_build_enriched_input()` — includes core source files + dependency stack in LLM input

### Acceptance Criteria
- [x] Core source files fetched and included in analysis input
- [x] Dependencies parsed and summarized
- [x] Tests pass

---

# Spec: P2-B2 Blueprint QA Truncation Fix

## Problem
Blueprint JSON > 10k chars truncated, QA only evaluates first 1-2 scenes.

## Solution
Two-pass evaluation:
1. **Pass 1 — Structure Overview**: Compact markdown summary of all scenes (types, durations, element counts, animation counts). Always fits in context.
2. **Pass 2 — Spot Check**: If Pass 1 score >= 50, sample top 3 scenes for full JSON evaluation.
3. **Final Score**: 40% overview + 60% spot-check average.

### Acceptance Criteria
- [x] No brutal truncation of Blueprint JSON
- [x] QA evaluates ALL scenes via structure overview
- [x] Detailed element-level check on sampled scenes
- [x] Tests pass

---

# Spec: P3 Domain Analysis + Audience Model

## Problem
No audience modeling, no narrative angle selection, no architecture pattern recognition.

## Solution
1. Created `domain-analysis` skill with LLM-driven analysis
2. Added `DomainAnalysis` entity (AudienceProfile + NarrativeAngle + InformationHierarchy)
3. Added `analyze_domain()` to RepoAnalyzer interface and LLMRepoAnalyzer
4. Wired into `AnalyzeRepoUseCase` — produces domain_analysis in pipeline state
5. Blueprint composer consumes domain_analysis for template-informed generation

### Acceptance Criteria
- [x] DomainAnalysis entity with audience profile + narrative angle
- [x] domain-analysis skill with externalized prompts
- [x] analyze_domain() wired into pipeline
- [x] Blueprint Step 1 uses domain analysis for template selection
- [x] Tests pass

---

# Spec: P3 Visual Template Selection

## Problem
No template selection mechanism — LLM generates visual style from scratch every time.

## Solution
1. Created `template-catalog.md` with 8 visual templates (dark-neon, fluid-aurora, light-beam, glassmorphism, neon-blue, gradient-sunset, minimal-mono, sakura-pink)
2. Each template defines: best_for, mood, colors, animation_style, scene_types
3. Selection rules based on project type, audience, narrative angle, technical depth
4. Updated Step 1 system prompt to select template before scene generation
5. Updated Step 1 user prompt to include domain analysis context

### Acceptance Criteria
- [x] Template catalog with 8 templates and selection rules
- [x] Step 1 prompt references template selection
- [x] Domain analysis fields flow into skeleton generation
- [x] Tests pass

---

# Spec: P3-C2+C3 Fact-Checking Mechanism

## Problem
QA Script's "Technical Accuracy" dimension only checks internal consistency. It cannot verify claims against actual repo content — LLM may hallucinate architecture descriptions, framework names, or feature claims.

## Solution
Inject source materials into the QA evaluation prompt so the evaluator can cross-reference technical claims against actual evidence. No extra LLM call needed.

### Changes:
1. Created `fact-checker` skill with fact-checking protocol instructions
2. Updated `qa-evaluator/references/script-qa-system.md` — added Fact-Checking Protocol section
3. Updated `qa-evaluator/references/script-qa-user.md` — added `{source_context}` placeholder
4. Updated `ScriptEvaluator` interface — `evaluate_script()` now accepts `source_context: Optional[str]`
5. Updated `LLMScriptEvaluator` — passes source_context to prompt template
6. Updated `QAScriptUseCase` — builds source context from ContentModel + MaterialManifest in state

### Acceptance Criteria
- [x] Source materials injected into QA Script evaluation
- [x] Fact-checking protocol in QA system prompt
- [x] Claim verification against README, directory structure, dependencies, source code
- [x] Zero extra LLM calls (enriched existing QA call)
- [x] Tests pass
