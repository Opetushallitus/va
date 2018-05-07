SELECT
  h.id, h.created_at, h.form, h.content, h.status, h.register_number,
  h.valiselvitysdate, h.loppuselvitysdate, h.form_loppuselvitys,
  h.form_valiselvitys, h.is_academysize, h.haku_type, h.operational_unit_id,
  h.project_id, h.operation_id
FROM
  hakija.avustushaut h
WHERE
  h.status = 'resolved' OR h.status = 'published'
ORDER
  BY h.created_at DESC;
