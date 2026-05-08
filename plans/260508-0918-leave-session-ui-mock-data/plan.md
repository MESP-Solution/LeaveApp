---
title: Leave Session UI Mock Data
description: >-
  Update employee leave UI and local mock data for morning, afternoon, and
  full-day leave options.
status: completed
priority: P2
branch: ''
tags:
  - frontend
  - leave-requests
  - mock-data
blockedBy: []
blocks: []
created: '2026-05-08T02:18:54.993Z'
createdBy: 'ck:plan'
source: skill
---

# Leave Session UI Mock Data

## Overview

Frontend currently models leave requests as date-only records. Staff submission UI only asks for date and reason, and mock data has no leave-session field. This plan updates the employee-facing leave flow and mock data to support three leave durations:

- Morning
- Afternoon
- Full day

Scope is frontend-first: types, API mapper/client payload, staff form, table/calendar labels, and mock data. Backend behavior is treated as already updated by user, but Phase 1 must verify the exact API field name before implementation.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Analyze Contract](./phase-01-analyze-contract.md) | Completed |
| 2 | [Update Frontend UI And Mock Data](./phase-02-update-frontend-ui-and-mock-data.md) | Completed |
| 3 | [Validate Build](./phase-03-validate-build.md) | Completed |

## Dependencies

- Backend contract for leave duration/session must be confirmed before wiring request payload.
- No unfinished project plans detected under `plans/` during creation.

## Success Criteria

- Staff can choose morning, afternoon, or full day when creating a leave request.
- Mock records cover all three options and render clearly in UI.
- Existing approved/pending/rejected flows remain unchanged.
- `pnpm.cmd run build` passes in `frontend`.

## Handoff

Recommended next command:

```powershell
cd D:\LeaveApp
# execute this plan with implementation workflow
```

## Unresolved Questions

- Backend field name/value contract: `leaveType`, `leaveSession`, `session`, or another name?
- Leave credit deduction rule: morning/afternoon = 0.5 day and full day = 1 day?
