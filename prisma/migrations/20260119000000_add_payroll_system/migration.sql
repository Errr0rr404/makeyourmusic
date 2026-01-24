-- CreateEnum
CREATE TYPE "PayPeriodType" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PayPeriodStatus" AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollItemType" AS ENUM ('REGULAR_HOURS', 'OVERTIME_HOURS', 'BREAK_DEDUCTION', 'BONUS', 'COMMISSION', 'TAX_FEDERAL', 'TAX_STATE', 'TAX_LOCAL', 'DEDUCTION_HEALTH', 'DEDUCTION_RETIREMENT', 'DEDUCTION_OTHER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PAYROLL_SUMMARY', 'EMPLOYEE_HOURS', 'ATTENDANCE', 'OVERTIME', 'PAYROLL_DETAIL', 'EMPLOYEE_PAYROLL_HISTORY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "pay_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "period_type" "PayPeriodType" NOT NULL DEFAULT 'WEEKLY',
    "status" "PayPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "pay_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "pay_period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "regular_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "break_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "overtime_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "regular_pay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtime_pay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gross_pay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "item_type" "PayrollItemType" NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2),
    "rate" DECIMAL(10,2),
    "amount" DECIMAL(10,2) NOT NULL,
    "time_clock_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" TEXT NOT NULL,
    "overtime_threshold" DECIMAL(10,2) NOT NULL DEFAULT 40,
    "overtime_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "default_pay_period_type" "PayPeriodType" NOT NULL DEFAULT 'WEEKLY',
    "tax_rate_federal" DECIMAL(5,4),
    "tax_rate_state" DECIMAL(5,4),
    "tax_rate_local" DECIMAL(5,4),
    "auto_calculate_taxes" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date_range_start" TIMESTAMP(3) NOT NULL,
    "date_range_end" TIMESTAMP(3) NOT NULL,
    "filters" JSONB,
    "data" JSONB,
    "file_url" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pay_periods_start_date_idx" ON "pay_periods"("start_date");

-- CreateIndex
CREATE INDEX "pay_periods_end_date_idx" ON "pay_periods"("end_date");

-- CreateIndex
CREATE INDEX "pay_periods_status_idx" ON "pay_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_pay_period_id_employee_id_key" ON "payrolls"("pay_period_id", "employee_id");

-- CreateIndex
CREATE INDEX "payrolls_pay_period_id_idx" ON "payrolls"("pay_period_id");

-- CreateIndex
CREATE INDEX "payrolls_employee_id_idx" ON "payrolls"("employee_id");

-- CreateIndex
CREATE INDEX "payrolls_status_idx" ON "payrolls"("status");

-- CreateIndex
CREATE INDEX "payrolls_created_at_idx" ON "payrolls"("created_at");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_items_item_type_idx" ON "payroll_items"("item_type");

-- CreateIndex
CREATE INDEX "payroll_items_time_clock_id_idx" ON "payroll_items"("time_clock_id");

-- CreateIndex
CREATE INDEX "reports_report_type_idx" ON "reports"("report_type");

-- CreateIndex
CREATE INDEX "reports_date_range_start_idx" ON "reports"("date_range_start");

-- CreateIndex
CREATE INDEX "reports_date_range_end_idx" ON "reports"("date_range_end");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_pay_period_id_fkey" FOREIGN KEY ("pay_period_id") REFERENCES "pay_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "pos_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_time_clock_id_fkey" FOREIGN KEY ("time_clock_id") REFERENCES "time_clocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default payroll settings
INSERT INTO "payroll_settings" ("id", "overtime_threshold", "overtime_multiplier", "default_pay_period_type", "auto_calculate_taxes", "created_at", "updated_at")
VALUES ('default', 40, 1.5, 'WEEKLY', false, NOW(), NOW());
