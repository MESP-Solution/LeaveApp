# Plan: Staff Department Selection + One-HEAD-per-Department + Admin Exempt

**Date:** 2026-06-01 | **Branch:** main | **Mode:** cook (interactive)

## Goal
1. UI: creating a staff must select a department (required for non-ADMIN).
2. Backend: each department has exactly one HEAD (block 2nd HEAD with 409).
3. ADMIN does not need a department (department_id nullable).

## Decisions
- Department required for STAFF/MANAGER/HEAD; ADMIN → null (departmentId ignored).
- 2nd HEAD in same dept → `ConflictException` 409.

## Backend changes
- `database/entities/staff.entity.ts` — `department` nullable ManyToOne.
- `staffs/dto/create-staff.dto.ts` — `departmentId` optional.
- `staffs/staffs.service.ts`
  - `create()`: ADMIN → no dept; non-ADMIN → require + resolve dept; HEAD → `ensureSingleHead`.
  - `update()`: enforce HEAD uniqueness on role/department change.
  - add `ensureSingleHead(departmentId, excludeId?)` helper.
  - `resolveDepartment` returns optional.
- new migration: `department_id` → nullable; drop NOT NULL.
- update mikro-orm snapshot for nullable column.
- `staffs.service.spec.ts` — add HEAD-uniqueness + admin-no-dept tests.

## Frontend changes
- `types/leave-app.ts` — `DepartmentRecord`; `departmentId?` on StaffRecord.
- `lib/department-api.ts` (new) — `fetchDepartments()`.
- `app/api/departments/route.ts` (new) — proxy GET to backend.
- `lib/staff-api.ts` — `CreateStaffInput.departmentId`.
- `components/admin-create-staff-modal.tsx` — department `<select>`, required unless ADMIN.
- `components/admin-workspace.tsx` — thread `departments` prop + type.
- `components/leave-dashboard.tsx` — fetch departments, pass down, include departmentId.

## Status
- [x] Backend entity/dto/service/migration
- [x] Backend tests (34/34 pass; create + update HEAD rules, admin-no-dept)
- [x] Frontend api + lib + modal + wiring
- [x] Build + tests + review (tsc clean both sides; next build OK)

## Post-review fixes applied
- update() now enforces "non-ADMIN requires department" + ADMIN clears dept + HEAD uniqueness (self-excluded).
- Migration down() re-attaches null department_id to first dept before restoring NOT NULL.
- remove() uses .toUpperCase() for ADMIN check; update() uses typeof check for departmentId.

## Known/accepted (YAGNI)
- ensureSingleHead has a theoretical race (no DB unique constraint) — acceptable at current scale.
