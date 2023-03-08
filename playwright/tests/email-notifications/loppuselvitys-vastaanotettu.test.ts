import { expect } from '@playwright/test'

import {
  getHakemusTokenAndRegisterNumber,
  getLoppuselvitysSubmittedNotificationEmails,
  lastOrFail,
} from '../../utils/emails'
import { selvitysTest as test } from '../../fixtures/selvitysTest'

test('loppuselvitys submitted notification is sent', async ({
  page,
  acceptedHakemus: { hakemusID },
  loppuselvitysSubmitted: { loppuselvitysFormFilled },
}) => {
  expect(loppuselvitysFormFilled)
  const email = lastOrFail(await getLoppuselvitysSubmittedNotificationEmails(hakemusID))
  expect(email['to-address']).toEqual(['erkki.esimerkki@example.com'])
  expect(email.subject).toEqual('Loppuselvityksenne on vastaanotettu')
  const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
  expect(email.formatted).toContain(`Hyvä vastaanottaja,

olemme vastaanottaneet loppuselvityksenne.

Rahassa kylpijät Ky Ay Oy
${registerNumber}
`)
  expect(email.formatted).toContain(`
Hakija voi muokata jo lähetettyä loppuselvitystä alkuperäisen loppuselvityspyynnön lomakelinkin kautta selvityksen määräaikaan saakka. Tällöin selvitystä ei kuitenkaan enää lähetetä uudelleen käsiteltäväksi, vaan muokkausten tallentuminen varmistetaan hakulomakkeen yläreunan lokitietokentästä.

Lisätietoja saatte tarvittaessa avustuspäätöksessä mainitulta lisätietojen antajalta. Teknisissä ongelmissa auttaa: valtionavustukset@oph.fi

Kun selvitys on käsitelty, ilmoitetaan siitä sähköpostitse avustuksen saajan viralliseen sähköpostiosoitteeseen sekä yhteyshenkilölle.`)

  const previewUrl = email.formatted.match(/(https?:\/\/\S+)/gi)?.[0]
  if (!previewUrl) {
    throw new Error('No preview url found')
  }

  await page.goto(previewUrl)
  await expect(page.locator('div.soresu-preview > h1')).toContainText(
    'loppuselvitys submitted notification is sent'
  )
  await expect(page.locator('#textArea-0 > div')).toContainText('Yhteenveto')
  await expect(page.locator('#textArea-2 > div')).toContainText('Työn jako')
})
