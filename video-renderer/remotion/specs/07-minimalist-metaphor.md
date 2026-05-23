# Minimalist Metaphor / Symbolism

Black silhouette illustrations on cream background. Head/hand metaphors with red accents.

## Design Tokens
- Background: #EAE6DE (cream/paper)
- Silhouette: #111111 (near black)
- Accent: #E6502A (warm red)
- Text: #111111 body, #E6502A highlights
- Font: Inter / Helvetica Neue / Montserrat Bold
- Layout: split screen (left text, right visual)

## Components
- Head: SVG silhouette with open/close states, eye states (open/closed)
- Hand: SVG silhouette with props (book, kettle, match)
- Sun: red semicircle + radiating lines
- Drop: red water drop + ripple circles
- Plant: sprout → grown plant (scale animation)
- Fire: irregular flame SVG path
- Door: black rectangle + red background/light
- ChaosShapes: randomly generated geometric shapes
- TextBlock: left-aligned with highlighted keywords

## Animation
- Reveal: translateY (+50→0)
- Growth: scale (0→1)
- Entry: translateX (-100→0) from screen edge
- Pop: random shapes scale + opacity
- Head open: top skull lifts up (-60px)
- Pouring: hand rotation + kettle tilt

## Scene Flow
1. Clarity: head opens, sun rises from inside
2. Growth: plant grows from head
3. Focus: fire lights in hand
4. Chaos: geometric shapes burst
5. Door: door opens to reveal light
