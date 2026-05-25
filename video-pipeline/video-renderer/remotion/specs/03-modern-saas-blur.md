# Modern SaaS + Blur Transitions

Light backgrounds, prompt input pill, app cards, 3D icons, parallax, blur transitions.

## Design Tokens
- Background: #F9F9F9 / #F5F5F7
- Font: Inter / SF Pro Display, weights 400-700
- Cards: border-radius 24-32px, white, box-shadow
- Buttons: radius 999px (capsule)
- Icons: squircle 20-24px

## Components
- PromptInput: white pill with shadow, typewriter text, black send button (arrow up SVG)
- AppCard: white rounded card with top nav bar (back arrow + title + edit)
- SceneWrapper: blur transition (0→20px Gaussian) + parallax scale
- Toggle: iOS-style switch with spring animation
- Icon3D: glossy sphere/cube (CSS radial-gradient or Lottie)

## Animation
- Typewriter (3 frames per char) + cursor blink
- Spring entry with overshoot
- Blur transition (blur + scale for scene changes)
- Parallax (bg slow, fg normal)
- Bouncy toggle interaction
