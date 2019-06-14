insert into arviot (
  hakemus_id,
  status,
  overridden_answers,
  budget_granted,
  summary_comment,
  changelog,
  roles,
  presenter_role_id,
  rahoitusalue,
  talousarviotili,
  perustelut,
  costs_granted,
  use_overridden_detailed_costs,
  presentercomment,
  academysize,
  oppilaitokset,
  allow_visibility_in_external_system,
  should_pay,
  should_pay_comments)
values (
  :hakemus_id,
  :status,
  :overridden_answers,
  :budget_granted,
  :summary_comment,
  :changelog,
  :roles,
  :presenter_role_id,
  :rahoitusalue,
  :talousarviotili,
  :perustelut,
  :costs_granted,
  :use_overridden_detailed_costs,
  :presentercomment,
  :academysize,
  :oppilaitokset,
  :allow_visibility_in_external_system,
  :should_pay,
  :should_pay_comments)
