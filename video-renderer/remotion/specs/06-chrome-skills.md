# Chrome Skills Template

Google Chrome feature promo with skill cards, typewriter text, card stacks.

## Design Tokens
- Primary: #4A90E2 (blue)
- Secondary: #2C5F8A (dark blue)
- Accent: #FFD700 (gold)
- Backgrounds: gradient(180deg, #4A90E2→#2C5F8A), solid black, solid white
- Font: Inter, weights 400-700
- Card radius: 16px, shadow: 0 4px 20px rgba(0,0,0,0.08)

## Components
- TypewriterText: char-by-char reveal with blinking cursor
- RevealingText: multi-line staggered reveal
- HighlightedText: color-highlighted keywords
- SkillCard: icon + title + description + tag pills
- FeatureCard: large icon + short description
- CardStack: overlapping cards with stagger entry (rotation -5° to 5°)
- GradientBackground: animated gradient direction
- GridBackground: dot grid pattern
- LightningIcon: bolt SVG
- ChromeLogo: 4-color circle
- BrowserMockup: traffic lights + address bar

## Animation
- Spring entrance (damping:12, stiffness:100)
- Stagger delay: 10 frames between cards
- Fade + slide up for card stack
- Typewriter speed: 3-4 frames/char
- Blink cursor: 1s cycle

## Scene Flow
1. Intro: "NEW" ×3 lines reveal → gradient bg
2. Hero: "Keeping Tabs on Chrome" typewriter
3. Skills intro: lightning icon + "Skills in Chrome"
4. Skill grid: staggered card entrance
5. Feature showcase: card stack with overlap
