-- Origen del cliente (header X-Client-Origin) que abrio el pedido / creo la reserva.
-- Nullable: las filas anteriores a esta columna se quedan sin origen conocido.
ALTER TABLE "orders" ADD COLUMN "clientOrigin" TEXT;

ALTER TABLE "reservations" ADD COLUMN "clientOrigin" TEXT;
