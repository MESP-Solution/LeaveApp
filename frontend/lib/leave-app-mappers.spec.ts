import assert from "node:assert/strict";
import { mapLeaveRequestFromApi, mapStaffFromApi, roleNameToId } from "./leave-app-mappers";

const mappedStaff = mapStaffFromApi({
  id: 10,
  fullName: "Demo User",
  email: "demo@company.local",
  role: "HEAD",
  leaveCredit: 15,
  createdAt: "2026-05-07T00:00:00.000Z",
});
assert.equal(mappedStaff.roleId, 3);
assert.equal(mappedStaff.email, "demo@company.local");

const mappedRequest = mapLeaveRequestFromApi({
  id: 1,
  staffId: 10,
  leaveDate: "2026-05-07",
  type: "FULL",
  reason: "Personal",
  status: "approved",
  createdAt: "2026-05-07T00:00:00.000Z",
  processedAt: "2026-05-07T01:00:00.000Z",
});
assert.equal(mappedRequest.status, "APPROVED");
assert.equal(mappedRequest.type_leave, "FULL");
assert.equal(mappedRequest.updatedAt, "2026-05-07T01:00:00.000Z");

const mappedMorningRequest = mapLeaveRequestFromApi({
  id: 2,
  staffId: 10,
  leaveDate: "2026-05-08",
  type: "MORNING",
  reason: "Personal",
  status: "pending",
  createdAt: "2026-05-08T00:00:00.000Z",
});
assert.equal(mappedMorningRequest.type_leave, "MORNING");

assert.equal(roleNameToId("ADMIN"), 4);
assert.equal(roleNameToId("unknown"), 1);
