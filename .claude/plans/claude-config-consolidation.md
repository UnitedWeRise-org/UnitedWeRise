# Plan: Claude Config Consolidation (CLAUDE.md + Protocols + Skills + Memory)

**Created:** 2026-07-14
**Status:** COMPLETE (2026-07-15) — global archetype + skills live; project reshaped; cleanup done
**Scope:** Two repos — global `~/.claude/` (claude-config repo) + project `.claude/` (UnitedWeRise)

---

## Goal

One coherent config system. Global CLAUDE.md is a lean **archetype** of universal rules + the pattern for organizing a project. Separate protocol files are retired — folded into CLAUDE.md as rules, or converted to skills as triggered procedures. Critical procedures fire deterministically via hooks. Artifacts cleaned up.

---

## Design principles (the sorting rule)

| Content type | Home | Why |
|---|---|---|
| Invariant / always-true rule | **CLAUDE.md** | Always in context (guaranteed presence) |
| Triggered procedure (critical) | **Skill + UserPromptSubmit hook** | Hook = deterministic trigger; skill = lazy-loaded detail |
| Triggered procedure (user-driven) | **Skill** (`/name`) | Explicit, deterministic |
| Reference knowledge | **Skill** (auto-invoked) | Lazy-loaded; occasional miss tolerable |
| Evolving fact / state / gotcha | **Memory** | Auto-recalled by relevance |
| Historical record | **CHANGELOG / devlogs** | Append-only |
| Dead working files | **Archive + gitignore** | Out of active tree |

Key mechanic: `@import` inlines at session start (no token savings) → CLAUDE.md must be *distilled*, deep detail goes to *skills* (body loads only on invoke).

### Skill invocation determinism (3 layers)

To minimize subjectivity about whether a skill fires:
1. **CLAUDE.md "Skill Triggers" map** (always loaded): explicit "when you encounter [conditions] → invoke `/skill-name`." The deterministic-presence flag.
2. **Skill self-gate** (top of each SKILL.md): "When to use / Skip if" — folds each retired protocol's own applicability conditions; the skill validates once invoked and bails if conditions aren't met.
3. **Hook** (critical skills only): `UserPromptSubmit` matcher injects the trigger reminder + non-negotiables, guaranteeing it fires even if the CLAUDE.md flag is missed.

---

## Phase 1 — Global archetype (`~/.claude/`)

**Redesign `~/.claude/CLAUDE.md`** into a lean archetype:
- Universal dev principles (Core Development Principles, Questions-vs-Directives, minimal scope, error/problem protocol) — protected content preserved in substance, restructured.
- **Modularity-by-default rule** (replaces es6/css protocols): "never design monolithically; modular by default; new code in modules, not inline/monolithic files."
- Workflow phases (Audit→Execute→Test→Document→Deploy→Handoff) distilled to concise rules — Handoff dropped.
- Communication standards, security requirements, commit granularity.
- A short **"Project Organization Pattern"** section: what belongs in a project's CLAUDE.md vs skills vs memory (the archetype's meta-guidance).

**Delete** (folded/retired): `~/.claude/protocols/` — audit, execute, test, plan, document, handoff, deploy, es6, css (all 9).

**Create** global skill: `~/.claude/skills/setup-project/SKILL.md` (`/setup-project`) — scaffolds a new project's CLAUDE.md + skills per the archetype.

**Replace** the global `SessionStart` hook (currently re-`cat`s CLAUDE.md = duplicate) with a lean one: detect missing `.claude/CLAUDE.md` → inject "run /setup-project" reminder.

**Optional (raise for approval):** any locked global item that no longer earns its place.

---

## Phase 2 — Project reference implementation (`.claude/`)

**Redesign `.claude/CLAUDE.md`** to follow the archetype:
- Keep protected invariants (env-branch mapping, DB migration safety, Investigation-Action-Verification, admin-debug, env-aware auth) — restructured, substance preserved.
- Project ES6-modules enforcement stays as a concrete project rule (instance of the global modularity rule).
- Replace protocol-file references with skill pointers.

**Convert protocols → skills (hook-backed for critical ones):**
- `.claude/skills/auth-work/SKILL.md` ← auth_protocol.md; keep/refine the existing auth `UserPromptSubmit` hook as the deterministic trigger.
- `.claude/skills/deployment/SKILL.md` ← deployment_protocol.md + deployment_troubleshooting_protocol.md (merged); add a `UserPromptSubmit` hook on deploy/merge keywords injecting the non-negotiables (explicit-command-only, migrations-before-code, env-branch mapping).
- Delete `.claude/protocols/README.md`.

**Guides → skills** (reference, lazy-loaded): architecture-notes, common-patterns, multi-agent-patterns, sri-maintenance.

**Normalize existing `.claude/commands/*.md` → skills** (10 files) for lazy-loading + description-driven invocation. Backward-compatible.

**Audit `.claude/agents/*.json`** (7): determine live vs legacy → keep or delete.

---

## Phase 3 — Cleanup

- **Archive** `.claude/scratchpads/` (180+), `.claude/handoffs/` (28), `.claude/phase-planning/`, `.claude/lessons-learned/`, `.claude/css-audit/`, `.claude/coordination/`, `.claude/tracking/` → `.claude/archive/` (or delete; they live in git history).
- **Gitignore** those working dirs going forward.
- **Retire handoffs** as a mechanism (documented in archetype: session continuity = memory + devlogs).
- Delete `.claude/settings.local.json.backup`.
- **Memory**: retire `feedback_always_read_protocols.md` (moot once rules live in CLAUDE.md); document memory boundaries in the archetype.

---

## Risks / approval gates

- **Protected sections**: restructured with substance preserved. Any high-risk change → prompt with proposed fix + rationale before proceeding.
- **Two-repo change**: global config affects all projects; changes committed to claude-config repo separately.
- **Reliability**: critical procedures backed by hooks, not auto-invocation alone.

---

## Open decisions for approval

1. Sequencing: global-first (define archetype, then conform project) — recommended.
2. Archive vs delete for the ~210 working files.
3. Any locked items to cut (raised individually during execution).
