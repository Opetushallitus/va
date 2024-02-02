import { expect, Page, test } from '@playwright/test'
import moment from 'moment'

import { getHakuaikaPaattymassaEmails, waitUntilMinEmails } from '../../utils/emails'
import { VIRKAILIJA_URL } from '../../utils/constants'
import { randomString } from '../../utils/random'
import { muutoshakemusTest } from '../../fixtures/muutoshakemusTest'
import { createJotpaCodes } from '../../fixtures/JotpaTest'
import { expectToBeDefined } from '../../utils/util'
import {
  expectIsFinnishJotpaEmail,
  expectIsFinnishOphEmail,
  expectIsSwedishJotpaEmail,
} from '../../utils/email-signature'

const sendHakuaikaPaattymassaNotifications = (page: Page) =>
  page.request.post(`${VIRKAILIJA_URL}/api/test/send-hakuaika-paattymassa-notifications`)

type HakuaikaPaattymassaFixtures = {
  randomEmail: string
}

const hakuaikaPaattymassaTest = muutoshakemusTest.extend<HakuaikaPaattymassaFixtures>({
  randomEmail: async ({}, use) => {
    await use(`${randomString()}@example.com`)
  },
  answers: async ({ answers, randomEmail }, use) => {
    await use({
      ...answers,
      contactPersonEmail: randomEmail,
    })
  },
})

const jotpaHakuaikaPaattymassaTest = hakuaikaPaattymassaTest.extend({
  codes: async ({ page }, use) => {
    const codes = await createJotpaCodes(page)
    await use(codes)
  },
})

