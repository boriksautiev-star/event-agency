export const ASSIGNMENT_STATUS = {
  INVITED: "invited",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  REMOVED: "removed",
  COMPLETED: "completed",
} as const;

export type AssignmentStatus =
  (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  invited: "Приглашён",
  accepted: "Подтвердил",
  declined: "Отказался",
  removed: "Снят",
  completed: "Выполнил",
};
