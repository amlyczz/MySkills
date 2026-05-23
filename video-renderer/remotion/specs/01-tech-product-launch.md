# Tech Product Launch Style

Dark background, high-contrast text, 3D floating cards, flowing aurora gradients, minimal UI demos.

## Design Tokens
- Background: #000000
- Accent: #4285F4 (Google Blue)
- Font: Inter / Google Sans, weights 400-800
- Cards: border-radius 16-24px, dark background, glow borders

## Components
- FloatingCard: 3D perspective + rotateX/Y + spring entrance + glow shadow
- KineticText: highlight words, typewriter, scale-in
- AuroraBackground: radial-gradient orbs with blur(100px) slow movement
- Cursor: SVG mouse pointer path animation
- SpeakerPiP: fixed-position rounded video window

## Animation
- Spring entrance (stiffness:80, damping:12)
- Typewriter (chars per frame)
- Scale pulse (subtle breathing)
- Shimmer on buttons
