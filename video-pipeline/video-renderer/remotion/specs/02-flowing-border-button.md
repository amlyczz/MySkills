# Flowing Border Button

CSS animated rainbow gradient border rotating around a white capsule button.

## Design Tokens
- Background: #E5E7EB
- Button: white #FFFFFF, radius 40px, shadow 0 8px 32px rgba(0,0,0,0.15)
- Gradient: multi-color linear-gradient rotating via CSS animation
- Font: system sans-serif, weight 600

## Components
- FlowingBorderButton: outer gradient wrapper (padding 3px = border) + inner white button
- Configurable: text, gradientColors, speed, width, height, fontSize, subText

## Animation
- CSS @keyframes rotate(0→360deg) on gradient wrapper
- Speed configurable (seconds per revolution)
- Subtitle text with letter-spacing below button
