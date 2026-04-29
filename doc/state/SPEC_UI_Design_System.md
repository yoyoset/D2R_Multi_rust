# SPEC: UI Design System & Styling Tokens

This document specifies the visual engine and design tokens used to create the industrial-grade user interface for `d2r-rust`.

---

## 1. Design Philosophy: "Industrial Professionalism"

The UI is designed to resemble high-productivity tools (like VS Code or industrial consoles). 
- **Palette**: Low-saturation, high-contrast dark mode.
- **Typography**: `Inter` (Primary) with monospaced fallbacks for PIDs and diagnostic logs.

---

## 2. Global Styling Tokens (Tailwind/CSS)

### 2.1 Color Palette (`:root`)
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| **`--bg-primary`** | `#09090b` | Darkest background (Main). |
| **`--bg-secondary`** | `#0f0f0f` | Elevated surfaces (Cards). |
| **`--text-primary`** | `#f6f6f6` | High readability text. |
| **`--accent-primary`** | `#396cd8` | Action buttons / Brand color. |
| **`--accent-hover`** | `#24c8db` | Interactive glow state. |

### 2.2 Component Specifications
- **Common Border Radius**: `8px` (Standard geometric rounding).
- **Transitions**: `0.25s` for interactive borders; `0.75s` for logo filters (aesthetic).
- **Shadows**: `0 2px 2px rgba(0, 0, 0, 0.2)` for subtle elevation on dark surfaces.

---

## 3. Dynamic Visual States

### 3.1 Dark Mode Logic
The application enforces a **System-Preference-Aware** dark mode by default (`prefers-color-scheme: dark`), which triggers the inversion of the `:root` variables:
- **Light**: Background `#f6f6f6`, Text `#0f0f0f`.
- **Dark**: Background `#09090b`, Text `#f6f6f6`.

### 3.2 Drag & Drop Visuals (@dnd-kit)
- **Active Overlay**: When reordering accounts, the system applies a `z-index: 100` and `scale: 1.05` transform to the ghost element.
- **Dropping Feedback**: Real-time grid repositioning with CSS `transition: transform 150ms ease`.

---

**Technical Compliance**: `src/App.css`, `tailwind.config.ts`  
**Quality Level**: Commercial Aesthetics
