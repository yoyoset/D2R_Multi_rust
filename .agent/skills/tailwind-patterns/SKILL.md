---
name: tailwind-patterns
description: Tailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Tailwind CSS Patterns (v4 - 2025)

> Modern utility-first CSS with CSS-native configuration.

---

## 1. Tailwind v4 Architecture

### What Changed from v3

| v3 (Legacy) | v4 (Current) |
|-------------|--------------|
| `tailwind.config.js` | CSS-based `@theme` directive |
| PostCSS plugin | Oxide engine (10x faster) |
| JIT mode | Native, always-on |
| Plugin system | CSS-native features |
| `@apply` directive | Still works, discouraged |

### v4 Core Concepts

| Concept | Description |
|---------|-------------|
| **CSS-first** | Configuration in CSS, not JavaScript |
| **Oxide Engine** | Rust-based compiler, much faster |
| **Native Nesting** | CSS nesting without PostCSS |
| **CSS Variables** | All tokens exposed as `--*` vars |

---

## 2. CSS-Based Configuration

### Theme Definition

```css
@theme {
  /* Colors - use semantic names */
  --color-primary: oklch(0.7 0.15 250);
  --color-surface: oklch(0.98 0 0);
  --color-surface-dark: oklch(0.15 0 0);
  
  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 3. Container Queries (v4 Native)

### Breakpoint vs Container

| Type | Responds To |
|------|-------------|
| **Breakpoint** (`md:`) | Viewport width |
| **Container** (`@container`) | Parent element width |

### Container Query Usage

| Pattern | Classes |
|---------|---------|
| Define container | `@container` on parent |
| Container breakpoint | `@sm:`, `@md:`, `@lg:` on children |
| Named containers | `@container/card` for specificity |

---

## 4. Responsive Design

### Breakpoint System

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile-first base |
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

---

## 5. Dark Mode

### Configuration Strategies

| Method | Behavior | Use When |
|--------|----------|----------|
| `class` | `.dark` class toggles | Manual theme switcher |
| `media` | Follows system preference | No user control |
| `selector` | Custom selector (v4) | Complex theming |

---

## 6. Modern Layout Patterns

| Pattern | Classes |
|---------|---------|
| Center (both axes) | `flex items-center justify-center` |
| Vertical stack | `flex flex-col gap-4` |
| Space between | `flex justify-between items-center` |

---

## 7. Modern Color System

### Color Token Architecture

| Layer | Example | Purpose |
|-------|---------|---------|
| **Primitive** | `--blue-500` | Raw color values |
| **Semantic** | `--color-primary` | Purpose-based naming |
| **Component** | `--button-bg` | Component-specific |

---

## 8. 高级视觉模式 (Wow Factor)

### 磨砂玻璃 (Glassmorphism)

- **Classes**: `bg-white/10 backdrop-blur-md border border-white/20 shadow-xl`
- **Usage**: 高端卡片、悬浮菜单、深色模式增强。

### 现代渐变 (Modern Gradients)

- **Mesh Gradient**: 组合多个 `bg-gradient-to-*` 或使用 `bg-[radial-gradient(...)]`。
- **Text Gradient**: `bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary`。

### 微交互 (Micro-interactions)

- **Hover Scale**: `hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200`。
- **Soft Shadows**: 避免默认 `shadow`，使用 `shadow-[0_8px_30px_rgb(0,0,0,0.12)]`。

---

## 9. Tailwind v4 高级特性

### 颜色混合 (Color Mix)

- **Pattern**: `text-(color-mix(in_oklch,var(--color-primary),transparent_25%))`
- **Use**: 在不定义新变量的情况下创建半透明颜色。

### 动态尺寸 (Field Sizing)

- **Class**: `field-sizing-content`
- **Use**: 让 `textarea` 根据内容自动增长，无需 JavaScript。

---

## 10. 模型行为约束 (针对 Flash/Haiku 模型)

Flash 模型在生成 Tailwind 类名时容易出现“类名汤” (Class Soup)。遵循以下约束：

1. **类名排序 (Class Ordering)**: 始终按 Layout → Sizing/Spacing → Visuals → Typography → Interactive 顺序排列。
2. **类名上限**: 单个元素的类名建议控制在 10-15 个以内。超过此限制时，优先考虑在 `@theme` 中定义组件类。
3. **语义化与 A11y**: 交互元素必须包含 `focus:outline-none focus:ring-*` 处理，且必须有 `aria-*` 属性。
4. **禁止臆造类名**: v4 引入了许多新类名，不确定时必须通过工具确认。

---

## 11. Typography System

### Font Stack Pattern

| Type | Recommended |
|------|-------------|
| Sans | `'Inter', system-ui, sans-serif` |
| Mono | `'JetBrains Mono', monospace` |

---

## 12. Animation & Transitions

### Transition Patterns

| Pattern | Classes |
|---------|---------|
| All properties | `transition-all duration-200` |
| Hover effect | `hover:scale-105 transition-transform` |

---

## 13. Component Extraction & Anti-Patterns

- **When to Extract**: Same class combo 3+ times.
- **Anti-Pattern**: Mixing v3 config with v4; heavy use of `@apply`.

---

## 14. Performance Principles

| Principle | Implementation |
|-----------|----------------|
| **Oxide Engine** | Default in v4, 10x faster |
| **Avoid dynamism** | No template string classes |
| **Use CSS Variables** | Prioritize semantic tokens over hardcoded values |

---

> **Remember:** Tailwind v4 is CSS-first. Embrace CSS variables, container queries, and native features.
