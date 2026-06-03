# RFC: Deepen module — [short name]

> **Follow-up** to `audit-YYYY-MM-DD.md` candidate #N. Copy to `rfc-candidate-N-short-name.md` when exploring one cluster.

| Field | Value |
|-------|--------|
| **Date** | |
| **Parent audit** | `audit-YYYY-MM-DD.md` |
| **Candidate #** | |
| **Status** | draft / review / accepted / implemented |

---

## Problem

- Which modules are shallow and tightly coupled?
- What integration risk exists at the seams?
- Why does this block Railway migration or testing?

**Files involved:**

-

---

## Proposed interface

### Signature

```ts
// Port or facade — fill in after design pass
```

### Usage example (caller)

```ts
// How a page or hook uses it
```

### Hidden complexity

-

---

## Dependency strategy

| Dependency | Category (1–4) | How handled |
|------------|------------------|-------------|
| | | |

---

## Testing strategy

### New boundary tests

-

### Old tests to delete (if any)

-

### Test environment

- Local Postgres: Docker Compose / PGLite / …
- Mocks at: …

---

## Implementation recommendations

- **Owns:**
- **Hides:**
- **Exposes:**
- **Caller migration:**

---

## Design alternatives considered

| Design | Constraint | Trade-off |
|--------|------------|-----------|
| A: Minimal interface (1–3 entry points) | | |
| B: Maximum flexibility | | |
| C: Optimized for default caller | | |
| D: Ports & adapters | | |

**Recommendation:**

---

## GitHub issue

- Issue URL: (paste after `gh issue create`)
- Title:
