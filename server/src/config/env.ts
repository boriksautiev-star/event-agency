import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env variable: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3100),
  appUrl: process.env.APP_URL ?? "http://localhost:3100",
  appName: process.env.APP_NAME ?? "Event Agency",
  timezone: process.env.TIMEZONE ?? "Europe/Moscow",
  currency: process.env.CURRENCY ?? "RUB",
  defaultLocale: process.env.DEFAULT_LOCALE ?? "ru",

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "30d",
  },

  setupToken: process.env.SETUP_TOKEN ?? "",
} as const;
