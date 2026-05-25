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
    "browser-mockup", "iphone-frame", "split-layout", "center-layout",
    "pricing-stack", "floating-card", "coverflow-carousel", "horizontal-carousel",
    "layered-element", "pop-up-book-base", "icon-grid", "split-media",
    "search-bar", "ai-summary-box", "pricing-card", "memphis-card",
    "data-bar-chart", "animated-bar", "video-card", "product-card",
    "agent-card", "ui-card", "minimal-card", "mock-ui-card",
    "experiment-card", "flow-music-card", "album-card",
    "ios-list-item", "ios-nav-bar", "ios-status-bar",
    "filter-pills", "progress-ring", "title", "cta-button",
    "stat-card", "quote-card", "callout-box", "step-indicator",
    "comparison-table", "code-block", "key-point", "chapter-title",
    "gradient-text", "luxury-card", "reveal-mask", "stagger-reveal",
    "glass-panel",
    "animated-text", "text-block", "word-swap-headline", "typewriter",
    "prompt-input", "typing-input", "subtitle-overlay", "lower-third",
    "number-counter",
    "cursor", "decoration-overlay", "dot-grid-bg", "graphic-overlay",
    "organic-blob", "realistic-sphere", "generating-pill",
    "connection-line", "scene-canvas", "diagonal-wipe-transition",
    "badge", "ken-burns", "cinematic-bars", "mesh-gradient-bg",
    "film-grain",
    "text", "image", "video", "shape", "div", "lottie",
]

AnimationType = Literal[
    "none", "fade-in", "fade-out", "fade-up", "fade-down",
    "scale-in", "scale-bounce",
    "slide-left", "slide-right", "slide-up", "slide-down",
    "bar-grow", "typewriter",
]

TransitionType = Literal[
    "none", "crossfade", "soft-replace", "spatial-shift",
    "stack-pop", "diagonal-wipe",
]

PositionType = Literal["absolute", "relative", "flex-child"]
