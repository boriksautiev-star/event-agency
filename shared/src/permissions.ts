import { Role } from "./roles";

export const PERMISSIONS = {
  ORDERS_READ: "orders:read",
  ORDERS_WRITE: "orders:write",
  ORDERS_ASSIGN: "orders:assign",
  ORDERS_STATUS_OWN: "orders:status:own",
  CLIENTS_READ: "clients:read",
  CLIENTS_WRITE: "clients:write",
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  ANALYTICS_READ: "analytics:read",
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
  RATE_GROUPS_READ: "rate-groups:read",
  RATE_GROUPS_WRITE: "rate-groups:write",
  CHARACTERS_READ: "characters:read",
  CHARACTERS_WRITE: "characters:write",
  RATES_READ: "rates:read",
  RATES_WRITE: "rates:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  director: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_ASSIGN,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.RATE_GROUPS_READ,
    PERMISSIONS.RATE_GROUPS_WRITE,
    PERMISSIONS.CHARACTERS_READ,
    PERMISSIONS.CHARACTERS_WRITE,
    PERMISSIONS.RATES_READ,
    PERMISSIONS.RATES_WRITE,
  ],
  admin: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_ASSIGN,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.RATE_GROUPS_READ,
    PERMISSIONS.CHARACTERS_READ,
    PERMISSIONS.RATES_READ,
  ],
  animator: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_STATUS_OWN,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}