const timezones = ['Europe/Helsinki', 'Europe/Stockholm']
for (const tz of timezones) {
  // All serial since sending hakuaika päättymässä notifications is global for all avustushakus
  test.describe.serial(`With time zone ${tz}`, async () => {
    test.use({ timezoneId: tz })

    test.describe.serial('When avustushaku is closing tomorrow', () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(12, 0, 0, 0)

      hakuaikaPaattymassaTest.use({
        hakuProps: ({ hakuProps }, use) => {
          use({
            ...hakuProps,
            hakuaikaEnd: tomorrow,
          })
        },
      })

      hakuaikaPaattymassaTest(
        'sends an email to those whose hakemus is expiring tomorrow',
        async ({ page, avustushakuID, filledHakemus, randomEmail, hakuProps }) => {
          await sendHakuaikaPaattymassaNotifications(page)
          const emails = await waitUntilMinEmails(getHakuaikaPaattymassaEmails, 1, avustushakuID)
          const email = emails[0]

          expect(email['to-address']).toHaveLength(1)
          expect(email['to-address']).toContain(randomEmail)
          expect(email.subject).toEqual('Hakuaika on päättymässä')
          await expectIsFinnishOphEmail(email)

          const endDate = moment(hakuProps.hakuaikaEnd).format('DD.MM.YYYY')
          expect(filledHakemus.hakemusUrl).toContain('lang=fi')
          expect(email.formatted).toContain(`Hyvä vastaanottaja,

teillä on keskeneräinen hakemus valtionavustuksessa ${hakuProps.avustushakuName}. Huomaa, että avustuksen hakuaika päättyy ${endDate} klo 12.00.

Hakemus muokkauksineen tallentuu automaattisesti Opetushallituksen valtionavustusjärjestelmään, mutta tullakseen vireille on
hakemus lähetettävä käsiteltäväksi ennen hakuajan päättymistä. Määräajan ulkopuolella saapunut hakemus voidaan ottaa käsiteltäväksi vain erityisen painavista syistä.

Pääsette viimeistelemään hakemuksenne tästä: ${filledHakemus.hakemusUrl}

Mikäli olette päättäneet jättää hakemuksen lähettämättä, on tämä viesti aiheeton.`)
        }
      )

      jotpaHakuaikaPaattymassaTest(
        'sends an email to those whose jotpa hakemus is expiring tomorrow',
        async ({ page, avustushakuID, filledHakemus }) => {
          expectToBeDefined(filledHakemus)
          await sendHakuaikaPaattymassaNotifications(page)
          const emails = await waitUntilMinEmails(getHakuaikaPaattymassaEmails, 1, avustushakuID)
          const email = emails[0]
          await expectIsFinnishJotpaEmail(email)
        }
      )

      test.describe.serial('when hakemus is in Swedish', async () => {
        hakuaikaPaattymassaTest.use({
          answers: async ({ swedishAnswers, randomEmail }, use) => {
            await use({
              ...swedishAnswers,
              contactPersonEmail: randomEmail,
            })
          },
        })

        hakuaikaPaattymassaTest(
          'sends an email in Swedish',
          async ({ page, avustushakuID, filledHakemus, randomEmail, hakuProps }) => {
            await sendHakuaikaPaattymassaNotifications(page)
            const emails = await waitUntilMinEmails(getHakuaikaPaattymassaEmails, 1, avustushakuID)
            const email = emails[0]

            expect(email['to-address']).toHaveLength(1)
            expect(email['to-address']).toContain(randomEmail)
            expect(email.subject).toEqual('Ansökningstiden närmar sig sitt slut')

            const endDate = moment(hakuProps.hakuaikaEnd).format('DD.MM.YYYY')
            expect(filledHakemus.hakemusUrl).toContain('lang=sv')
            expect(email.formatted).toContain(`Bästa mottagare,

ni har en halvfärdig ansökan om statsunderstöd ${
              hakuProps.avustushakuName + ' på svenska'
            }. Observera att ansökningstiden för understödet avslutas ${endDate} kl. 12.00.

Ansökan och ändringar som görs i ansökan sparas automatiskt i Utbildningsstyrelsens statsunderstödssystem, men för att ansökan ska behandlas behöver den skickas för behandling innan ansökningstiden avslutas. En ansökan som skickats efter att ansökningstiden avslutats kan tas till behandling endast av särskilt vägande skäl.

Ni kommer åt att färdigställa er ansökan via denna länk: ${filledHakemus.hakemusUrl}

Om ni har beslutat att inte lämna in ansökan föranleder detta meddelande inga åtgärder.`)

            expect(email.formatted).toContain(
              'Utbildningsstyrelsen\n' +
                'Hagnäskajen 6\n' +
                'PB 380, 00531 Helsingfors\n' +
                'telefon 029 533 1000\n' +
                'fornamn.efternamn@oph.fi'
            )
          }
        )

        jotpaHakuaikaPaattymassaTest.use({
          answers: async ({ swedishAnswers, randomEmail }, use) => {
            await use({
              ...swedishAnswers,
              contactPersonEmail: randomEmail,
            })
          },
        })

        jotpaHakuaikaPaattymassaTest(
          'sends Jotpa email in Swedish',
          async ({ page, avustushakuID, filledHakemus }) => {
            expectToBeDefined(filledHakemus)
            await sendHakuaikaPaattymassaNotifications(page)
            const emails = await waitUntilMinEmails(getHakuaikaPaattymassaEmails, 1, avustushakuID)
            const email = emails[0]
            await expectIsSwedishJotpaEmail(email)
          }
        )
      })

      hakuaikaPaattymassaTest(
        'does not send an e-mail to those whose hakemus has been sent',
        async ({ page, avustushakuID, submittedHakemus, randomEmail }) => {
          expect(submittedHakemus).toBeDefined()
          await sendHakuaikaPaattymassaNotifications(page)
          await page.waitForTimeout(5000)

          await expectEmailNotSent(randomEmail, avustushakuID)
        }
      )
    })

    test.describe.serial('When avustushaku is closing later than tomorrow', () => {
      const today = new Date()
      const dayAfterTomorrow = new Date(today)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
      dayAfterTomorrow.setHours(12, 0, 0, 0)

      hakuaikaPaattymassaTest.use({
        hakuProps: ({ hakuProps }, use) => {
          use({
            ...hakuProps,
            hakuaikaEnd: dayAfterTomorrow,
          })
        },
      })

      hakuaikaPaattymassaTest(
        'does not send an e-mail',
        async ({ page, filledHakemus, avustushakuID, randomEmail }) => {
          expect(filledHakemus).toBeDefined()
          await sendHakuaikaPaattymassaNotifications(page)
          await page.waitForTimeout(5000)

          await expectEmailNotSent(randomEmail, avustushakuID)
        }
      )
    })
  })
}

async function expectEmailNotSent(email: string, avustushakuID: number) {
  const emails = await getHakuaikaPaattymassaEmails(avustushakuID)
  const expectedEmail = expect.objectContaining({
    'to-address': [email],
  })
  expect(emails).not.toContainEqual(expectedEmail)
}
