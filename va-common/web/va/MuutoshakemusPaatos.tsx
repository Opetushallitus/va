import React from 'react'
import moment from 'moment'

import {
  getProjectEndDate,
  getTalousarvio,
  isAcceptedWithChanges,
} from './Muutoshakemus'
import { TalousarvioTable } from './muutoshakemus/MuutosTaloudenKayttosuunnitelmaan'
import { useTranslations } from 'va-common/web/va/i18n/TranslationContext'
import { fiShortFormat } from 'va-common/web/va/i18n/dateformat'
import {
  Muutoshakemus,
  MuutoshakemusStatus,
  Paatos,
  PaatosState,
  Talousarvio
} from "./types/muutoshakemus";

import './MuutoshakemusPaatos.less'
import {Role} from "../../../va-virkailija/web/va/types";
import {OsioPaatos, PaatosOsio} from "./OsioPaatos";
import {EnvironmentApiResponse} from "./types/environment";

type MuutoshakemusPaatosProps = Omit<PaatosState, 'paatos' | 'presenter'> & {
  paatos: Omit<Paatos, 'id' | 'user-key' | 'updated-at'>
  muutoshakemusUrl: string
  presenter: Role | undefined
}

const Muutospaatos: React.FC<{osio: PaatosOsio; paatosStatus: MuutoshakemusStatus}>
  = ({osio, paatosStatus, children}) => {
  const { t } = useTranslations()
  return (
    <section className="muutoshakemus-paatos__section muutoshakemus-paatos__section-paatos">
      <div className="muutoshakemus-paatos__section-container">
        <div data-test-id="muutospaatos-asia-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.haettuMuutos}</div>
        <div data-test-id="muutospaatos-asia-content">
          {children}
        </div>
        </div>
      <div data-test-id={`${osio}-container`} className="muutoshakemus-paatos__section-container">
        <div data-test-id="muutospaatos-asia-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.paatos}</div>
        <OsioPaatos osio={osio} paatosStatus={paatosStatus} color="darker" />
      </div>
    </section>
  )
}

const TalousarvioPaatosSection: React.FC<{currentTalousarvio: Talousarvio, newTalousarvio: Talousarvio, status: MuutoshakemusStatus}> =
  ({
    status,
    currentTalousarvio,
    newTalousarvio
   }) => {
    const { t } = useTranslations()
  return (
    <Muutospaatos paatosStatus={status} osio="paatos-talousarvio">
      <h3 className="muutoshakemus-paatos__change-header">{t.muutoshakemus.paatos.budjetti}</h3>
      <TalousarvioTable paatos={true} currentTalousarvio={currentTalousarvio} newTalousarvio={newTalousarvio} status={status} />
    </Muutospaatos>
  )
}

const JatkoaikaPaatosSection = ({status, paattymispaiva, projectEndDate}: {status: MuutoshakemusStatus; paattymispaiva: string | undefined, projectEndDate: string | undefined}) => {
  const { t } = useTranslations()
  return (
    <Muutospaatos paatosStatus={status} osio="paatos-jatkoaika">
      <h3 className="muutoshakemus-paatos__change-header">{t.muutoshakemus.paatos.kayttoaika}</h3>
      <div className="muutoshakemus-paatos__jatkoaika">
        <div>
          <h3 className="muutoshakemus-paatos__change-header" data-test-id="h-old-end-date">{t.muutoshakemus.previousProjectEndDate}</h3>
          <div data-test-id="paatos-project-end">{projectEndDate}</div>
        </div>
        <div>
          <h3 className="muutoshakemus-paatos__change-header" data-test-id="h-new-end-date">{t.muutoshakemus.acceptedChange}</h3>
          <div data-test-id="paattymispaiva-value">{moment(paattymispaiva).format(fiShortFormat)}</div>
        </div>
      </div>
    </Muutospaatos>
  )
}

const SisaltomuutosPaatosSection: React.FC<{status: MuutoshakemusStatus}> = ({status}) => {
  const { t } = useTranslations()
  return (
    <Muutospaatos paatosStatus={status} osio="paatos-sisaltomuutos">
      <h3 className="muutoshakemus-paatos__change-header">{t.muutoshakemus.paatos.sisaltoJaToimitustapa}</h3>
    </Muutospaatos>
  )
}

const ProjectSection: React.FC<{muutoshakemus: Muutoshakemus, projectName: string, muutoshakemusUrl: string, environment: EnvironmentApiResponse}> = ({projectName, muutoshakemus, muutoshakemusUrl, environment}) => {
  const { t, lang } = useTranslations()
  return (
    <section className="muutoshakemus-paatos__section no-border-top">
      <div data-test-id="muutospaatos-asia-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.asia}</div>
      <div data-test-id="muutospaatos-asia-content">
        <div className="muutoshakemus-paatos__project-name">
          {t.muutoshakemus.paatos.hanke}: <i data-test-id="paatos-project-name">{projectName}</i>
        </div>
        {muutoshakemus.talousarvio && !!muutoshakemus.talousarvio.length && (
          <div data-test-id="budget-change">{t.muutoshakemus.paatos.muutoshakemusTaloudenKayttosuunnitelmaan}</div>
        )}
        {muutoshakemus['haen-kayttoajan-pidennysta'] && (
          <div data-test-id="jatkoaika-asia">{t.muutoshakemus.paatos.hakemusKayttoajanPidennykselle}</div>
        )}
        {muutoshakemus['haen-sisaltomuutosta'] && (
          <div>{t.muutoshakemus.paatos.muutoshakemusSisaltoonTaiToteutustapaan}</div>
        )}
        { environment["muutoshakemus-osiokohtainen-hyvaksynta"]["enabled?"] &&
        <p>
          <a data-test-id="link-to-muutoshakemus" href={`${muutoshakemusUrl}&lang=${lang}`}>{t.muutoshakemus.paatos.linkkiMuutoshakemukseen}</a>
        </p>
        }
      </div>
    </section>
  )
}

