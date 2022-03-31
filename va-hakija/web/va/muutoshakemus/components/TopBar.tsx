import { FormikHook } from 'soresu-form/web/va/types/muutoshakemus'

import { useTranslations } from 'soresu-form/web/va/i18n/TranslationContext'
import { TopBarNotification } from './TopBarNotification'

type TopBarProps = {
  env: string
  f: FormikHook
}

export function TopBar({ env, f }: TopBarProps) {
  const { t } = useTranslations()
  const isMuutoshakemus = f.values.haenKayttoajanPidennysta || f.values.haenMuutostaTaloudenKayttosuunnitelmaan || f.values.haenSisaltomuutosta
  const buttonText = isMuutoshakemus ? t.sendMuutoshakemus : t.sendContactDetails
  const submitDisabled = f.isSubmitting || f.isValidating || !(f.isValid && f.dirty)
  return (
    <section id="topbar">
      <div id="top-container">
        <img id="logo" src="img/logo-240x68@2x.png" width="240" height="68" alt="Opetushallitus / Utbildningsstyrelsen" />
        <div className="topbar-right">
          <div className="topbar-title-and-save-status">
            <h1 id="topic">{t.hakemus}</h1>
          </div>
          <div>
            <div className="important-info">
              <div className="environment-info">
                <div className="environment-info__name">{env}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="muutospyynto-button-container">
          <button disabled={submitDisabled} id="send-muutospyynto-button" type="submit">{buttonText}</button>
          <TopBarNotification f={f} />
        </div>
      </div>
    </section>
  )
}
