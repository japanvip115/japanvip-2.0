-- PREVIEW migration cho tính năng Giá Cạnh Tranh (KHÁI QUÁT — sẽ áp bằng `prisma db push`)
-- Cả 2 thay đổi ADDITIVE, non-destructive. Không sửa/xoá cột hay bảng nào đang có.
-- CHỈ chạy sau khi chủ dự án duyệt (Neon = production).

-- 1) Thêm cột giá vốn (nullable, để trống Phase 1)
ALTER TABLE "products" ADD COLUMN "cost_price" DECIMAL(15,2);

-- 2) Bảng lưu giá nguồn (shopnoidianhat = mốc, kakaku = giá Nhật, còn lại tham khảo)
CREATE TABLE "competitor_prices" (
    "id"              UUID          NOT NULL,
    "product_id"      UUID          NOT NULL,
    "source"          VARCHAR(50)   NOT NULL,
    "market"          VARCHAR(2)    NOT NULL DEFAULT 'vn',
    "is_primary"      BOOLEAN       NOT NULL DEFAULT false,
    "url"             TEXT,
    "competitor_name" VARCHAR(500),
    "price_vnd"       DECIMAL(15,2),
    "price_jpy"       DECIMAL(15,2),
    "fetch_status"    VARCHAR(20)   NOT NULL DEFAULT 'ok',
    "fetched_at"      TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ   NOT NULL,
    CONSTRAINT "competitor_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "competitor_prices_product_id_source_key"
    ON "competitor_prices"("product_id", "source");
CREATE INDEX "competitor_prices_product_id_idx"
    ON "competitor_prices"("product_id");

ALTER TABLE "competitor_prices"
    ADD CONSTRAINT "competitor_prices_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
