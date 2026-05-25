# Synaps Architecture Visualization

Dark mode architectural tool promo. Fluid lights, kinetic text, floor plans, comment bubbles.

## Design Tokens
- Primary: #4FACFE (blue)
- Secondary: #FF6B6B (red)
- Background: #000000
- Surface: #1A1A2E
- Text: #FFFFFF, muted #888888
- Grid: #333333
- Highlight: #00F2FE
- Font: Inter (heading 700, body 400), JetBrains Mono (code)

## Components
- KineticText: staggered character spring entrance with blur→clear
- TypewriterText: char-by-char with cursor
- GradientText: background-clip text with animated gradient
- GlowText: text-shadow keyframe
- FluidLight: SVG path with stroke-dashoffset + drop-shadow
- GlowOrb: scale + opacity fade circle
- GridPattern: CSS linear-gradient building grid
- DarkBase: solid black background
- Toolbar: bottom/top icon bar with spring pop
- Cursor: SVG triangle/cross following path
- SelectionBox: blue dashed stroke-dasharray box
- CommentBubble: dark rounded bubble + avatar
- FloorPlan: SVG path draw animation with room labels
- NodeGraph: image nodes + connecting lines
- PixelLoader: canvas pixelated progress
- CameraView: blue cone SVG

## Animation
- Spring configs: gentle(20/100), normal(15/150), snappy(12/200), bouncy(8/300)
- KineticText: char delay 3 frames, spring(12/200), blur 4→0
- FluidLight: stroke-dashoffset 0→100%
- FloorPlan: staggered room draw (0.3 interval)
- CommentBubble: spring(15/180) + avatar delay 5
