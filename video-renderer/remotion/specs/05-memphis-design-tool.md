# Memphis Design Tool Promo

AI design tool showcasing "natural language → Memphis graphics" pipeline.

## Design Tokens
- Input BG: #F5F5F7 + dot grid (radial-gradient dots)
- Output BG: #0A192F (deep navy)
- Memphis colors: #FF6B6B (coral) / #FFE66D (yellow) / #4ECDC4 (teal) / #6C5CE7 (purple)
- Font: Inter / Plus Jakarta Sans, weights 400-700
- Border radius: 32px cards, 999px pills
- Decorations: wavy lines, dot matrices, triangles, irregular circles

## Components
- MemphisCard: dark bg + memphis geometric decorations + testimonial content
- DotGridBackground: radial-gradient dot pattern 24px grid
- TypingInput: white rounded input, typewriter text, send button
- GeneratingPill: black capsule with spinner, "Generating..." label
- CarouselSlider: horizontal scroll of generated cards
- RandomShape: randomized geometric shapes (circle/square/wave) in memphis palette
- ParticleExplosion: canvas 2D particle burst for transitions

## Animation
- Typewriter (2 chars/frame)
- Spring pop for generating pill
- Horizontal slide-in for card carousel
- Stagger entrance for grid cards (5-frame delay)
- Scale 0.8→1 for brand assets

## Scene Flow
1. Input: white bg + typing input "Make an art tutor app..."
2. Generating: loading pill + card slides in
3. Assets: brand logo/colors scale in
4. Grid: 10-card memphis grid with stagger
5. Mockups: real-world context (Times Square etc.)
