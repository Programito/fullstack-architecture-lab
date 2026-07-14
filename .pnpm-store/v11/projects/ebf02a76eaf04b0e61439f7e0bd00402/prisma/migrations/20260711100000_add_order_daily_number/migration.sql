-- Numero de ticket visible al cliente: contador diario por restaurante, no es clave de
-- negocio (no unico a nivel de fila) y se calcula en el momento de abrir el pedido
-- (ver PrismaRestaurantOrderRepository.open()).
ALTER TABLE "orders"
ADD COLUMN "dailyNumber" INTEGER;

-- Backfill best-effort para pedidos ya existentes: numera por restaurante y dia natural
-- (UTC) en el orden en que se crearon. No es critico que sea perfecto porque estos
-- pedidos nunca se han enseñado a un cliente con este numero.
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "restaurantId", date_trunc('day', "createdAt")
      ORDER BY "createdAt"
    ) AS rn
  FROM "orders"
)
UPDATE "orders"
SET "dailyNumber" = numbered.rn
FROM numbered
WHERE "orders"."id" = numbered."id";

ALTER TABLE "orders"
ALTER COLUMN "dailyNumber" SET NOT NULL;
