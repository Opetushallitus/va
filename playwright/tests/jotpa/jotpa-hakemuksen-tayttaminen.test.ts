import { expect } from '@playwright/test'
import { JotpaTest, SwedishJotpaTest } from '../../fixtures/JotpaTest'
import { HakijaAvustusHakuPage } from '../../pages/hakija/hakijaAvustusHakuPage'
import { dummyPdfPath, TEST_Y_TUNNUS } from '../../utils/constants'
import {
  getHakemusSubmitted,
  pollUntilNewHakemusEmailArrives,
  waitUntilMinEmails,
} from '../../utils/emails'
import { Answers } from '../../utils/types'

const jotpaFont = 'Montserrat, sans-serif'
const jotpaColour = 'rgb(0, 155, 98)'

JotpaTest(
  'Suomenkielisen Jotpa-hakemuksen täyttäminen',
  async ({ page, avustushakuID, answers }) => {
    const hakijaAvustusHakuPage = HakijaAvustusHakuPage(page)
    const buffyEmail = 'buffy.summers@askjeeves.com'
    let hakemusUrl: string
    await hakijaAvustusHakuPage.navigate(avustushakuID, 'fi')

    await JotpaTest.step('Etusivulla', async () => {
      await JotpaTest.step('Näyttää jotpan suomenkielisen logon', async () => {
        expect(await page.locator('#logo').screenshot()).toMatchSnapshot('jotpa-logo-fi.png')
      })
      await JotpaTest.step('Näyttää Jotpan faviconin', async () => {
        await expect(page.locator('#favicon')).toHaveAttribute(
          'href',
          '/img/jotpa/jotpa-favicon.ico'
        )
      })

      await JotpaTest.step('Luo uusi hakemus nappula on jotpan väreissä', async () => {
        await hakijaAvustusHakuPage.form.muutoshakuEnabledFields.primaryEmail.fill(buffyEmail)
        await expect(page.locator('.soresu-text-button')).not.toBeDisabled()
        await expect(page.locator('.soresu-text-button')).toHaveCSS('background-color', jotpaColour)
      })
    })

    await JotpaTest.step('Hakemussivulla', async () => {
      hakemusUrl = await hakijaAvustusHakuPage.startApplication(avustushakuID, buffyEmail)
      await page.goto(hakemusUrl)
      await hakijaAvustusHakuPage.fillApplication(answers, TEST_Y_TUNNUS)

      await JotpaTest.step('Näyttää jotpan suomenkielisen logon', async () => {
        expect(await page.locator('#logo').screenshot()).toMatchSnapshot('jotpa-logo-fi.png')
      })

      await JotpaTest.step('Näyttää Jotpan fontin', async () => {
        await expect(page.locator('#topbar h1')).toHaveCSS('font-family', jotpaFont)
        await expect(page.locator('.soresu-form h1')).toHaveCSS('font-family', jotpaFont)
        await expect(page.locator('#project-info')).toHaveCSS('font-family', jotpaFont)
      })

      await JotpaTest.step('Näyttää Jotpan faviconin', async () => {
        await expect(page.locator('#favicon')).toHaveAttribute(
          'href',
          '/img/jotpa/jotpa-favicon.ico'
        )
      })

      await JotpaTest.step('Näyttää aktiivisen nappulan jotpan väreissä', async () => {
        const yliopistoButton = page.getByText('Yliopisto')
        await yliopistoButton.click()
        await expect(yliopistoButton).toHaveCSS('border-color', jotpaColour)
      })

      await JotpaTest.step('Näyttää liitetiedoston lisäysnappulan Jotpan väreissä', async () => {
        await expect(page.locator('.soresu-file-upload .soresu-upload-button').first()).toHaveCSS(
          'background-color',
          jotpaColour
        )
      })

      await JotpaTest.step('Näyttää jotpan myöntämä avustus tekstin', async () => {
        await expect(page.getByText('Jotpan myöntämä avustus')).toBeVisible()
        await expect(page.getByText('OPH:n myöntämä avustus')).not.toBeVisible()
      })

      await JotpaTest.step('Näyttää jotpan rahoitus tekstin', async () => {
        await expect(page.getByText('Jotpan rahoitus-%')).toBeVisible()
        await expect(page.getByText('OPH:n rahoitus-%')).not.toBeVisible()
      })

      await JotpaTest.step(
        'Näyttää aktiivisen "Lähetä käsiteltäväksi" nappulan Jotpan väreissä',
        async () => {
          await fillJotpaHakemus(hakijaAvustusHakuPage, answers)
          await expect(page.locator('#topbar #submit')).toHaveCSS('background-color', jotpaColour)
        }
      )
    })

    await JotpaTest.step('"Linkki avustushakemukseen"-Sähköpostissa', async () => {
      const newHakemusEmail = (await pollUntilNewHakemusEmailArrives(avustushakuID, buffyEmail))[0]

      console.log(newHakemusEmail)
      await JotpaTest.step('oph on korvattu jotpalla niiltä osin kuin on sovittu', async () => {
        expect(newHakemusEmail['from-address']).toEqual('no-reply@jotpa.fi')

        expect(newHakemusEmail.formatted).not.toContain(
          'voitte olla yhteydessä osoitteeseen valtionavustukset@oph.fi'
        )
        expect(newHakemusEmail.formatted).toContain(
          'voitte olla yhteydessä osoitteeseen rahoitus@jotpa.fi'
        )

        expect(newHakemusEmail.formatted).not.toContain(
          `Opetushallitus
Hakaniemenranta 6`
        )
        expect(newHakemusEmail.formatted).toContain(
          `Jatkuvan oppimisen ja työllisyyden palvelukeskus
Hakaniemenranta 6`
        )

        expect(newHakemusEmail.formatted).not.toContain('etunimi.sukunimi@oph.fi')
        expect(newHakemusEmail.formatted).toContain('etunimi.sukunimi@jotpa.fi')
      })
    })

    await JotpaTest.step('"Hakemus vastaanotettu"-Sähköpostissa', async () => {
      await hakijaAvustusHakuPage.submitApplication()

      const userKey = await hakijaAvustusHakuPage.getUserKey()
      const hakemusID = await hakijaAvustusHakuPage.getHakemusID(avustushakuID, userKey)
      const email = (await waitUntilMinEmails(getHakemusSubmitted, 1, hakemusID))[0]
      console.log(email)

      await JotpaTest.step('on oikean lähettäjän osoite', async () => {
        expect(email['from-address']).toEqual('no-reply@jotpa.fi')
      })

      await JotpaTest.step('on oikean lähettäjän nimi', async () => {
        expect(email.formatted).not.toContain(`Opetushallitus`)
        expect(email.formatted).toContain(`Jatkuvan oppimisen ja työllisyyden palvelukeskus`)
      })
    })

    await JotpaTest.step('Hakemuksen esikatselu sivulla', async () => {
      await page.goto(hakemusUrl + '&preview=true')

      await JotpaTest.step('Näyttää jotpan suomenkielisen logon', async () => {
        expect(await page.locator('#logo').screenshot()).toMatchSnapshot('jotpa-logo-fi.png')
      })

      await JotpaTest.step('Näyttää Jotpan fontin', async () => {
        await expect(page.locator('#topbar h1')).toHaveCSS('font-family', jotpaFont)
        await expect(page.locator('.soresu-preview h1')).toHaveCSS('font-family', jotpaFont)
        await expect(page.locator('#project-info')).toHaveCSS('font-family', jotpaFont)
      })

      await JotpaTest.step('Näyttää Jotpan faviconin', async () => {
        await expect(page.locator('#favicon')).toHaveAttribute(
          'href',
          '/img/jotpa/jotpa-favicon.ico'
        )
      })
    })
  }
)

