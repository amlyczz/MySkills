# Health/Fitness App UI Demo

Mobile health app demo with phone frames, progress rings, counters, mascot.

## Design Tokens
- BG: #F8FAFC
- Surface: #FFFFFF
- Primary: #2563EB (blue)
- Primary Light: #DBEAFE
- Text Primary: #0F172A
- Text Secondary: #64748B
- Accent: #F59E0B (orange/flame)
- Success: #10B981
- Track: #E2E8F0
- Font: Inter, weights 400-700

## Components
- PhoneFrame: 393×852, 40px radius, dynamic island, home indicator, shadow
- Card: white bg, 20px radius, 16-20px padding, shadow 0 4px 20px rgba(0,0,0,0.06)
- Counter: large number display with count-up animation
- ProgressRing: SVG circle with animated stroke-dashoffset
- TimePicker: 3-column scroll (hour/minute/AMPM), center highlight
- StreakCalendar: 7×5 grid, flame icons for active days
- PandaMascot: vector panda with states (idle/wave/cool/jump)
- TabBar: 4-5 bottom tabs with active indicator
- Button: primary (dark bg white text) / secondary (light bg)
- ResponsiveWrapper: dynamic scale based on video config

## Animation
- Three-screen staggered slide-in (spring translateY)
- Counter interpolate (0→target over 60 frames)
- Progress ring stroke-dashoffset fill
- Calendar grid sequential light-up (stagger)
- Mascot spring bounce
- Tab switch with scale

## Scene Flow
1. Three phones slide in (left/center/right)
2. Center phone: blue bg transition, panda fade in, counter 14→15
3. Blue screen → streak calendar, cells light up sequentially
4. Right phone: progress ring fills, calories count up
5. Left phone: time picker scroll simulation
6. Global breathing scale, mascot wave
