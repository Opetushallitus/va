import { Fragment, useState } from 'react';
import moment from 'moment'

import { MuutoshakemusValues, datetimeFormat } from 'soresu-form/web/va/MuutoshakemusValues'
import { getTalousarvio, getProjectEndDate } from 'soresu-form/web/va/Muutoshakemus'
import {EnvironmentApiResponse} from "soresu-form/web/va/types/environment";
import {Muutoshakemus as MuutoshakemusType} from "soresu-form/web/va/types/muutoshakemus";
import {
  Avustushaku,
  Hakemus,
  UserInfo
} from "soresu-form/web/va/types";

import {MuutoshakemusForm} from "./MuutoshakemusForm";
import {Role} from "../types";
import { MuutoshakemusTabs } from './MuutoshakemusTabs'

import './Muutoshakemus.less'

interface MuutoshakemusProps {
  environment: EnvironmentApiResponse
  avustushaku: Avustushaku
  muutoshakemukset: MuutoshakemusType[]
  hakemusVersion: Hakemus
  controller: any
  userInfo: UserInfo
  presenter: Role | undefined
  isCurrentUserHakemukselleUkotettuValmistelija: boolean
}

export const Muutoshakemus = ({ environment, avustushaku, muutoshakemukset, hakemusVersion, controller, userInfo, presenter, isCurrentUserHakemukselleUkotettuValmistelija }: MuutoshakemusProps) => {
  const hakemus = hakemusVersion.normalizedData
  const [activeMuutoshakemus, setActiveMuutoshakemus] = useState(muutoshakemukset[0].id)
  const a = muutoshakemukset.find(_ => _.id === activeMuutoshakemus)!
  const isAccepted = a.status === 'accepted' || a.status === 'accepted_with_changes'
  const projectEndDate = getProjectEndDate(avustushaku, muutoshakemukset, a)
  const currentTalousarvio = getTalousarvio(muutoshakemukset, hakemus && hakemus.talousarvio, isAccepted ? a : undefined)
  const content = a.status === 'new' && hakemus
    ? <MuutoshakemusForm
      avustushaku={avustushaku}
      muutoshakemus={a}
      muutoshakemukset={muutoshakemukset}
      hakemus={hakemus}
      hakemusVersion={hakemusVersion}
      controller={controller}
      userInfo={userInfo}
      presenter={presenter}
      projectEndDate={projectEndDate}
      isCurrentUserHakemukselleUkotettuValmistelija={isCurrentUserHakemukselleUkotettuValmistelija}
      currentTalousarvio={currentTalousarvio}
      environment={environment} />
    : <MuutoshakemusValues
      currentTalousarvio={currentTalousarvio}
      muutoshakemus={a}
      hakijaUrl={environment['hakija-server'].url.fi}
      projectEndDate={projectEndDate} />

  return (
    <Fragment>
      {muutoshakemukset.length > 1 && <MuutoshakemusTabs muutoshakemukset={muutoshakemukset} activeMuutoshakemus={a} setActiveMuutoshakemus={setActiveMuutoshakemus} />}
      <h2>Muutoshakemus {moment(a['created-at']).format(datetimeFormat('fi'))}</h2>
      <div data-test-id="muutoshakemus-sisalto">
        {content}
      </div>
    </Fragment>
  );
}