SwedishJotpaTest(
  'Ruotsinkielisen Jotpa-hakemuksen täyttäminen',
  async ({ page, avustushakuID, answers }) => {
    const hakijaAvustusHakuPage = HakijaAvustusHakuPage(page)
    const faithEmail = 'faith.lehane@altavista.com'
    await hakijaAvustusHakuPage.navigate(avustushakuID, 'sv')
    const hakemusUrl = await hakijaAvustusHakuPage.startApplication(avustushakuID, faithEmail)

    await SwedishJotpaTest.step('Etusivulla', async () => {
      await SwedishJotpaTest.step('Näyttää etusivulla Jotpan ruotsinkielisen logon', async () => {
        expect(await page.locator('#logo').screenshot()).toMatchSnapshot('jotpa-logo-sv.png')
      })
    })

    await SwedishJotpaTest.step('Hakemussivulla', async () => {
      await page.goto(hakemusUrl)
      await hakijaAvustusHakuPage.fillApplication(answers, TEST_Y_TUNNUS)

      await SwedishJotpaTest.step('Näyttää jotpan ruotsinkielisen logon', async () => {
        expect(await page.locator('#logo').screenshot()).toMatchSnapshot('jotpa-logo-sv.png')
      })
    })

    await SwedishJotpaTest.step('"Linkki avustushakemukseen"-Sähköpostissa', async () => {
      const newHakemusEmail = (await pollUntilNewHakemusEmailArrives(avustushakuID, faithEmail))[0]

      await SwedishJotpaTest.step(
        'oph on korvattu jotpalla niiltä osin kuin on sovittu',
        async () => {
          expect(newHakemusEmail['from-address']).toEqual('no-reply@jotpa.fi')

          expect(newHakemusEmail.formatted).not.toContain(
            'per e-post på adressen statsunderstod@oph.fi'
          )
          expect(newHakemusEmail.formatted).toContain('per e-post på adressen rahoitus@jotpa.fi')

          expect(newHakemusEmail.formatted).not.toContain(
            `Utbildningsstyrelsen
Hagnäskajen 6`
          )
          expect(newHakemusEmail.formatted).toContain(
            `Servicecentret för kontinuerligt lärande och sysselsättning
Hagnäskajen 6`
          )

          expect(newHakemusEmail.formatted).not.toContain('fornamn.efternamn@oph.fi')
          expect(newHakemusEmail.formatted).toContain('fornamn.efternamn@jotpa.fi')
        }
      )
    })

    await SwedishJotpaTest.step('"Hakemus vastaanotettu"-Sähköpostissa', async () => {
      await fillJotpaHakemus(hakijaAvustusHakuPage, answers)
      const { userKey } = await hakijaAvustusHakuPage.submitApplication()
      const hakemusID = await hakijaAvustusHakuPage.getHakemusID(avustushakuID, userKey)
      const email = (await waitUntilMinEmails(getHakemusSubmitted, 1, hakemusID))[0]
      console.log(email)

      await SwedishJotpaTest.step('on oikean lähettäjän osoite', async () => {
        expect(email['from-address']).toEqual('no-reply@jotpa.fi')
      })

      await SwedishJotpaTest.step('on oikean lähettäjän nimi', async () => {
        expect(email.formatted).not.toContain(`Utbildningsstyrelsen`)
        expect(email.formatted).toContain(
          `Servicecentret för kontinuerligt lärande och sysselsättning`
        )
      })
    })
  }
)

async function fillJotpaHakemus(page: ReturnType<typeof HakijaAvustusHakuPage>, answers: Answers) {
  await page.fillMuutoshakemusEnabledHakemus(answers, async () => {
    await page.page
      .locator('#previous-income-statement-and-balance-sheet [type="file"]')
      .setInputFiles(dummyPdfPath)
  })
}
