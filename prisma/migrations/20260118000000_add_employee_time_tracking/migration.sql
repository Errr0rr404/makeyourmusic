-- CreateEnum
CREATE TYPE "TimeClockType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'LUNCH_START', 'LUNCH_END');

-- CreateTable
CREATE TABLE "time_clocks" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "location_id" TEXT,
    "punch_type" "TimeClockType" NOT NULL,
    "punch_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "ip_address" TEXT,
    "device_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_clocks_employee_id_idx" ON "time_clocks"("employee_id");

-- CreateIndex
CREATE INDEX "time_clocks_shift_id_idx" ON "time_clocks"("shift_id");

-- CreateIndex
CREATE INDEX "time_clocks_location_id_idx" ON "time_clocks"("location_id");

-- CreateIndex
CREATE INDEX "time_clocks_punch_type_idx" ON "time_clocks"("punch_type");

-- CreateIndex
CREATE INDEX "time_clocks_punch_time_idx" ON "time_clocks"("punch_time");

-- AddForeignKey (only if tables exist)
DO $$ 
BEGIN
    -- Add foreign key to pos_employees if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_employees') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'time_clocks_employee_id_fkey'
        ) THEN
            ALTER TABLE "time_clocks" ADD CONSTRAINT "time_clocks_employee_id_fkey" 
            FOREIGN KEY ("employee_id") REFERENCES "pos_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
    
    -- Add foreign key to pos_shifts if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_shifts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'time_clocks_shift_id_fkey'
        ) THEN
            ALTER TABLE "time_clocks" ADD CONSTRAINT "time_clocks_shift_id_fkey" 
            FOREIGN KEY ("shift_id") REFERENCES "pos_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
    
    -- Add foreign key to locations if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'time_clocks_location_id_fkey'
        ) THEN
            ALTER TABLE "time_clocks" ADD CONSTRAINT "time_clocks_location_id_fkey" 
            FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AlterTable
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='employee_time_tracking_enabled') THEN
        ALTER TABLE "store_config" ADD COLUMN "employee_time_tracking_enabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_config' AND column_name='manager_passcode') THEN
        ALTER TABLE "store_config" ADD COLUMN "manager_passcode" TEXT;
    END IF;
END $$;

-- CreateIndex (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_employees') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'pos_employees_employee_id_idx'
        ) THEN
            CREATE INDEX "pos_employees_employee_id_idx" ON "pos_employees"("employee_id");
        END IF;
    END IF;
END $$;
