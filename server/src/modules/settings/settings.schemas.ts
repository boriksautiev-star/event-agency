export type UpdateSettingsInput = {
  name?: string;
  legalName?: string | null;
  inn?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  timezone?: string;
  currency?: string;
  paymentDetails?: string | null;
  logoUrl?: string | null;
  defaultPrepaymentPercent?: number;
};
