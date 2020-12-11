import React, { useState } from 'react'
import moment from 'moment'

import { MuutoshakemusValues, datetimeFormat } from 'va-common/web/va/MuutoshakemusValues'

import { MuutoshakemusForm } from './MuutoshakemusForm'
import { MuutoshakemusTabs } from './MuutoshakemusTabs'

import './Muutoshakemus.less'

export const Muutoshakemus = ({ environment, avustushaku, muutoshakemukset, hakemus, controller, userInfo, presenter }) => {
  const [a, setActiveMuutoshakemus] = useState(muutoshakemukset[0])
  return (
    <React.Fragment>
      {muutoshakemukset.length > 1 && <MuutoshakemusTabs muutoshakemukset={muutoshakemukset} activeMuutoshakemus={a} setActiveMuutoshakemus={setActiveMuutoshakemus} />}
      <h2>Muutoshakemus {moment(a['created-at']).format(datetimeFormat)}</h2>
      <div className="muutoshakemus-content">
        <MuutoshakemusValues muutoshakemus={a} hakemus={hakemus} hakijaUrl={environment['hakija-server'].url.fi} />
        {a.status === 'new' && <MuutoshakemusForm avustushaku={avustushaku} muutoshakemus={a} hakemus={hakemus} controller={controller} userInfo={userInfo} presenter={presenter} />}
      </div>
    </React.Fragment>
  )
}
