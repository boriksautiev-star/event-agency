export const ROLES = {
  DIRECTOR: "director",
  ADMIN: "admin",
  ANIMATOR: "animator",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  director: "Генеральный директор",
  admin: "Администратор",
  animator: "Аниматор",
};
