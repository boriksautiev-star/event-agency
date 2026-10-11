-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rate_template_id" TEXT;

-- CreateTable
CREATE TABLE "rate_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_template_rates" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "rate_group_id" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_template_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animator_rate_overrides" (
    "id" TEXT NOT NULL,
    "animator_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animator_rate_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_templates_name_key" ON "rate_templates"("name");

-- CreateIndex
CREATE INDEX "rate_template_rates_rate_group_id_duration_min_idx" ON "rate_template_rates"("rate_group_id", "duration_min");

-- CreateIndex
CREATE UNIQUE INDEX "rate_template_rates_template_id_rate_group_id_duration_min_key" ON "rate_template_rates"("template_id", "rate_group_id", "duration_min");

-- CreateIndex
CREATE INDEX "animator_rate_overrides_animator_id_idx" ON "animator_rate_overrides"("animator_id");

-- CreateIndex
CREATE UNIQUE INDEX "animator_rate_overrides_animator_id_character_id_duration_m_key" ON "animator_rate_overrides"("animator_id", "character_id", "duration_min");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rate_template_id_fkey" FOREIGN KEY ("rate_template_id") REFERENCES "rate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_template_rates" ADD CONSTRAINT "rate_template_rates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "rate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_template_rates" ADD CONSTRAINT "rate_template_rates_rate_group_id_fkey" FOREIGN KEY ("rate_group_id") REFERENCES "rate_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animator_rate_overrides" ADD CONSTRAINT "animator_rate_overrides_animator_id_fkey" FOREIGN KEY ("animator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animator_rate_overrides" ADD CONSTRAINT "animator_rate_overrides_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
