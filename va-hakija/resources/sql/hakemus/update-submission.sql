INSERT INTO hakemukset(id, avustushaku, user_key, version, form_submission_id, form_submission_version,
                       budget_total, budget_oph_share, status, last_status_change_at)
SELECT id,
       :avustushaku_id,
       :user_key,
       version + 1,
       :form_submission_id,
       :form_submission_version,
       :budget_total,
       :budget_oph_share,
       status,
       last_status_change_at
FROM hakemukset
WHERE user_key = :user_key AND form_submission_id = :form_submission_id
GROUP BY id, status, last_status_change_at, version
ORDER BY version DESC
LIMIT 1
