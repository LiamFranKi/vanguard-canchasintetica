-- Agregar métodos de pago: yape y transferencia
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_pago_check 
  CHECK (metodo_pago IN ('online', 'deposito', 'efectivo', 'yape', 'transferencia'));



