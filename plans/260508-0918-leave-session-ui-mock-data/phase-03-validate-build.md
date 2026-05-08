---
phase: 3
title: Validate Build
status: completed
priority: P2
effort: 45m
dependencies:
  - 2
---

# Phase 3: Validate Build

## Overview

Verify the frontend compiles and the updated UI works with mock/API data paths.

## Requirements

- Functional: validate staff submission flow and display of all leave sessions.
- Non-functional: no TypeScript/build errors; no obvious mobile layout overflow.

## Architecture

Validation covers static build first, then local smoke checks against running BE/FE if servers are available.

## Related Code Files

- Read: `frontend/package.json`
- Run checks in: `frontend`
- Inspect logs: `frontend/next-dev.out.log`, `frontend/next-dev.err.log` if dev server is running.

## Implementation Steps

1. Run `pnpm.cmd run build` in `frontend`.
2. If build fails, fix real type/compile errors; do not bypass.
3. Run `pnpm.cmd run lint` if build is clean or if lint is required by active workflow.
4. Start/restart FE on port `3001` if needed.
5. Smoke test:
   - login as a staff user;
   - confirm session control appears;
   - submit a morning request;
   - verify table/calendar label;
   - confirm manager/admin view still shows requests.
6. If backend contract blocks partial-day create, document blocker and keep mock-only UI display changes separated.

## Success Criteria

- [ ] `frontend` build passes.
- [ ] No syntax/type errors from changed files.
- [ ] Staff form renders selected leave session.
- [ ] Request list/calendar/detail display session labels.
- [ ] Any backend mismatch is documented clearly.

## Risk Assessment

Risk: dev server keeps stale env/build cache.
Mitigation: restart Next dev server after implementation if behavior looks stale.

## Unresolved Questions

- None expected after build/smoke validation.
