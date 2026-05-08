---
phase: 2
title: Update Frontend UI And Mock Data
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 2: Update Frontend UI And Mock Data

## Overview

Update the employee leave request UI and local mock/sample data so morning, afternoon, and full-day leave are visible and selectable.

## Requirements

- Functional:
  - Staff form includes a required leave-session control.
  - Create request payload includes selected session.
  - Table and modal/detail UI display session label.
  - Mock data contains at least one morning, one afternoon, and one full-day request.
  - Duplicate check should block same staff/date/session, not necessarily all requests on same date, if backend allows morning and afternoon separately.
- Non-functional:
  - Keep UI compact and consistent with existing Tailwind style.
  - Do not introduce new component libraries.
  - Keep files under 200 lines where practical; consider extracting small helpers if touched files grow too large.

## Architecture

Use a small enum-like constant in `frontend/types/leave-app.ts`:

```ts
export const LEAVE_SESSIONS = ["MORNING", "AFTERNOON", "FULL_DAY"] as const;
export type LeaveSession = (typeof LEAVE_SESSIONS)[number];
```

Add label helper in `frontend/lib/formatters.ts` or a focused helper if file size grows. UI should use labels:

- `Buoi sang`
- `Buoi chieu`
- `Ca ngay`

## Related Code Files

- Modify: `frontend/types/leave-app.ts`
- Modify: `frontend/lib/leave-management-sample-data.ts`
- Modify: `frontend/lib/leave-app-mappers.ts`
- Modify: `frontend/lib/leave-requests-api.ts`
- Modify: `frontend/lib/formatters.ts`
- Modify: `frontend/components/staff-workspace.tsx`
- Modify: `frontend/components/request-table.tsx`
- Inspect/possibly modify: `frontend/components/leave-calendar.tsx`
- Inspect/possibly modify: `frontend/components/leave-dashboard.tsx`

## Implementation Steps

1. Add frontend leave-session type and `leaveSession` field to `LeaveRequestRecord`.
2. Update API DTO types and `mapLeaveRequestFromApi` to map backend response field.
3. Update `createLeaveRequest` input and payload to include selected session.
4. Update `LeaveDashboard.handleSubmit` signature and pass-through.
5. Update `StaffWorkspace`:
   - add state default `FULL_DAY`;
   - render a segmented/select control for session;
   - validate selected session;
   - reset selected session after successful submit;
   - update duplicate check to include session if business rule permits half-day split.
6. Update mock data in `leave-management-sample-data.ts`:
   - pending morning request;
   - approved afternoon request;
   - rejected full-day request.
7. Update `RequestTable` to show session as a column or compact text under date.
8. Update `LeaveCalendar` if it currently only shows date/status and needs session labels in day cells.
9. Update modal request detail in `LeaveDashboard` if it shows date/reason/status only.
10. Keep labels concise; avoid explanatory text blocks in app UI.

## Success Criteria

- [ ] Staff UI can submit morning, afternoon, and full-day leave.
- [ ] Mock data renders all three leave sessions.
- [ ] Table/calendar/detail views show the session clearly.
- [ ] TypeScript catches missing session in new mock records.
- [ ] Existing login, staff/admin views still render.

## Risk Assessment

Risk: allowing same-date morning and afternoon may conflict with backend duplicate validation.
Mitigation: align duplicate check with backend rule from Phase 1; if backend still blocks any same-date request, keep frontend message explicit.

Risk: touched components are already near/over 200 lines.
Mitigation: extract label/option helpers instead of growing component logic.

## Unresolved Questions

- Should staff be allowed to request both morning and afternoon on same date as two separate requests?
