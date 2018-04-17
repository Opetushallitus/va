SELECT
  id, created_at, batch_number, document_type, invoice_date, due_date,
  receipt_date, transaction_account, currency, partner, inspector_email,
  acceptor_email, grant_id, document_id
FROM
  virkailija.payment_batches
WHERE
  receipt_date = :batch_date::date AND grant_id = :grant_id
