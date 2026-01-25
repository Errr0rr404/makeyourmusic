/*
  Warnings:

  - The values [RETURNED,REFUNDED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [BREAK_DEDUCTION,COMMISSION,TAX_FEDERAL,TAX_STATE,TAX_LOCAL,DEDUCTION_HEALTH,DEDUCTION_RETIREMENT,DEDUCTION_OTHER,ADJUSTMENT] on the enum `PayrollItemType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CUSTOMER,MASTERMIND,MANAGER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `created_at` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `price_at_purchase` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `special_instructions` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `variant_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `billing_address` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_reason` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_method` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_delivery` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_pickup` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_ready_time` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `location_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `order_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_timing` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_address` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `pos_session_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `pos_transaction_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `promo_code` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_for` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_address` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_carrier` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_cost` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `tip_amount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `time_clock_id` on the `payroll_items` table. All the data in the column will be lost.
  - You are about to drop the column `bonuses` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `break_hours` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `overtime_multiplier` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `overtime_pay` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `paid_by` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `regular_pay` on the `payrolls` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `compare_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_time_minutes` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `dietary_info` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `featured` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `image_urls` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `menu_section_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `nutrition_info` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `prep_time_minutes` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `filters` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `loyalty_points` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `referral_code` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `referred_by` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `abandoned_carts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `appointment_reminders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cart_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `combo_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `combos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `digital_downloads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `digital_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_waitlist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `license_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_status_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pos_employees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pos_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pos_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_allergens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_ingredients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_relations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_variants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promo_codes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recently_viewed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rentals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `saved_payment_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store_config` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_changes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_tickets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `table_reservations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticket_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tickets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `time_clocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wishlist_items` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `price` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Made the column `sku` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `report_type` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `data` on table `reports` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "appointment_reminders" DROP CONSTRAINT "appointment_reminders_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_session_id_fkey";

-- DropForeignKey
ALTER TABLE "combo_items" DROP CONSTRAINT "combo_items_combo_id_fkey";

-- DropForeignKey
ALTER TABLE "combo_items" DROP CONSTRAINT "combo_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "digital_downloads" DROP CONSTRAINT "digital_downloads_digital_product_id_fkey";

-- DropForeignKey
ALTER TABLE "digital_products" DROP CONSTRAINT "digital_products_product_id_fkey";

-- DropForeignKey
ALTER TABLE "event_waitlist" DROP CONSTRAINT "event_waitlist_event_id_fkey";

-- DropForeignKey
ALTER TABLE "license_keys" DROP CONSTRAINT "license_keys_digital_product_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "order_status_history" DROP CONSTRAINT "order_status_history_order_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_location_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_pos_session_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll_items" DROP CONSTRAINT "payroll_items_time_clock_id_fkey";

-- DropForeignKey
ALTER TABLE "payrolls" DROP CONSTRAINT "payrolls_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "pos_sessions" DROP CONSTRAINT "pos_sessions_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "pos_transactions" DROP CONSTRAINT "pos_transactions_order_id_fkey";

-- DropForeignKey
ALTER TABLE "pos_transactions" DROP CONSTRAINT "pos_transactions_session_id_fkey";

-- DropForeignKey
ALTER TABLE "product_allergens" DROP CONSTRAINT "product_allergens_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_ingredients" DROP CONSTRAINT "product_ingredients_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_questions" DROP CONSTRAINT "product_questions_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_relations" DROP CONSTRAINT "product_relations_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_relations" DROP CONSTRAINT "product_relations_related_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_menu_section_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_product_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saved_payment_methods" DROP CONSTRAINT "saved_payment_methods_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_changes" DROP CONSTRAINT "subscription_changes_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_payments" DROP CONSTRAINT "subscription_payments_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_product_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "table_reservations" DROP CONSTRAINT "table_reservations_order_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_event_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "time_clocks" DROP CONSTRAINT "time_clocks_location_id_fkey";

-- DropForeignKey
ALTER TABLE "wishlist_items" DROP CONSTRAINT "wishlist_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "wishlist_items" DROP CONSTRAINT "wishlist_items_user_id_fkey";

-- DropIndex
DROP INDEX "order_items_variant_id_idx";

-- DropIndex
DROP INDEX "orders_delivery_method_idx";

-- DropIndex
DROP INDEX "orders_location_id_idx";

-- DropIndex
DROP INDEX "orders_order_number_idx";

-- DropIndex
DROP INDEX "orders_order_number_key";

-- DropIndex
DROP INDEX "orders_payment_method_idx";

-- DropIndex
DROP INDEX "orders_payment_timing_idx";

-- DropIndex
DROP INDEX "orders_pos_session_id_idx";

-- DropIndex
DROP INDEX "orders_pos_transaction_id_key";

-- DropIndex
DROP INDEX "orders_scheduled_for_idx";

-- DropIndex
DROP INDEX "orders_source_idx";

-- DropIndex
DROP INDEX "payroll_items_time_clock_id_idx";

-- DropIndex
DROP INDEX "payrolls_created_at_idx";

-- DropIndex
DROP INDEX "payrolls_pay_period_id_employee_id_key";

-- DropIndex
DROP INDEX "products_active_idx";

-- DropIndex
DROP INDEX "products_category_id_idx";

-- DropIndex
DROP INDEX "products_featured_idx";

-- DropIndex
DROP INDEX "products_menu_section_id_idx";

-- DropIndex
DROP INDEX "products_sku_idx";

-- DropIndex
DROP INDEX "products_slug_idx";

-- DropIndex
DROP INDEX "products_slug_key";

-- DropIndex
DROP INDEX "reports_date_range_end_idx";

-- DropIndex
DROP INDEX "reports_date_range_start_idx";

-- DropIndex
DROP INDEX "reports_status_idx";

-- DropIndex
DROP INDEX "users_referral_code_key";

-- DropTable
DROP TABLE "abandoned_carts";

-- DropTable
DROP TABLE "addresses";

-- DropTable
DROP TABLE "appointment_reminders";

-- DropTable
DROP TABLE "appointments";

-- DropTable
DROP TABLE "cart_items";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "chat_messages";

-- DropTable
DROP TABLE "chat_sessions";

-- DropTable
DROP TABLE "combo_items";

-- DropTable
DROP TABLE "combos";

-- DropTable
DROP TABLE "contact_messages";

-- DropTable
DROP TABLE "digital_downloads";

-- DropTable
DROP TABLE "digital_products";

-- DropTable
DROP TABLE "event_waitlist";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "license_keys";

-- DropTable
DROP TABLE "locations";

-- DropTable
DROP TABLE "menu_sections";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "order_status_history";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "payroll_settings";

-- DropTable
DROP TABLE "pos_employees";

-- DropTable
DROP TABLE "pos_sessions";

-- DropTable
DROP TABLE "pos_transactions";

-- DropTable
DROP TABLE "product_allergens";

-- DropTable
DROP TABLE "product_ingredients";

-- DropTable
DROP TABLE "product_questions";

-- DropTable
DROP TABLE "product_relations";

-- DropTable
DROP TABLE "product_variants";

-- DropTable
DROP TABLE "promo_codes";

-- DropTable
DROP TABLE "recently_viewed";

-- DropTable
DROP TABLE "rentals";

-- DropTable
DROP TABLE "reviews";

-- DropTable
DROP TABLE "saved_payment_methods";

-- DropTable
DROP TABLE "store_config";

-- DropTable
DROP TABLE "subscription_changes";

-- DropTable
DROP TABLE "subscription_payments";

-- DropTable
DROP TABLE "subscriptions";

-- DropTable
DROP TABLE "support_tickets";

-- DropTable
DROP TABLE "table_reservations";

-- DropTable
DROP TABLE "ticket_messages";

-- DropTable
DROP TABLE "tickets";

-- DropTable
DROP TABLE "time_clocks";

-- DropTable
DROP TABLE "wishlist_items";

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE 
    WHEN "status"::text IN ('RETURNED', 'REFUNDED') THEN 'CANCELLED'::"OrderStatus_new"
    ELSE "status"::text::"OrderStatus_new"
  END
);
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PayrollItemType_new" AS ENUM ('REGULAR_HOURS', 'OVERTIME_HOURS', 'BONUS', 'DEDUCTION');
ALTER TABLE "payroll_items" ALTER COLUMN "item_type" TYPE "PayrollItemType_new" USING (
  CASE 
    WHEN "item_type"::text IN ('BREAK_DEDUCTION', 'TAX_FEDERAL', 'TAX_STATE', 'TAX_LOCAL', 'DEDUCTION_HEALTH', 'DEDUCTION_RETIREMENT', 'DEDUCTION_OTHER', 'ADJUSTMENT') THEN 'DEDUCTION'::"PayrollItemType_new"
    WHEN "item_type"::text = 'COMMISSION' THEN 'BONUS'::"PayrollItemType_new"
    ELSE "item_type"::text::"PayrollItemType_new"
  END
);
ALTER TYPE "PayrollItemType" RENAME TO "PayrollItemType_old";
ALTER TYPE "PayrollItemType_new" RENAME TO "PayrollItemType";
DROP TYPE "public"."PayrollItemType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE 
    WHEN "role"::text = 'CUSTOMER' THEN 'USER'::"UserRole_new"
    WHEN "role"::text = 'MASTERMIND' THEN 'ADMIN'::"UserRole_new"
    WHEN "role"::text = 'MANAGER' THEN 'ADMIN'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END
);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "created_at",
DROP COLUMN "price_at_purchase",
DROP COLUMN "special_instructions",
DROP COLUMN "variant_id",
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "billing_address",
DROP COLUMN "cancelled_at",
DROP COLUMN "cancelled_reason",
DROP COLUMN "delivery_method",
DROP COLUMN "discount",
DROP COLUMN "estimated_delivery",
DROP COLUMN "estimated_pickup",
DROP COLUMN "estimated_ready_time",
DROP COLUMN "location_id",
DROP COLUMN "notes",
DROP COLUMN "order_number",
DROP COLUMN "payment_method",
DROP COLUMN "payment_timing",
DROP COLUMN "pickup_address",
DROP COLUMN "pos_session_id",
DROP COLUMN "pos_transaction_id",
DROP COLUMN "promo_code",
DROP COLUMN "scheduled_for",
DROP COLUMN "shipping_address",
DROP COLUMN "shipping_carrier",
DROP COLUMN "shipping_cost",
DROP COLUMN "source",
DROP COLUMN "subtotal",
DROP COLUMN "tip_amount",
DROP COLUMN "total_amount",
DROP COLUMN "tracking_number",
ADD COLUMN     "total" DECIMAL(15,2) NOT NULL;

-- AlterTable
ALTER TABLE "payroll_items" DROP COLUMN "created_at",
DROP COLUMN "quantity",
DROP COLUMN "rate",
DROP COLUMN "time_clock_id";

-- AlterTable
ALTER TABLE "payrolls" DROP COLUMN "bonuses",
DROP COLUMN "break_hours",
DROP COLUMN "created_by",
DROP COLUMN "overtime_multiplier",
DROP COLUMN "overtime_pay",
DROP COLUMN "paid_by",
DROP COLUMN "regular_pay";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "active",
DROP COLUMN "category_id",
DROP COLUMN "compare_price",
DROP COLUMN "delivery_time_minutes",
DROP COLUMN "dietary_info",
DROP COLUMN "dimensions",
DROP COLUMN "featured",
DROP COLUMN "image_urls",
DROP COLUMN "menu_section_id",
DROP COLUMN "nutrition_info",
DROP COLUMN "prep_time_minutes",
DROP COLUMN "slug",
DROP COLUMN "tags",
DROP COLUMN "weight",
ALTER COLUMN "stock" DROP DEFAULT,
ALTER COLUMN "sku" SET NOT NULL;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "description",
DROP COLUMN "file_url",
DROP COLUMN "filters",
DROP COLUMN "status",
DROP COLUMN "updated_at",
DROP COLUMN "report_type",
ADD COLUMN     "report_type" TEXT NOT NULL,
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "loyalty_points",
DROP COLUMN "name",
DROP COLUMN "referral_code",
DROP COLUMN "referred_by",
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "ContactStatus";

-- DropEnum
DROP TYPE "DeliveryMethod";

-- DropEnum
DROP TYPE "OrderSource";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PaymentTiming";

-- DropEnum
DROP TYPE "PosPaymentMethod";

-- DropEnum
DROP TYPE "PosSessionStatus";

-- DropEnum
DROP TYPE "PosTransactionType";

-- DropEnum
DROP TYPE "RentalStatus";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "ReportType";

-- DropEnum
DROP TYPE "ReservationStatus";

-- DropEnum
DROP TYPE "SubscriptionInterval";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "SubscriptionType";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "TicketStatusEnum";

-- DropEnum
DROP TYPE "TimeClockType";

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL,
    "credit" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "expected_close_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "lead_id" TEXT,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "job_title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_account_number_key" ON "chart_of_accounts"("account_number");

-- CreateIndex
CREATE INDEX "chart_of_accounts_account_type_idx" ON "chart_of_accounts"("account_type");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parent_id_idx" ON "chart_of_accounts"("parent_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journal_entry_id_idx" ON "journal_entry_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_account_id_idx" ON "journal_entry_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_name_module_key" ON "custom_fields"("name", "module");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_id_entity_id_key" ON "custom_field_values"("field_id", "entity_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks"("project_id");

-- CreateIndex
CREATE INDEX "project_tasks_status_idx" ON "project_tasks"("status");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "reports_report_type_idx" ON "reports"("report_type");

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
