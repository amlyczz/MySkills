# Quad Split Dashboard

Quadrant layout, animated counters, gradient orbs, typing inputs, data-driven scenes.

## Design Tokens
- Background: varied per quadrant (white, tinted, scenic, gradient)
- Font: Inter, weight 800 for numbers, 400-500 for text
- Counter: 64px+, gradient text fill
- Cards: glass cards with backdrop-filter blur

## Components
- QuadLayout: CSS Grid 2x2, each quadrant = 1fr
- AnimatedCounter: interpolate from 0→target, prefix/suffix, duration
- TypingInput: chat-style white input with shadow, cursor blink
- GradientOrbs: large blurred radial-gradient orbs with keyframe float
- BrowserWindow: traffic lights + address bar + content area
- HighlightTags: bordered labels with glow

## Animation
- Counter rolling (interpolate with clamp)
- Typewriter (chars per frame)
- Orb float (keyframe translateY)
- Spring entrance for quadrants
- Shimmer on cards

## Data-Driven
- JSON scene config with layout type, quadrant contents
- Factory function to render quadrants by type
