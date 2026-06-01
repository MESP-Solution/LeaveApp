export type AuthenticatedStaff = {
  email: string;
  fullName: string;
  id: number;
  leaveCredit: number;
  role: string;
  departmentId: number | null;
};

export type JwtPayload = {
  email: string;
  role: string;
  sub: number;
};
