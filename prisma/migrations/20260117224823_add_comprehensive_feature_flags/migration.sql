-- AlterTable: Add shipping and book reservation flags
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='shipping_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "shipping_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='book_reservation_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "book_reservation_enabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- AlterTable: Add new page and navigation feature flags
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='help_page_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "help_page_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='privacy_page_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "privacy_page_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='terms_page_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "terms_page_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='footer_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "footer_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='social_media_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "social_media_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='theme_toggle_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "theme_toggle_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='cart_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "cart_enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- AlterTable: Add missing Location fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='code') THEN
        ALTER TABLE "locations" ADD COLUMN "code" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='address_text') THEN
        ALTER TABLE "locations" ADD COLUMN "address_text" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='is_active') THEN
        ALTER TABLE "locations" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='settings') THEN
        ALTER TABLE "locations" ADD COLUMN "settings" JSONB;
    END IF;
END $$;

-- CreateIndex: Add unique constraint on location code
CREATE UNIQUE INDEX IF NOT EXISTS "locations_code_key" ON "locations"("code");

-- AlterTable: Add held_orders to pos_sessions (baseline existing column)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_sessions' AND column_name='held_orders') THEN
        ALTER TABLE "pos_sessions" ADD COLUMN "held_orders" JSONB;
    END IF;
END $$;
