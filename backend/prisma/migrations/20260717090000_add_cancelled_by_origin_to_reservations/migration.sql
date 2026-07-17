-- Origen del cliente que canceló la reserva (header X-Client-Origin en el
-- PATCH /cancel). Solo se rellena al cancelar; null en reservas no canceladas
-- o canceladas antes de existir esta columna.
ALTER TABLE "reservations" ADD COLUMN "cancelledByOrigin" TEXT;
