# Fastlane SaaS Promo

SaaS product promo with search input, chat bubbles, calendar, notifications.

## Design Tokens
- Primary: #DC2626 (red)
- Primary Light: #FEF2F2
- Secondary: #64748B
- BG Gradient: linear-gradient(135deg, #FEF3F2, #FFF, #FDF2F8)
- Card: linear-gradient(180deg, #1A1A1A, #0D0D0D)
- Text: #1E293B
- Text Secondary: #64748B
- Font: Inter / JetBrains Mono for code

## Components
- SoftGradientBackground: pink or blue gradient
- TypewriterText: char-by-char with cursor
- FadeSwapText: rotating text with crossfade
- SearchInput: rounded input + "Go" button with gradient
- ChatBubble: user (gradient right) / bot (white left) messages
- InfoCard: dark card with avatar, stats, description
- SpringPop: spring entrance wrapper
- HorizontalScroll: translateX scroll of items
- ExpandOut: radial expansion of children
- ContentCalendar: month grid with post indicators
- PhoneNotifications: dark mode phone with notification list

## Animation
- Spring entrance for cards (damping:20, stiffness:200)
- Typewriter text reveal
- Fade swap for rotating headlines
- Horizontal scroll with interpolate
- Expand out radial animation
- Notification slide-in stagger

## Scene Flow
1. Opening: problem statement + typewriter
2. Product intro: fade swap headlines
3. Input demo: search input + typing
4. Interface: chat bubbles stagger in
5. Processing: loading animation
6. Results: calendar + cards showcase
7. Closing: summary + CTA
