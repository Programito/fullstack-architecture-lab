-- Momento en que la línea se envió a cocina. En BD la línea sigue en
-- status=pending hasta que cocina empieza a prepararla; esta marca distingue
-- "añadida pero sin enviar" (NULL) de "enviada, esperando cocina" (fecha).
-- Antes, enviar a cocina saltaba directamente a status=preparing, así que
-- las líneas aparecían en la columna "Preparándose" sin pasar por "Pendiente".
ALTER TABLE "order_lines" ADD COLUMN "sentToKitchenAt" TIMESTAMP(3);
