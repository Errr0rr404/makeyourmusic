/*
  Warnings:

  - You are about to drop the column `stripe_payment_intent_id` on the `orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,product_id,variant_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_number]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pos_transaction_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paypal_order_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bkash_transaction_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nagad_transaction_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rocket_transaction_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bitcoin_address]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bitcoin_transaction_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ethereum_address]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ethereum_transaction_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referral_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_number` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('PAY_NOW', 'PAY_AT_STORE');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'POS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY', 'AMAZON_PAY', 'BKASH', 'NAGAD', 'ROCKET', 'BITCOIN', 'ETHEREUM', 'CASH', 'MANUAL_CREDIT_CARD');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('PRODUCT_SUBSCRIPTION', 'PLAN_SUBSCRIPTION', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'CONFIRMED', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatusEnum" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PosTransactionType" AS ENUM ('SALE', 'RETURN', 'REFUND');

-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'CARD', 'MIXED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MASTERMIND';
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- DropIndex
DROP INDEX "cart_items_user_id_product_id_key";

-- DropIndex
DROP INDEX "orders_stripe_payment_intent_id_key";

-- DropIndex
DROP INDEX "payments_stripe_payment_intent_id_idx";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "special_instructions" TEXT,
ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "stripe_payment_intent_id",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_reason" TEXT,
ADD COLUMN     "delivery_method" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "estimated_delivery" TIMESTAMP(3),
ADD COLUMN     "estimated_pickup" TIMESTAMP(3),
ADD COLUMN     "estimated_ready_time" TIMESTAMP(3),
ADD COLUMN     "location_id" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "order_number" TEXT NOT NULL,
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "payment_timing" "PaymentTiming" NOT NULL DEFAULT 'PAY_NOW',
ADD COLUMN     "pickup_address" JSONB,
ADD COLUMN     "pos_session_id" TEXT,
ADD COLUMN     "pos_transaction_id" TEXT,
ADD COLUMN     "promo_code" TEXT,
ADD COLUMN     "scheduled_for" TIMESTAMP(3),
ADD COLUMN     "shipping_carrier" TEXT,
ADD COLUMN     "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tip_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "tracking_number" TEXT,
ALTER COLUMN "shipping_address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bitcoin_address" TEXT,
ADD COLUMN     "bitcoin_transaction_id" TEXT,
ADD COLUMN     "bkash_transaction_id" TEXT,
ADD COLUMN     "crypto_amount" DECIMAL(20,8),
ADD COLUMN     "ethereum_address" TEXT,
ADD COLUMN     "ethereum_transaction_id" TEXT,
ADD COLUMN     "exchange_rate" DECIMAL(20,8),
ADD COLUMN     "exchange_rate_expiry" TIMESTAMP(3),
ADD COLUMN     "gateway_response" JSONB,
ADD COLUMN     "gateway_transaction_id" TEXT,
ADD COLUMN     "nagad_transaction_id" TEXT,
ADD COLUMN     "network_confirmations" INTEGER DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "paypal_order_id" TEXT,
ADD COLUMN     "required_confirmations" INTEGER,
ADD COLUMN     "rocket_transaction_id" TEXT,
ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "compare_price" DECIMAL(10,2),
ADD COLUMN     "delivery_time_minutes" INTEGER,
ADD COLUMN     "dietary_info" JSONB,
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menu_section_id" TEXT,
ADD COLUMN     "nutrition_info" JSONB,
ADD COLUMN     "prep_time_minutes" INTEGER,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "weight" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "loyalty_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by" TEXT;

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "shared_with_company" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "metadata" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_purchase" DECIMAL(10,2),
    "max_discount" DECIMAL(10,2),
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_relations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "related_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recently_viewed" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "product_id" TEXT NOT NULL,
    "session_id" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recently_viewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "responded_by" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "products" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_config" (
    "id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL DEFAULT 'MakeYourPlatform',
    "store_type" TEXT NOT NULL DEFAULT 'general',
    "tagline" TEXT,
    "description" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '221 83% 53%',
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "banner_image_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "currency_symbol" TEXT NOT NULL DEFAULT '$',
    "country" TEXT DEFAULT 'US',
    "language" TEXT NOT NULL DEFAULT 'en',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "business_hours" TEXT,
    "facebook_url" TEXT,
    "twitter_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "footer_text" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "hero_title" TEXT,
    "hero_subtitle" TEXT,
    "hero_button_text" TEXT,
    "hero_button_2_text" TEXT,
    "hero_button_2_url" TEXT,
    "hero_particles_enabled" BOOLEAN NOT NULL DEFAULT false,
    "hero_particles_density" INTEGER DEFAULT 50,
    "hero_particles_speed" DECIMAL(3,2) DEFAULT 1.0,
    "hero_particles_color" TEXT,
    "hero_particles_type" TEXT DEFAULT 'dots',
    "features_enabled" BOOLEAN NOT NULL DEFAULT true,
    "features_json" JSONB,
    "show_hero" BOOLEAN NOT NULL DEFAULT true,
    "show_features" BOOLEAN NOT NULL DEFAULT true,
    "show_featured_products" BOOLEAN NOT NULL DEFAULT true,
    "show_recently_viewed" BOOLEAN NOT NULL DEFAULT true,
    "featured_products_title" TEXT,
    "featured_products_subtitle" TEXT,
    "featured_products_limit" INTEGER DEFAULT 8,
    "chatbot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "wishlist_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "recently_viewed_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pay_at_store_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pos_enabled" BOOLEAN NOT NULL DEFAULT false,
    "guest_checkout_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cash_on_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "buy_now_pay_later_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_order_amount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_order_amount" DECIMAL(10,2),
    "customer_accounts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "saved_payment_methods_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multiple_addresses_enabled" BOOLEAN NOT NULL DEFAULT false,
    "back_in_stock_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "loyalty_program_enabled" BOOLEAN NOT NULL DEFAULT false,
    "referral_program_enabled" BOOLEAN NOT NULL DEFAULT false,
    "gift_cards_enabled" BOOLEAN NOT NULL DEFAULT false,
    "gift_wrapping_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_variants_enabled" BOOLEAN NOT NULL DEFAULT true,
    "product_categories_enabled" BOOLEAN NOT NULL DEFAULT true,
    "related_products_enabled" BOOLEAN NOT NULL DEFAULT true,
    "product_search_enabled" BOOLEAN NOT NULL DEFAULT true,
    "search_autocomplete_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_quick_view_enabled" BOOLEAN NOT NULL DEFAULT false,
    "image_zoom_enabled" BOOLEAN NOT NULL DEFAULT false,
    "inventory_management_enabled" BOOLEAN NOT NULL DEFAULT true,
    "promo_codes_enabled" BOOLEAN NOT NULL DEFAULT true,
    "promotional_discount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "promotional_discount_type" TEXT,
    "promotional_discount_value" DECIMAL(10,2),
    "promotional_discount_valid_from" TIMESTAMP(3),
    "promotional_discount_valid_until" TIMESTAMP(3),
    "promotional_discount_active" BOOLEAN NOT NULL DEFAULT false,
    "flash_sales_enabled" BOOLEAN NOT NULL DEFAULT false,
    "newsletter_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_marketing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "contact_form_enabled" BOOLEAN NOT NULL DEFAULT true,
    "live_chat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "order_tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "print_receipt_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_language_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_currency_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tax_calculation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "shipping_zones_enabled" BOOLEAN NOT NULL DEFAULT false,
    "blog_enabled" BOOLEAN NOT NULL DEFAULT false,
    "breadcrumbs_navigation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advanced_pagination_enabled" BOOLEAN NOT NULL DEFAULT false,
    "social_media_integration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "analytics_tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "subscription_orders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "store_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "store_hours" JSONB,
    "holiday_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
    "holiday_mode_until" TIMESTAMP(3),
    "maintenance_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT,
    "store_pickup_address" JSONB,
    "stripe_enabled" BOOLEAN NOT NULL DEFAULT true,
    "paypal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "apple_pay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "google_pay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "amazon_pay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bkash_enabled" BOOLEAN NOT NULL DEFAULT false,
    "nagad_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rocket_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bitcoin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ethereum_enabled" BOOLEAN NOT NULL DEFAULT false,
    "manual_credit_card_enabled" BOOLEAN NOT NULL DEFAULT false,
    "navigation_items" JSONB,
    "table_reservations_enabled" BOOLEAN NOT NULL DEFAULT false,
    "menu_builder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dietary_filters_enabled" BOOLEAN NOT NULL DEFAULT false,
    "prep_time_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_time_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ingredient_list_enabled" BOOLEAN NOT NULL DEFAULT false,
    "allergen_warnings_enabled" BOOLEAN NOT NULL DEFAULT false,
    "meal_combo_builder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "nutritional_info_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_variants_enabled_restaurant" BOOLEAN NOT NULL DEFAULT false,
    "order_scheduling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_location_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tipping_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tipping_default_percentages" JSONB,
    "loyalty_stamps_enabled" BOOLEAN NOT NULL DEFAULT false,
    "loyalty_stamps_required" INTEGER DEFAULT 10,
    "appointment_booking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_packages_enabled" BOOLEAN NOT NULL DEFAULT false,
    "staff_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_duration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "client_history_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recurring_appointments_enabled" BOOLEAN NOT NULL DEFAULT false,
    "resource_booking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_addons_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_policies_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "before_after_photos_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_areas_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subscription_plans_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recurring_billing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "trial_periods_enabled" BOOLEAN NOT NULL DEFAULT false,
    "plan_upgrades_downgrades_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pause_resume_subscriptions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subscription_dashboard_enabled" BOOLEAN NOT NULL DEFAULT false,
    "proration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dunning_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "gift_subscriptions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "family_group_plans_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advanced_calendar_enabled" BOOLEAN NOT NULL DEFAULT false,
    "buffer_times_enabled" BOOLEAN NOT NULL DEFAULT false,
    "waiting_lists_enabled" BOOLEAN NOT NULL DEFAULT false,
    "class_workshop_bookings_enabled" BOOLEAN NOT NULL DEFAULT false,
    "service_categories_enabled" BOOLEAN NOT NULL DEFAULT false,
    "intake_forms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "video_consultations_enabled" BOOLEAN NOT NULL DEFAULT false,
    "appointment_reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "no_show_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "staff_availability_enabled" BOOLEAN NOT NULL DEFAULT false,
    "instant_digital_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "license_key_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "download_limits_enabled" BOOLEAN NOT NULL DEFAULT false,
    "file_hosting_enabled" BOOLEAN NOT NULL DEFAULT false,
    "course_progress_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "access_expiration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bulk_license_purchases_enabled" BOOLEAN NOT NULL DEFAULT false,
    "affiliate_system_enabled" BOOLEAN NOT NULL DEFAULT false,
    "software_updates_enabled" BOOLEAN NOT NULL DEFAULT false,
    "preview_free_samples_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rental_duration_selection_enabled" BOOLEAN NOT NULL DEFAULT false,
    "date_range_picker_enabled" BOOLEAN NOT NULL DEFAULT false,
    "availability_calendar_enabled" BOOLEAN NOT NULL DEFAULT false,
    "deposit_security_hold_enabled" BOOLEAN NOT NULL DEFAULT false,
    "late_return_fees_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_pickup_scheduling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "damage_reporting_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rental_agreements_enabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_scheduling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rental_waiting_lists_enabled" BOOLEAN NOT NULL DEFAULT false,
    "marketplace_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_registration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_dashboard_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_reviews_enabled" BOOLEAN NOT NULL DEFAULT false,
    "split_payments_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_analytics_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_storefronts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vendor_messaging_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dispute_resolution_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_calendar_enabled" BOOLEAN NOT NULL DEFAULT false,
    "seat_table_selection_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ticket_types_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_capacity_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "early_bird_pricing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "group_discounts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "qr_code_tickets_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_waitlist_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_hosting_enabled" BOOLEAN NOT NULL DEFAULT false,
    "event_packages_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_zones_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_fee_calculator_enabled" BOOLEAN NOT NULL DEFAULT false,
    "same_day_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_driver_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "real_time_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_instructions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tip_for_driver_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_address_orders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_deliveries_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_order_free_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "customization_options_enabled" BOOLEAN NOT NULL DEFAULT false,
    "made_to_order_items_enabled" BOOLEAN NOT NULL DEFAULT false,
    "custom_quote_requests_enabled" BOOLEAN NOT NULL DEFAULT false,
    "production_status_enabled" BOOLEAN NOT NULL DEFAULT false,
    "materials_origin_info_enabled" BOOLEAN NOT NULL DEFAULT false,
    "artist_brand_stories_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_requests_enabled" BOOLEAN NOT NULL DEFAULT false,
    "limited_editions_enabled" BOOLEAN NOT NULL DEFAULT false,
    "in_progress_photos_enabled" BOOLEAN NOT NULL DEFAULT false,
    "backorder_support_enabled" BOOLEAN NOT NULL DEFAULT false,
    "wholesale_pricing_tiers_enabled" BOOLEAN NOT NULL DEFAULT false,
    "business_account_registration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "credit_terms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "po_support_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bulk_order_forms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_order_quantities_enabled" BOOLEAN NOT NULL DEFAULT false,
    "catalog_pricing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tax_exempt_handling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sales_rep_assignment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "credit_limits_enabled" BOOLEAN NOT NULL DEFAULT false,
    "abandoned_cart_recovery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_comparison_enabled" BOOLEAN NOT NULL DEFAULT false,
    "bulk_ordering_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pre_orders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "customer_groups_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advanced_filtering_enabled" BOOLEAN NOT NULL DEFAULT false,
    "gift_registry_enabled" BOOLEAN NOT NULL DEFAULT false,
    "social_sharing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_warehouse_inventory_enabled" BOOLEAN NOT NULL DEFAULT false,
    "barcode_qr_scanning_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advanced_analytics_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_marketing_integration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "customer_support_tickets_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_qa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "video_product_demos_enabled" BOOLEAN NOT NULL DEFAULT false,
    "product_360_views_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ar_vr_product_preview_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SIZE',
    "sku" TEXT,
    "price_modifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2),
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" TEXT NOT NULL,
    "combo_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "is_allergen" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_allergens" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "allergen_type" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'CONTAINS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_reservations" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_number" TEXT,
    "reservation_date" TIMESTAMP(3) NOT NULL,
    "reservation_time" TIMESTAMP(3) NOT NULL,
    "party_size" INTEGER NOT NULL,
    "special_requests" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT,
    "plan_name" TEXT NOT NULL,
    "plan_type" "SubscriptionType" NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "pause_until" TIMESTAMP(3),
    "billing_day_of_month" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "gateway_transaction_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_changes" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "service_id" TEXT,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "canceled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "reminder_time" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "file_url" TEXT,
    "download_limit" INTEGER,
    "expires_after_days" INTEGER,
    "license_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_downloads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT,
    "digital_product_id" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_downloaded_at" TIMESTAMP(3),

    CONSTRAINT "digital_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "digital_product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "key" TEXT NOT NULL,
    "activation_count" INTEGER NOT NULL DEFAULT 0,
    "max_activations" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_returned" BOOLEAN NOT NULL DEFAULT false,
    "late_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "condition_before" TEXT,
    "condition_after" TEXT,
    "damage_report" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "venue_address" JSONB,
    "capacity" INTEGER NOT NULL,
    "ticket_price" DECIMAL(10,2) NOT NULL,
    "early_bird_price" DECIMAL(10,2),
    "early_bird_until" TIMESTAMP(3),
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT,
    "user_id" TEXT,
    "ticket_type" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "seat_number" TEXT,
    "table_number" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "scanned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_waitlist" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abandoned_carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "email" TEXT,
    "cart_data" JSONB NOT NULL,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMP(3),
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recovered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatusEnum" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_questions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answered_by" TEXT,
    "answered_at" TIMESTAMP(3),
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "opening_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(10,2),
    "expected_cash" DECIMAL(10,2),
    "actual_cash" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_transactions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "order_id" TEXT,
    "transaction_type" "PosTransactionType" NOT NULL DEFAULT 'SALE',
    "payment_method" "PosPaymentMethod" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "cash_amount" DECIMAL(10,2) DEFAULT 0,
    "card_amount" DECIMAL(10,2) DEFAULT 0,
    "customer_email" TEXT,
    "customer_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wishlist_items_user_id_idx" ON "wishlist_items"("user_id");

-- CreateIndex
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items"("product_id");

-- CreateIndex
CREATE INDEX "wishlist_items_shared_with_company_idx" ON "wishlist_items"("shared_with_company");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_user_id_product_id_key" ON "wishlist_items"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "saved_payment_methods_user_id_idx" ON "saved_payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "saved_payment_methods_payment_method_idx" ON "saved_payment_methods"("payment_method");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_active_idx" ON "promo_codes"("active");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE INDEX "product_relations_product_id_idx" ON "product_relations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_relations_product_id_related_id_key" ON "product_relations"("product_id", "related_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "recently_viewed_user_id_idx" ON "recently_viewed"("user_id");

-- CreateIndex
CREATE INDEX "recently_viewed_session_id_idx" ON "recently_viewed"("session_id");

-- CreateIndex
CREATE INDEX "recently_viewed_product_id_idx" ON "recently_viewed"("product_id");

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_session_id_key" ON "chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_sessions_session_id_idx" ON "chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "menu_sections_active_idx" ON "menu_sections"("active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_variants_type_idx" ON "product_variants"("type");

-- CreateIndex
CREATE INDEX "product_variants_active_idx" ON "product_variants"("active");

-- CreateIndex
CREATE INDEX "combos_active_idx" ON "combos"("active");

-- CreateIndex
CREATE INDEX "combo_items_combo_id_idx" ON "combo_items"("combo_id");

-- CreateIndex
CREATE INDEX "combo_items_product_id_idx" ON "combo_items"("product_id");

-- CreateIndex
CREATE INDEX "product_ingredients_product_id_idx" ON "product_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "product_ingredients_is_allergen_idx" ON "product_ingredients"("is_allergen");

-- CreateIndex
CREATE INDEX "product_allergens_product_id_idx" ON "product_allergens"("product_id");

-- CreateIndex
CREATE INDEX "product_allergens_allergen_type_idx" ON "product_allergens"("allergen_type");

-- CreateIndex
CREATE UNIQUE INDEX "product_allergens_product_id_allergen_type_key" ON "product_allergens"("product_id", "allergen_type");

-- CreateIndex
CREATE UNIQUE INDEX "table_reservations_order_id_key" ON "table_reservations"("order_id");

-- CreateIndex
CREATE INDEX "table_reservations_user_id_idx" ON "table_reservations"("user_id");

-- CreateIndex
CREATE INDEX "table_reservations_order_id_idx" ON "table_reservations"("order_id");

-- CreateIndex
CREATE INDEX "table_reservations_reservation_date_idx" ON "table_reservations"("reservation_date");

-- CreateIndex
CREATE INDEX "table_reservations_reservation_time_idx" ON "table_reservations"("reservation_time");

-- CreateIndex
CREATE INDEX "table_reservations_status_idx" ON "table_reservations"("status");

-- CreateIndex
CREATE INDEX "locations_active_idx" ON "locations"("active");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_product_id_idx" ON "subscriptions"("product_id");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_due_date_idx" ON "subscription_payments"("due_date");

-- CreateIndex
CREATE INDEX "subscription_changes_subscription_id_idx" ON "subscription_changes"("subscription_id");

-- CreateIndex
CREATE INDEX "appointments_user_id_idx" ON "appointments"("user_id");

-- CreateIndex
CREATE INDEX "appointments_staff_id_idx" ON "appointments"("staff_id");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointment_id_idx" ON "appointment_reminders"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_reminders_sent_idx" ON "appointment_reminders"("sent");

-- CreateIndex
CREATE UNIQUE INDEX "digital_products_product_id_key" ON "digital_products"("product_id");

-- CreateIndex
CREATE INDEX "digital_products_product_id_idx" ON "digital_products"("product_id");

-- CreateIndex
CREATE INDEX "digital_downloads_user_id_idx" ON "digital_downloads"("user_id");

-- CreateIndex
CREATE INDEX "digital_downloads_product_id_idx" ON "digital_downloads"("product_id");

-- CreateIndex
CREATE INDEX "digital_downloads_order_id_idx" ON "digital_downloads"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_key_key" ON "license_keys"("key");

-- CreateIndex
CREATE INDEX "license_keys_user_id_idx" ON "license_keys"("user_id");

-- CreateIndex
CREATE INDEX "license_keys_digital_product_id_idx" ON "license_keys"("digital_product_id");

-- CreateIndex
CREATE INDEX "license_keys_key_idx" ON "license_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_order_id_key" ON "rentals"("order_id");

-- CreateIndex
CREATE INDEX "rentals_user_id_idx" ON "rentals"("user_id");

-- CreateIndex
CREATE INDEX "rentals_product_id_idx" ON "rentals"("product_id");

-- CreateIndex
CREATE INDEX "rentals_status_idx" ON "rentals"("status");

-- CreateIndex
CREATE INDEX "rentals_start_date_idx" ON "rentals"("start_date");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "events_active_idx" ON "events"("active");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_code_key" ON "tickets"("qr_code");

-- CreateIndex
CREATE INDEX "tickets_event_id_idx" ON "tickets"("event_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_qr_code_idx" ON "tickets"("qr_code");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "event_waitlist_event_id_idx" ON "event_waitlist"("event_id");

-- CreateIndex
CREATE INDEX "event_waitlist_user_id_idx" ON "event_waitlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_waitlist_event_id_user_id_key" ON "event_waitlist"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_user_id_idx" ON "abandoned_carts"("user_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_session_id_idx" ON "abandoned_carts"("session_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_email_idx" ON "abandoned_carts"("email");

-- CreateIndex
CREATE INDEX "abandoned_carts_recovered_idx" ON "abandoned_carts"("recovered");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "product_questions_product_id_idx" ON "product_questions"("product_id");

-- CreateIndex
CREATE INDEX "product_questions_user_id_idx" ON "product_questions"("user_id");

-- CreateIndex
CREATE INDEX "product_questions_answered_at_idx" ON "product_questions"("answered_at");

-- CreateIndex
CREATE INDEX "pos_sessions_manager_id_idx" ON "pos_sessions"("manager_id");

-- CreateIndex
CREATE INDEX "pos_sessions_status_idx" ON "pos_sessions"("status");

-- CreateIndex
CREATE INDEX "pos_sessions_opened_at_idx" ON "pos_sessions"("opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_transactions_order_id_key" ON "pos_transactions"("order_id");

-- CreateIndex
CREATE INDEX "pos_transactions_session_id_idx" ON "pos_transactions"("session_id");

-- CreateIndex
CREATE INDEX "pos_transactions_order_id_idx" ON "pos_transactions"("order_id");

-- CreateIndex
CREATE INDEX "pos_transactions_transaction_type_idx" ON "pos_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "pos_transactions_payment_method_idx" ON "pos_transactions"("payment_method");

-- CreateIndex
CREATE INDEX "pos_transactions_created_at_idx" ON "pos_transactions"("created_at");

-- CreateIndex
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_product_id_variant_id_key" ON "cart_items"("user_id", "product_id", "variant_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_pos_transaction_id_key" ON "orders"("pos_transaction_id");

-- CreateIndex
CREATE INDEX "orders_payment_method_idx" ON "orders"("payment_method");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_delivery_method_idx" ON "orders"("delivery_method");

-- CreateIndex
CREATE INDEX "orders_payment_timing_idx" ON "orders"("payment_timing");

-- CreateIndex
CREATE INDEX "orders_location_id_idx" ON "orders"("location_id");

-- CreateIndex
CREATE INDEX "orders_scheduled_for_idx" ON "orders"("scheduled_for");

-- CreateIndex
CREATE INDEX "orders_source_idx" ON "orders"("source");

-- CreateIndex
CREATE INDEX "orders_pos_session_id_idx" ON "orders"("pos_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paypal_order_id_key" ON "payments"("paypal_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bkash_transaction_id_key" ON "payments"("bkash_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_nagad_transaction_id_key" ON "payments"("nagad_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_rocket_transaction_id_key" ON "payments"("rocket_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bitcoin_address_key" ON "payments"("bitcoin_address");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bitcoin_transaction_id_key" ON "payments"("bitcoin_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ethereum_address_key" ON "payments"("ethereum_address");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ethereum_transaction_id_key" ON "payments"("ethereum_transaction_id");

-- CreateIndex
CREATE INDEX "payments_gateway_transaction_id_idx" ON "payments"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_bitcoin_address_idx" ON "payments"("bitcoin_address");

-- CreateIndex
CREATE INDEX "payments_ethereum_address_idx" ON "payments"("ethereum_address");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_menu_section_id_idx" ON "products"("menu_section_id");

-- CreateIndex
CREATE INDEX "products_featured_idx" ON "products"("featured");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_menu_section_id_fkey" FOREIGN KEY ("menu_section_id") REFERENCES "menu_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_id_fkey" FOREIGN KEY ("related_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_downloads" ADD CONSTRAINT "digital_downloads_digital_product_id_fkey" FOREIGN KEY ("digital_product_id") REFERENCES "digital_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_digital_product_id_fkey" FOREIGN KEY ("digital_product_id") REFERENCES "digital_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
