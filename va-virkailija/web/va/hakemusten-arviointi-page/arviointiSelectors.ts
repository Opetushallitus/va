import { useUserInfo } from '../initial-data-context'
import { VALMISTELIJA_ROLES } from '../types'
import { getHakemus, getLoadedState } from './arviointiReducer'
import { useHakemustenArviointiSelector as useSelector } from './arviointiStore'

export const useUserRoles = (hakemusId: number) => {
  const { hakuData } = useSelector((state) => getLoadedState(state.arviointi))
  const userInfo = useUserInfo()
  const { roles } = hakuData
  const hakemus = useSelector((state) => getHakemus(state.arviointi, hakemusId))

  const fallbackPresenter = roles.find((r) =>
    (VALMISTELIJA_ROLES as readonly string[]).includes(r.role)
  )
  const hakemukselleUkotettuValmistelija =
    roles.find((r) => r.id === hakemus.arvio['presenter-role-id']) || fallbackPresenter
  const userOid = userInfo['person-oid']
  const isCurrentUserHakemukselleUkotettuValmistelija =
    hakemukselleUkotettuValmistelija?.oid === userOid
  const userRole = roles.find((r) => r.oid === userOid)?.role
  const isPresentingOfficer =
    userRole && (VALMISTELIJA_ROLES as readonly string[]).includes(userRole)

  return {
    isPresentingOfficer,
    hakemukselleUkotettuValmistelija,
    isCurrentUserHakemukselleUkotettuValmistelija,
  }
}