-- Migration: Add Performance Indexes
-- Description: Adds recommended indexes for improved query performance
-- Date: 2026-01-20
--
-- IMPORTANT: Review these indexes and run them in batches during low-traffic periods
-- Each index creation can be run independently

-- ============================================================================
-- ORDERS TABLE - Improve order queries and filtering
-- ============================================================================

-- Index for date-based queries (order history, reports)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at DESC);

-- Composite index for user order history with date sorting
CREATE INDEX IF NOT EXISTS idx_orders_user_created
ON orders(user_id, created_at DESC);

-- Composite index for admin filtering by status and date
CREATE INDEX IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- ============================================================================
-- PRODUCTS TABLE - Improve product browsing and search
-- ============================================================================

-- Index for price-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_products_price
ON products(price);

-- Composite index for category browsing (active products only)
CREATE INDEX IF NOT EXISTS idx_products_category_active_featured
ON products(category_id, active, featured)
WHERE active = true;

-- Index for newest products
CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at DESC)
WHERE active = true;

-- Index for stock levels (for low stock alerts)
CREATE INDEX IF NOT EXISTS idx_products_stock
ON products(stock)
WHERE active = true AND stock <= 10;

-- ============================================================================
-- REVIEWS TABLE - Improve review queries
-- ============================================================================

-- Composite index for product reviews with rating filter
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating
ON reviews(product_id, rating DESC);

-- Index for recent reviews
CREATE INDEX IF NOT EXISTS idx_reviews_created_at
ON reviews(created_at DESC)
WHERE verified = true;

-- ============================================================================
-- POS SESSIONS TABLE - Improve POS performance
-- ============================================================================

-- Index for session history
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at
ON pos_sessions(opened_at DESC);

-- Composite index for employee session lookup
CREATE INDEX IF NOT EXISTS idx_pos_sessions_employee_status
ON pos_sessions(employee_id, status);

-- ============================================================================
-- PAYMENTS TABLE - Improve payment tracking
-- ============================================================================

-- Index for recent payments
CREATE INDEX IF NOT EXISTS idx_payments_created_at
ON payments(created_at DESC);

-- Composite index for failed payment tracking
CREATE INDEX IF NOT EXISTS idx_payments_status_created
ON payments(status, created_at DESC)
WHERE status = 'FAILED';

-- ============================================================================
-- CART ITEMS TABLE - Improve cart operations
-- ============================================================================

-- Already has good indexes, but add composite for user cart with product
CREATE INDEX IF NOT EXISTS idx_cart_items_user_product
ON cart_items(user_id, product_id);

-- ============================================================================
-- NOTIFICATIONS TABLE - Improve notification queries
-- ============================================================================

-- Composite index for user notifications (unread first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- ANALYTICS & REPORTING INDEXES
-- ============================================================================

-- Index for order items analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product_created
ON order_items(product_id, created_at);

-- Index for revenue calculations
CREATE INDEX IF NOT EXISTS idx_orders_status_total
ON orders(status, total_amount)
WHERE status IN ('DELIVERED', 'PROCESSING', 'SHIPPED');

-- ============================================================================
-- ERP MODULE INDEXES
-- ============================================================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_status_created
ON projects(status, created_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
ON tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status
ON tasks(assigned_to, status)
WHERE assigned_to IS NOT NULL;

-- Workflows
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status_started
ON workflow_executions(status, started_at DESC);

-- ML Predictions
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_created
ON ml_predictions(model_id, created_at DESC);

-- ============================================================================
-- TEXT SEARCH INDEXES (PostgreSQL Full Text Search)
-- ============================================================================

-- Product search
CREATE INDEX IF NOT EXISTS idx_products_search
ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify index usage:
--
-- Check index sizes:
-- SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
-- FROM pg_indexes
-- JOIN pg_class ON pg_indexes.indexname = pg_class.relname
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;
--
-- Check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
--
-- Find missing indexes:
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname = 'public'
-- ORDER BY abs(correlation) DESC;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- After creating indexes, analyze tables for better query planning:
ANALYZE orders;
ANALYZE products;
ANALYZE reviews;
ANALYZE pos_sessions;
ANALYZE payments;
ANALYZE notifications;
ANALYZE projects;
ANALYZE tasks;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. These indexes are optional but recommended for production
-- 2. Monitor index usage and drop unused indexes
-- 3. Indexes increase write performance overhead
-- 4. Consider partial indexes for large tables
-- 5. Run VACUUM ANALYZE periodically
-- 6. Monitor index bloat and rebuild if necessary

-- To rollback (drop indexes):
-- DROP INDEX IF EXISTS idx_orders_created_at;
-- DROP INDEX IF EXISTS idx_orders_user_created;
-- ... etc
