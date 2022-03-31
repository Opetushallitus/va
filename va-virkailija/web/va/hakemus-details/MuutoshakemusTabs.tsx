import moment from 'moment'
import { fiShortFormat } from 'soresu-form/web/va/i18n/dateformat'
import { Muutoshakemus } from 'soresu-form/web/va/types/muutoshakemus'

import './MuutoshakemusTabs.less'

interface MuutoshakemusTabsProps {
  muutoshakemukset: Muutoshakemus[]
  activeMuutoshakemus: Muutoshakemus
  setActiveMuutoshakemus: (muutoshakemusId: number) => void
}

export const MuutoshakemusTabs = ({ muutoshakemukset, activeMuutoshakemus, setActiveMuutoshakemus }: MuutoshakemusTabsProps) => {
  return (
    <div className='muutoshakemus-tabs'>
      {muutoshakemukset.map((m, index) => (
        <button
          key={`muutoshakemus-tab-${index}`}
          className={`muutoshakemus-tabs__tab ${m.id === activeMuutoshakemus.id ? 'active' : ''}`}
          onClick={() => setActiveMuutoshakemus(m.id)}
          data-test-id={`muutoshakemus-tab-${m.id}`}
        >
          Muutoshakemus {moment(m['created-at']).format(fiShortFormat)}
        </button>
      ))}
    </div>
  )
}
