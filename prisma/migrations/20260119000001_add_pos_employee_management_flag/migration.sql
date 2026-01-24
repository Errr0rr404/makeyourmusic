-- Add pos_employee_management_enabled feature flag
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "pos_employee_management_enabled" BOOLEAN NOT NULL DEFAULT false;
