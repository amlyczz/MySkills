# KOKUYO Pop-up Book Extended

3D page-flip notebook with pop-up scenes. SVG elements, parallax, tooltips.

## Design Tokens
- Scene themes: #A8E6CF (green), #FF3399 (pink), #FFD600 (yellow), #00A3FF (blue)
- Notebook: textured cover, left sketch page, right lined page
- Desk bg: minimalist line-art room corner
- Font: Helvetica Neue / Noto Sans JP Bold
- Tooltips: white rounded rect + shadow + arrow pointer

## Components (extending existing KokuyoShowcase)
- PageFlip: CSS rotateY(0→-180) with backface-visibility + transform-origin left center
- PopUpElement: spring scale + translateY(50→0), transform-origin bottom
- NotebookPage: left page (sketch) + right page (lined + popups)
- BackgroundLayer: desk room SVG scene
- UIOverlay: KOKUYO logo box + slogan
- ParallaxGroup: multi-depth element groups with different translate speeds
- CameraZoom: global scale + translate for scene transitions

## Animation
- Page flip: interpolate rotateY 0→-180 over duration
- Pop-up: spring(damping:12, stiffness:100, mass:1), translateY from spring
- Parallax: foreground fast, background slow on camera pan
- Zoom transition: scale animation between scenes
- Tooltips: spring entrance with delay
