import React from 'react'
import PresenterComment from './PresenterComment.jsx'
import SeurantaLiitteet from './SeurantaLiitteet.jsx'
import SeurantaTags from './SeurantaTags.jsx'
import { SeurantaBudgetEditing } from '../seurantabudgetedit/SeurantaBudgetEditing'
import ShouldPay from './ShouldPay.jsx'
import AllowVisibilityInExternalSystem from './AllowVisibilityInExternalSystem.jsx'
import ShouldPayComments from './ShouldPayComments.jsx'

import { FormikHook } from 'va-common/web/va/standardized-form-fields/types'

interface SeurantaProps {
  controller: any
  hakemus: any
  avustushaku: any
  translations: any
  hakuData: any
  helpTexts: any
  f: FormikHook
  environment: any
}

export const Seuranta = ({controller, hakemus, avustushaku,
           translations, hakuData, helpTexts, f, environment}: SeurantaProps) => {
    return (
      <div className="seuranta">
        <AllowVisibilityInExternalSystem controller={controller}
                                         hakemus={hakemus}
                                         allowEditing={true}
                                         helpText={helpTexts["hankkeen_sivu__seuranta___salli_näkyvyys_ulkoisessa_järjestelmässä"]}/>
        <ShouldPay controller={controller}
                   hakemus={hakemus}
                   allowEditing={true}
                   helpText={helpTexts["hankkeen_sivu__seuranta___maksuun"]}/>
        <ShouldPayComments controller={controller}
                           hakemus={hakemus}
                           allowEditing={true}/>
        <div className="seuranta-section">
          <PresenterComment controller={controller} hakemus={hakemus} helpText={helpTexts["hankkeen_sivu__seuranta___valmistelijan_huomiot"]}/>
          <SeurantaBudgetEditing avustushaku={avustushaku}
                                 hakuData={hakuData}
                                 translations={translations}
                                 controller={controller}
                                 hakemus={hakemus}
                                 environment={environment}
                                 f={f}/>
        </div>
        <div className="seuranta-section">
          <SeurantaLiitteet avustushaku={avustushaku}
                            hakuData={hakuData}
                            translations={translations}
                            controller={controller}
                            hakemus={hakemus}
                            helpText={helpTexts["hankkeen_sivu__seuranta___liitteet"]}/>
        </div>
        <div className="seuranta-section">
          <SeurantaTags controller={controller}
                        hakemus={hakemus}
                        hakuData={hakuData}/>
        </div>
      </div>
    )
  }
