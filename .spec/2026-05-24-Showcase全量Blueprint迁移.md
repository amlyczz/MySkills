# Phase 4: Showcase 全量 Blueprint 迁移

> 目标：15 个 Showcase 全部改为 JSON Blueprint 驱动，走 TemplateRenderer → ElementRenderer 管线。

---

## 前置准备：补齐组件注册表

当前 componentRegistry 已有 41 个组件。Showcase 重构前需要补充注册以下组件：

| 组件 | 来源 Showcase | 类型 |
|------|-------------|------|
| `svg-placeholder` | Kokuyo | 装饰层 |
| `layered-element` | Kokuyo | 布局层 |
| `pop-up-book-base` | Kokuyo | 布局层 |
| `scene-canvas` | Kokuyo | 布局层 |
| `diagonal-wipe-transition` | Kokuyo | 过渡层 |
| `title-text` | TechLaunch | 内容层 |
| `album-card` | Spotify | 内容层 |
| `chat-bubble` | Fastlane | 内容层 |
| `content-calendar` | Fastlane | 内容层 |
| `counter` | HealthApp | 内容层 |
| `app-preview-card` | ModernSaas | 内容层 |
| `typing-input` | Memphis | 内容层 |
| `generating-pill` | Memphis | 内容层 |
| `hexagon-grid` | Playful | 装饰层 |
| `flash-text` | Playful | 内容层 |

---

## Showcase 迁移计划

### 第 1 批：简单型（3-4 个场景，组件已注册）
| # | Showcase | 场景数 | 复杂度 | 状态 |
|---|----------|--------|--------|------|
| 1 | **PricingShowcase** | 1 | 低 | ✅ |
| 2 | **FluidShowcase** | 1 | 低 | ✅ |
| 3 | **DarkNeonShowcase** | 1 | 低 | ✅ |
| 4 | **MemphisShowcase** | 2 | 低 | ✅ |

### 第 2 批：中等型（2-3 个场景，部分组件需注册）
| 5 | **KokuyoShowcase** | 2 | 中 | ✅ |
| 6 | **IosShowcase** | 2 | 中 | ✅ |
| 7 | **TechLaunchShowcase** | 2 | 中 | ✅ |
| 8 | **ModernSaasShowcase** | 2 | 中 | ✅ |
| 9 | **ProductDemoShowcase** | 2 | 中 | ✅ |
| 10 | **SpotifyShowcase** | 2 | 中 | ✅ |

### 第 3 批：复杂型（4+ 场景，复杂动画/SVG）
| 11 | **PlayfulShowcase** | 4 | 高 | ✅ |
| 12 | **HealthAppShowcase** | 2 | 高 | ✅ |
| 13 | **FastlaneShowcase** | 2 | 高 | ✅ |
| 14 | **MetaphorShowcase** | 2 | 高 | ✅ |
| 15 | **CohereShowcase** | 10 | 高 | ✅ |

---

## 每 Showcase 迁移步骤

1. 分析原 Showcase 的场景结构、元素、动效
2. 补齐缺失的组件到 componentRegistry
3. 对每个组件做 Dumb Component 清洗（移除入场动效）
4. 编写 Blueprint JSON（theme + scenes + elements + animations）
5. 在 Root.tsx 注册 Composition（id + TemplateRenderer + blueprint）
6. Studio 验证渲染效果与原版一致

## 验收标准
- [ ] 所有 15 个 Showcase 在 Studio 中可正常切换预览
- [ ] 每个场景的视觉效果与原版一致
- [ ] 所有颜色/字体/圆角通过 CSS 变量注入
- [ ] 所有入场动效通过 animationRegistry
- [ ] 无 Tailwind `animate-*` / `transition-*` class
- [ ] 无动态 arbitrary value 模板变量
- [ ] 无硬编码 `style={{ color: "#XXX", fontSize: N }}` 
