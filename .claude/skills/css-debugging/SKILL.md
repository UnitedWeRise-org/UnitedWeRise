---
name: css-debugging
description: Use when debugging CSS layout, positioning, viewport gaps, z-index conflicts, or responsive breakpoints — provides the positioning-context table, property-interaction rules, unit-consistency checks, common-pitfalls table, and git-history tracing commands. Triggers on CSS, layout, positioning, z-index, responsive, styling bug, element not visible, gap, overflow, alignment.
---

# CSS Debugging

## When to use / Skip if
- **Use when:** debugging layout issues, positioning problems, viewport gaps, z-index conflicts, or responsive breakpoint overrides.
- **Skip if:** the work isn't CSS/layout related, or you're editing content/logic rather than visual styling.

## Quick Checklist
Before making CSS changes, verify:
1. [ ] Positioning context identified (what is the containing block?)
2. [ ] Property interactions understood (no conflicting constraints)
3. [ ] Units are consistent (vh/vw vs px)
4. [ ] Responsive breakpoints checked for overrides
5. [ ] Git history traced to isolate what changed

## Core Principles

### 1. Map the Positioning Context
For `position: absolute/fixed`, the containing block determines what `top/bottom/left/right` are relative to:

| Element's Position | Containing Block |
|-------------------|------------------|
| `static` (default) | Parent's content box |
| `relative` | Own original position |
| `absolute` | Nearest positioned ancestor, or viewport |
| `fixed` | Viewport (ignores ancestors) |

**First question:** What is this element positioned relative to?

### 2. Understand Property Interactions
| Properties Set | Result |
|---------------|--------|
| `top` + `bottom` (no height) | Element stretches between them |
| `top` + `height` | Bottom is computed |
| `top` + `bottom` + `height` | Over-constrained; `bottom` ignored |
| `top` + `bottom` + `min-height` | Can cause overflow if min-height > available space |

**Rule:** Don't mix implicit sizing (`top` + `bottom`) with explicit sizing (`height`/`min-height`) unless intentional.

### 3. Avoid Redundant Properties
| Redundant | Clean |
|-----------|-------|
| `left: 0; right: 0; width: 100%` | `left: 0; right: 0` |
| `top: 0; bottom: 0; height: 100%` | `top: 0; bottom: 0` |

### 4. Match Units Consistently
```css
/* BAD - units don't match */
top: 5.5vh;                  /* ~59px on 1080p */
height: calc(100vh - 60px);  /* 60px ≠ 5.5vh */

/* GOOD - consistent units */
top: 5.5vh;
bottom: 0;                   /* Or: height: calc(100vh - 5.5vh) */
```

### 5. Check Responsive Overrides
Media queries can override base styles. Search for the selector in `responsive.css`, component CSS files, and inline styles added by JavaScript.
```bash
grep -n "#myElement" frontend/src/styles/*.css
```

### 6. Trace Git History
```bash
git log --oneline -10 -- path/to/file.css        # commits that touched the file
git show <commit>:path/to/file.css | sed -n '168,180p'   # compare states
git diff <before>..<after> -- path/to/file.css   # what changed
```

## Common Pitfalls
| Symptom | Likely Cause |
|---------|--------------|
| Gap at bottom | `height: calc()` with mismatched units; use `bottom: 0` instead |
| Element not visible | `z-index` without `position`, or parent has `overflow: hidden` |
| Positioning ignored | Element is `position: static` (default) |
| Responsive layout broken | Media query specificity or order issue |
| Inline styles winning | JavaScript adding `element.style.*` |

## Debugging Steps
1. **Inspect computed styles** — DevTools > Computed tab
2. **Check box model** — margin/padding/border affecting dimensions?
3. **Identify overrides** — DevTools shows crossed-out rules
4. **Test in isolation** — remove other CSS to confirm the issue
5. **Compare working state** — git diff or cached working version
