from typing import Literal

BackgroundType = Literal[
    "fluid-aurora", "dark-neon", "light-beam", "tech-overlay",
    "aurora-bg", "fluid-background", "noise-background",
    "dot-grid-bg", "none",
]

SceneType = Literal[
    "generic",
    "intro", "centered-statement", "split-data-chart",
    "split-ui-mockup", "scrolling-graphic", "outro",
]

ComponentType = Literal[
    "browser-mockup", "device-frame", "split-layout", "center-layout",
    "pricing-stack", "floating-card", "coverflow-carousel", "horizontal-carousel",
    "layered-element", "pop-up-book-base", "icon-grid", "split-media",
    "search-bar", "ai-summary-box", "pricing-card", "geometric-card",
    "data-bar-chart", "animated-bar", "video-card", "product-card",
    "agent-card", "ui-card", "minimal-card", "mock-ui-card",
    "experiment-card", "cover-card", "album-card",
    "mobile-list-item", "mobile-nav-bar", "mobile-status-bar",
    "filter-pills", "progress-ring", "title", "cta-button",
    "stat-card", "quote-card", "callout-box", "step-indicator",
    "comparison-table", "code-block", "key-point", "chapter-title",
    "gradient-text", "luxury-card", "reveal-mask", "stagger-reveal",
    "glass-panel", "glass-card",
    "chip-card", "branch-flow", "animated-counter",
    "animated-text", "text-block", "word-swap-headline", "typewriter",
    "prompt-input", "typing-input", "subtitle-overlay", "lower-third",
    "cursor", "decoration-overlay", "dot-grid-bg", "graphic-overlay",
    "organic-blob", "realistic-sphere", "generating-pill",
    "connection-line", "scene-canvas", "diagonal-wipe-transition",
    "badge", "ken-burns", "cinematic-bars", "mesh-gradient-bg",
    "film-grain",
    "radial-glow", "particle-field", "icon-badge",
    "blur-fade-text", "glow-bar-chart",
    "typing-message", "canvas-gradient-bg",
    "text", "image", "video", "shape", "div", "lottie",
]

AnimationType = Literal[
    "none", "fade-in", "fade-out", "fade-up", "fade-down",
    "scale-in", "scale-bounce",
    "slide-left", "slide-right", "slide-up", "slide-down",
    "bar-grow", "typewriter",
    "reveal", "stamp-drop", "brush-strike", "blur-in",
]

TransitionType = Literal[
    "none", "crossfade", "soft-replace", "spatial-shift",
    "stack-pop", "diagonal-wipe",
]

PositionType = Literal["absolute", "relative", "flex-child"]
