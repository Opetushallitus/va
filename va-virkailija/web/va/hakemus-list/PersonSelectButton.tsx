import React from 'react'

import { Hakemus } from 'soresu-form/web/va/types'

import {Role, State} from '../types'
import HakemustenArviointiController from '../HakemustenArviointiController'

export const isPresenterRole = ({role}: Role): boolean => ["presenting_officer", "vastuuvalmistelija"].includes(role)
export const isPresenter = (hakemus: Hakemus, {id}: Role) => hakemus.arvio["presenter-role-id"] === id
export const isEvaluator = (hakemus: Hakemus, {id}: Role) => hakemus.arvio.roles['evaluators'].includes(id)

type RoleButtonProps = {
  role: Role
  roleField: 'evaluators' | 'presenter'
  controller: HakemustenArviointiController
  hakemus: Hakemus
}

const RoleButton = ({ role, roleField, controller, hakemus }: RoleButtonProps) => {
  const onClick = () => controller.toggleHakemusRole(role.id, hakemus, roleField)
  const active = roleField === "presenter"
    ? isPresenter(hakemus, role)
    : isEvaluator(hakemus, role)
  return (
    <button className={`btn btn-sm ${active ? 'btn-selected' : 'btn-simple'}`} onClick={onClick} data-test-id={`${roleField}-${role.name.replace(" ", "-")}`}>{role.name}</button>
  )
}

type RoleContainerProps = {
  roleName: string
  roleField: 'evaluators' | 'presenter'
  roles: Role[]
  controller: HakemustenArviointiController
  hakemus: Hakemus
}

const RoleContainer = ({ roleName, roleField, roles, controller, hakemus }: RoleContainerProps) => {
  return (
    <React.Fragment>
      <div className="role-title">{roleName}</div>
      <div className="role-container">
        {roles.map(role => <RoleButton key={`${roleName}-${role.id}`} role={role} roleField={roleField} controller={controller} hakemus={hakemus} />)}
      </div>
    </React.Fragment>
  )
}

type PersonSelectButtonProps = {
  controller: HakemustenArviointiController
  hakemus: Hakemus
  state: State
  toggleSplitView: (forceValue?: boolean) => void
}

export const PersonSelectPanel = ({ hakemus, state, controller }: Omit<PersonSelectButtonProps, 'toggleSplitView'>) => {
  const roles = [ ...state.hakuData.roles ].sort((a, b) => a.name > b.name ? -1 : 1)
  const presenters = roles.filter(isPresenterRole)
  const onCloseClick = () => controller.togglePersonSelect(undefined)
  return (
    <div className="panel person-panel person-panel--top">
      <button className="close" onClick={onCloseClick} data-test-id="close-person-select-panel">x</button>
      <RoleContainer roleName="Valmistelija" roleField="presenter" roles={presenters} controller={controller} hakemus={hakemus}/>
      <RoleContainer roleName="Arvioijat" roleField="evaluators" roles={roles} controller={controller} hakemus={hakemus}/>
    </div>
  )
}

export const PersonSelectButton = ({ controller, hakemus, state, toggleSplitView }: PersonSelectButtonProps) => {
  const onClick = () => {
    controller.togglePersonSelect(hakemus.id)
    toggleSplitView(true)
  }
  const roles = state.hakuData.roles.map(r => r.id)
  const presenterRoleId = hakemus.arvio["presenter-role-id"]
  const personCount = hakemus.arvio.roles.evaluators.filter(id => roles.includes(id)).length + (presenterRoleId && roles.includes(presenterRoleId) ? 1 : 0)
  const countIndicator = personCount || "+"
  const presenter = state.hakuData.roles.find(r => r.id === presenterRoleId)
  const presenterName = presenter?.name ?? ""

  return(
    <div>
      <button onClick={onClick} className="btn btn-sm btn-simple btn-role" title={presenterName}>
        <span className="btn-role__count">{countIndicator}</span>
      </button>
      {state.personSelectHakemusId === hakemus.id && <PersonSelectPanel hakemus={hakemus} state={state} controller={controller}/>}
    </div>
  )
}
