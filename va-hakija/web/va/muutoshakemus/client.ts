import axios from 'axios'
import moment from 'moment'
import { omit } from 'lodash'

import { FormValues } from 'soresu-form/web/va/types/muutoshakemus'
import { isoFormat } from 'soresu-form/web/va/i18n/dateformat'

const timeout = 10000 // 10 seconds
const client = axios.create({ timeout })

type MuutoshakemusProps = {
  userKey: string
  values: FormValues
}

export async function postMuutoshakemus(props: MuutoshakemusProps) {
  const { userKey, values } = props
  const url = `api/muutoshakemus/${userKey}`

  const jatkoaika = values.haenKayttoajanPidennysta && {
    jatkoaika: {
      haenKayttoajanPidennysta: true,
      haettuKayttoajanPaattymispaiva: moment(values.haettuKayttoajanPaattymispaiva).format(isoFormat),
      kayttoajanPidennysPerustelut: values.kayttoajanPidennysPerustelut,
    }
  }

  const talousarvio = values.haenMuutostaTaloudenKayttosuunnitelmaan && {
    talousarvio: omit(values.talousarvio, ['currentSum', 'originalSum']),
    talousarvioPerustelut: values.taloudenKayttosuunnitelmanPerustelut
  }

  const sisaltomuutos = values.haenSisaltomuutosta && {
    sisaltomuutos: {
      haenSisaltomuutosta: true,
      sisaltomuutosPerustelut: values.sisaltomuutosPerustelut
    }
  }

  return client.post(url, {
    ...jatkoaika,
    ...talousarvio,
    ...sisaltomuutos,
    yhteyshenkilo: {
      name: values.name,
      email: values.email,
      phone: values.phone
    },
  })
}
