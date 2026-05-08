---
phase: 1
title: Analyze Contract
status: completed
priority: P1
effort: 30m
dependencies: []
---

# Phase 1: Analyze Contract

## Overview

Confirm the backend request/response contract for partial-day leave before touching UI behavior. The frontend should not invent a field name if backend already has one.

## Requirements

- Functional: identify the exact DTO field and allowed values for morning, afternoon, full day.
- Non-functional: keep API mapping backward-compatible with older records if field missing.

## Architecture

Expected data flow:

```text
StaffWorkspace form
  -> createLeaveRequest(input)
  -> Next API route /api/leave-requests
  -> Nest backend /api/leave-requests
  -> mapLeaveRequestFromApi(response)
  -> RequestTable / LeaveCalendar
```

The field should live on `LeaveRequestRecord` and be mapped from backend DTO.

## Related Code Files

- Read: `backend/src/leave-requests/dto/create-leave-request.dto.ts`
- Read: `backend/src/leave-requests/dto/leave-request-response.dto.ts`
- Read: `backend/src/leave-requests/leave-requests.service.ts`
- Read: `frontend/lib/leave-requests-api.ts`
- Read: `frontend/lib/leave-app-mappers.ts`
- Modify later: `frontend/types/leave-app.ts`

## Implementation Steps

1. Inspect backend DTO/entity/service for partial-day field and enum values.
2. Confirm whether backend returns this field in list/detail responses.
3. Decide frontend type name and mapping:
   - Prefer backend name if readable.
   - Otherwise use `leaveSession` internally and map at API boundary.
4. Define fallback behavior for records without value: default display to full day only if backend legacy data lacks the field.
5. Note any backend mismatch before Phase 2.

## Success Criteria

- [ ] Backend field name and allowed values confirmed.
- [ ] Frontend internal type shape documented.
- [ ] Backward-compatible fallback decided.
- [ ] No code changes yet beyond plan execution tracking.

## Risk Assessment

Risk: frontend sends wrong field name and create request silently ignores duration.
Mitigation: verify DTO and response before implementation.

## Unresolved Questions

- None after contract check; if field absent, escalate before implementing API wiring.
