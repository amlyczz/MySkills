# Spotify Wrapped Style

Music promo with star particles, album cards, decorative borders, green brand.

## Design Tokens
- Spotify Green: #1DB954
- Dark Green: #0D2B0D
- Black: #000000
- Dark Gray: #1A1A1A
- White: #FFFFFF
- Text Gray: #B3B3B3
- Gold: #FFD700
- Font: Inter / Montserrat, weights 400-900

## Components
- StarParticles: gold stars falling with rotation + fade
- DecorativeBorder: top/bottom row of stars or dots
- SpotifyTextLogo: "Sp" + green orb + "tify" with spring animation
- SpotifyIcon: green circle + black sound wave SVG
- AlbumCard: 200px card with cover image + title + artist
- FeatureCard: icon + title on colored bg
- ShowcaseCard: large card with image + sidebar text
- BigTitle: 80px white bold centered text
- OverlayText: white text on video/image with shadow
- LyricsText: left-aligned, line-height 1.6, green highlights

## Layouts
- CenterLayout: flex center single element
- SplitLayout: left card + right text
- GridLayout: multi-card staggered grid

## Animation
- Star particles falling + rotation + opacity fade
- Spring entrance for logo orb
- Stagger grid entrance
- Scale + opacity for cards

## Scene Flow
1. Opening: black bg + stars + decorative border + Spotify logo
2. Album showcase: grid of album cards
3. Lyrics scene: lyrics text with green highlights
4. Grid memories: 20 album covers in grid
5. Floating objects: 3D floating elements
6. Closing: logo scale down
