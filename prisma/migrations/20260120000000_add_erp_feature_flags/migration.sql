-- Add ERP module feature flags to StoreConfig
-- These flags allow MASTERMIND users to enable/disable individual ERP modules

ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "accounting_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "crm_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "projects_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "hr_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "document_management_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "workflows_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "ai_insights_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_config" ADD COLUMN IF NOT EXISTS "business_intelligence_enabled" BOOLEAN NOT NULL DEFAULT false;
