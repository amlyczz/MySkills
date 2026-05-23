# Dark Glassmorphism Pro

Dark mode SaaS promo with glass cards, circle grid, floating icons, data viz.

## Design Tokens
- Background: #050505 or #0A0A0A
- Teal accent: #00FFD1
- Blue accent: #0055FF
- Surface: #111111
- Text: #FFFFFF main, #888888 muted
- Glass: rgba(20,20,25,0.6) + backdrop-filter blur(12px) + 1px rgba(255,255,255,0.08) border
- Card radius: 16-20px
- Font: Inter / Plus Jakarta Sans / Roboto

## Components
- CircleGrid: N×M grid of gradient-filled circles with random opacity
- AmbientGlow: large blurred radial-gradient orbs that slowly move
- GlassCard: semi-transparent card with backdrop-filter, border, shadow
- FloatingIcon: 3D icon with subtle float animation + shadow
- AnimatedText: reveal text with spring/fade
- CountUpNumber: number rolling from 0 to target
- SpiralLoop: CSS rotating ring animation
- DashboardMockup: static UI screenshot wrapper

## Animation
- Fade + float up for glass cards
- Slow ambient glow movement (interpolate position)
- Float animation for icons (sinusoidal)
- Count up with interpolate
- Spiral rotation via CSS transform

## Scene Flow
1. "No more guessing" text + circle grid bg
2. Glass card financial dashboard slides in
3. Feature cards with floating icons
4. Data viz with count-up numbers
5. Brand logo + CTA
