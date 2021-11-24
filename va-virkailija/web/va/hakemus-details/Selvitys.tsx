import React from 'react'

import { LoppuselvitysForm } from './LoppuselvitysForm'
import SelvitysPreview from './SelvitysPreview'
import SelvitysNotFilled from './SelvitysNotFilled'
import SelvitysLink from './SelvitysLink'
import SelvitysEmail from './SelvitysEmail'
import PresenterComment from './PresenterComment'
import ApplicationPayments from './ApplicationPayments'
import { Avustushaku, Hakemus } from 'va-common/web/va/types'
import HakemustenArviointiController from '../HakemustenArviointiController'
import { Role, UserInfo } from '../types'
import { EnvironmentApiResponse } from 'va-common/web/va/types/environment'

type SelvitysProps = {
  controller: HakemustenArviointiController
  hakemus: Hakemus
  avustushaku: Avustushaku
  translations: any
  selvitysType: 'valiselvitys' | 'loppuselvitys'
  userInfo: UserInfo
  multibatchEnabled: boolean
  isPresentingOfficer: boolean
  presenterCommentHelpText: any
  selvitysLinkHelpText: any
  environment: EnvironmentApiResponse
  presenter?: Role
  taloustarkastaja?: Role
}

const Selvitys = ({ presenter, environment, controller, hakemus, avustushaku, translations, selvitysType, userInfo, multibatchEnabled, isPresentingOfficer, presenterCommentHelpText, selvitysLinkHelpText }: SelvitysProps) => {
  const hasSelvitys = !!hakemus.selvitys?.[selvitysType]?.answers
  const selvitysHakemus = hakemus.selvitys?.[selvitysType]
  const form = hakemus.selvitys?.[`${selvitysType}Form`]
  const renderLoppuselvitysForm = hasSelvitys && environment["loppuselvitys-verification"]["enabled?"] && selvitysType === 'loppuselvitys'
  const renderSelvitysEmail = hasSelvitys && (
    selvitysType === 'valiselvitys' ||
    !environment["loppuselvitys-verification"]["enabled?"] ||
    hakemus["status-loppuselvitys"] === 'accepted' || hakemus["status-loppuselvitys"] === 'information_verified')

  return (
    <div className="selvitys-container" data-test-id={`hakemus-details-${selvitysType}`}>
      <PresenterComment controller={controller} hakemus={hakemus} helpText={presenterCommentHelpText}/>
      {hasSelvitys
        ? <SelvitysPreview hakemus={hakemus}
                            avustushaku={avustushaku}
                            translations={translations}
                            selvitysType={selvitysType}
                            selvitysHakemus={selvitysHakemus}
                            form={form} />
        : <SelvitysNotFilled avustushaku={avustushaku} selvitysType={selvitysType}/>}
      {multibatchEnabled && (avustushaku.content as any).multiplemaksuera &&
        <ApplicationPayments application={hakemus}
                              grant={avustushaku}
                              index={selvitysType === "valiselvitys" ? 1 : 2}
                              payments={hakemus.payments}
                              onAddPayment={controller.addPayment}
                              onRemovePayment={controller.removePayment}
                              readonly={!isPresentingOfficer}/>}
      <SelvitysLink avustushaku={avustushaku} hakemus={hakemus} selvitysType={selvitysType} helpText={selvitysLinkHelpText} />
      {renderLoppuselvitysForm && <LoppuselvitysForm controller={controller} hakemus={hakemus} avustushaku={avustushaku} presenter={presenter} userInfo={userInfo} />}
      {renderSelvitysEmail && <SelvitysEmail controller={controller}
                                            selvitysType={selvitysType}
                                            hakemus={hakemus}
                                            avustushaku={avustushaku}
                                            selvitysHakemus={selvitysHakemus}
                                            userInfo={userInfo}
                                            lang={selvitysHakemus?.language}
                                            translations={translations["selvitys-email"]}/>}
    </div>
  )
}

export default Selvitys
