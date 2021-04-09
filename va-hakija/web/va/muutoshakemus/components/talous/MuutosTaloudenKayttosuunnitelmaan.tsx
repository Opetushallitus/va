import React from 'react'

import { useTranslations } from '../../TranslationContext'
import { FormikHook, Meno, Talousarvio } from 'va-common/web/va/types/muutoshakemus'

import './talous.less'
import { Language } from '../../translations'

type MuutosTaloudenKayttosuunnitelmaanProps = {
  f: FormikHook
  talousarvio: Talousarvio
}

const MenoRow = ({ meno, lang }: { meno: Meno, lang: Language }) => {

  return (
    <div className="muutoshakemus_taloudenKayttosuunnitelma_row">
      <div className="description">{meno[`translation-${lang}`]}</div>
      <div className="existingAmount">{meno.amount} €</div>
      <div className="separator" />
      <div className="changedAmount">
        <input type="text" /> €
      </div>
    </div>
  )
}

export const MuutosTaloudenKayttosuunnitelmaan = ({ talousarvio }: MuutosTaloudenKayttosuunnitelmaanProps) => {
  const { lang } = useTranslations()
  return (
    <div className="muutoshakemus_taloudenKayttosuunnitelma">
      {talousarvio.map(meno => <MenoRow lang={lang} meno={meno} key={meno["type"]} />)}
    </div>
  )
}