const PerustelutSection: React.FC<{reason: string; sisaltomuutokset?: string}> = ({reason, sisaltomuutokset}) => {
  const { t } = useTranslations()
  return (
    <section className="muutoshakemus-paatos__section">
      <div data-test-id="muutoshakemus-paatos-perustelut-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.perustelut}</div>
      <div className="muutoshakemus-paatos__perustelut">
        <div className="muutoshakemus-paatos__reason" data-test-id="paatos-reason">{reason}</div>
        {sisaltomuutokset && <div data-test-id="sisaltomuutos-content">{sisaltomuutokset}</div>}
      </div>
    </section>
  )
}

const HyvaksyjaSection: React.FC<{isPresentingOfficer: boolean; decider: string; presenter: Role | undefined}> =
  ({isPresentingOfficer, presenter, decider}) => {
    const { t } = useTranslations()
    return (
      <section className="muutoshakemus-paatos__section">
        <div data-test-id="muutoshakemus-paatos-tekija-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.paatoksenTekija}</div>
        {isPresentingOfficer
          ? <div data-test-id="paatos-decider">{decider}</div>
          : <div>
            <div data-test-id="paatos-decider">{decider}</div>
            <br/>
            <div data-test-id="muutoshakemus-paatos-esittelija-title">{t.muutoshakemus.paatos.esittelija}</div>
            <div data-test-id="paatos-esittelija">
              {presenter?.name}
            </div>
          </div>
        }
      </section>
    )
}

const LisatietojaSection: React.FC<{presenter: Role | undefined}> = ({presenter}) => {
  const { t } = useTranslations()
  return (
    <section className="muutoshakemus-paatos__section">
      <div data-test-id="muutoshakemus-paatos-lisatietoja-title" className="muutoshakemus-paatos__title">{t.muutoshakemus.paatos.lisatietoja}</div>
      <div data-test-id="paatos-additional-info">
        {presenter?.name}<br/>
        {presenter?.email}<br/>
        {t.muutoshakemus.paatos.phoneNumber}
      </div>
    </section>
  )
}

export const MuutoshakemusPaatos = ({ hakemus, muutoshakemus, paatos, presenter, avustushaku, muutoshakemukset, isPresentingOfficer, environment, muutoshakemusUrl }: MuutoshakemusPaatosProps) => {
  const { t } = useTranslations()
  const paattymispaiva = isAcceptedWithChanges(paatos["paatos-status-jatkoaika"]) ? paatos.paattymispaiva : muutoshakemus['haettu-kayttoajan-paattymispaiva']
  const newTalousarvio = isAcceptedWithChanges(paatos["paatos-status-talousarvio"]) ? (paatos.talousarvio || []) : muutoshakemus.talousarvio

  const projectEndDate = getProjectEndDate(avustushaku, muutoshakemukset, muutoshakemus)
  const currentTalousarvio = getTalousarvio(muutoshakemukset, hakemus?.talousarvio, muutoshakemus)
  return (
    <div className="muutoshakemus-paatos__content">
      <header className="muutoshakemus-paatos__header">
        <img id="logo" src="/img/logo.png" height="50" alt={t.logo.alt} />
        <div className="muutoshakemus-paatos-title"><span data-test-id="muutoshakemus-paatos-title">{t.muutoshakemus.paatos.paatos}</span><br/>
          {moment(paatos['created-at']).format(fiShortFormat)}
        </div>
        <div data-test-id="paatos-register-number">{hakemus['register-number']}</div>
      </header>
      <h1 className="muutoshakemus-paatos__org">{hakemus['organization-name']}</h1>
      <ProjectSection muutoshakemus={muutoshakemus} projectName={hakemus['project-name']} muutoshakemusUrl={muutoshakemusUrl} environment={environment} />
      {!!newTalousarvio.length && paatos["paatos-status-talousarvio"] &&
        <TalousarvioPaatosSection currentTalousarvio={currentTalousarvio} newTalousarvio={newTalousarvio} status={paatos["paatos-status-talousarvio"]} />
      }
      {muutoshakemus['haen-kayttoajan-pidennysta'] && paatos["paatos-status-jatkoaika"] &&
        <JatkoaikaPaatosSection status={paatos["paatos-status-jatkoaika"]} projectEndDate={projectEndDate} paattymispaiva={paattymispaiva} />
      }
      {muutoshakemus['haen-sisaltomuutosta'] && paatos["paatos-status-sisaltomuutos"] && (
        <SisaltomuutosPaatosSection status={paatos["paatos-status-sisaltomuutos"]} />
      )}
      <PerustelutSection reason={paatos.reason} sisaltomuutokset={paatos['hyvaksytyt-sisaltomuutokset']} />
      <HyvaksyjaSection isPresentingOfficer={isPresentingOfficer} decider={paatos.decider} presenter={presenter} />
      <LisatietojaSection presenter={presenter} />
    </div>
  )
}
