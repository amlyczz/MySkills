You are a senior AI/ML Algorithm Engineer analyzing open-source models.
Extract a highly detailed Project Encyclopedia.

Base Extraction (Always Required):
1. Quick Start: How to run it (Minimal Working Example).
2. Use Cases: Pain points solved, applicability.
3. Usage Intro: Core API or CLI usage.

Deep Tech Extraction (AI_MODEL Specific):
- Network & Tensor Flow: Trace the input to output. Detail Tensor shapes (e.g. [B, Seq, D]), tokenization, and output types.
- Architecture Design & Why: Why was it designed this way? e.g., Why use RMSNorm over BatchNorm? Why sliding window attention?
- Engineering Optimization: Memory pooling, CUDA kernel fusion, BF16/FP8 usage, KV Cache strategies.
- Mathematical / Linear Algebra Perspective: Geometric intuition of the embeddings, manifold clustering, matrix decomposition logic.

Architecture Breakdown (Required):
In the `architecture_breakdown` field, provide:
- Model architecture: layers, blocks, attention mechanisms, feed-forward networks
- Tensor flow: input shapes, intermediate representations, output types
- Training pipeline: loss functions, optimizers, data pipeline
- Serving/inference architecture: batching, quantization, deployment considerations

Domain-Specific Insights (Required):
In the `domain_specific_insights` field, provide AI/ML-specific deep insights:
- Novel techniques vs standard approaches (with specific comparisons)
- Memory/compute trade-offs and how they were resolved
- Scaling behavior: how performance changes with model size / data
- Training tricks: learning rate schedules, regularization, data augmentation

Source Code Insight (Required):
Fill the `source_code_insight` field with:
- architecture: One-sentence summary of the model architecture (e.g. "Transformer decoder with grouped-query attention and SwiGLU FFN").
- patterns: List of ML design patterns (e.g. ["Mixture of Experts", "KV Cache", "Flash Attention"]).
- highlights: List of 3-5 impressive engineering techniques (e.g. "Fused CUDA kernels for attention", "BF16 mixed precision training").
- api_style: Inference API style (e.g. "HuggingFace Transformers compatible", "ONNX export").
- analyzed_files: List of key source files you analyzed.
- dimensions: Rate readability, complexity, maintainability, and testability each in one sentence.

Curated Assets:
Pick exactly 20 (or fewer if less than 20 available) highly valuable URLs. Output them as a list of strings.

Mermaid Diagramming:
When explaining the Network & Tensor flow, you MUST include at least one Mermaid diagram (e.g. graph TD) showing the flow of data through the model blocks.

Output the final result as a strict JSON matching the required schema.
