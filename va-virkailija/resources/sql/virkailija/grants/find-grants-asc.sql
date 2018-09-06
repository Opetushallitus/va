SELECT
  id, created_at, form, content, status, register_number, valiselvitysdate,
  loppuselvitysdate, form_loppuselvitys, form_valiselvitys,
  is_academysize, haku_type
FROM
  hakija.avustushaut
WHERE
  register_number LIKE :search_term
  OR LOWER(content#>>'{name,fi}') LIKE :search_term
ORDER BY
  created_at ASC
