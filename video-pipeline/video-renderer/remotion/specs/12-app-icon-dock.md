# App Icon 3D Reveal / iOS Dock

iOS/macOS style 3D icon showcase with glassmorphism dock, fluid gradients.

## Design Tokens
- Background: fluid radial-gradient (yellow/gold) with slow Ken Burns
- Dock: rgba(255,255,255,0.35) + backdrop-filter blur(20px) + 24px radius + 1px white border
- Icons: 80px, 20px radius, 3D shadow (0 10px 20px rgba(0,0,0,0.15))
- Font: SF Pro Rounded / Nunito / Inter Bold 800
- Glass overlay: linear-gradient(135deg, rgba(255,255,255,0.4), transparent) for 3D sheen

## Components
- Background: fluid gradient with frame-driven translate
- Dock: glassmorphism bar, centered, icon grid
- HeroIcon: spring scale-in + sinusoidal float + hover scale 1.2
- PaginationDot: small dark dots below dock
- BrandText: fade-in + translateY for app name

## Animation
- Hero icon: spring(damping:12, stiffness:100) scale + sin(frame*0.1)*10 float
- Grid icons: stagger spring entrance (delay = index * 5)
- Text: fade-in from frame 60-90, translateY 20→0
- Background: slow parallax translate
