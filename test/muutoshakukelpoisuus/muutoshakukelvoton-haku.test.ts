import { Browser, Page } from "puppeteer"
import {
  createMuutoshakemusEnabledAvustushakuAndFillHakemus,
  markAvustushakuAsMuutoshakukelvoton
} from "../muutoshakemus/muutospaatosprosessi-util"
import {
  acceptAvustushaku,
  clearAndSet,
  clickElement,
  clickElementWithText,
  createRandomHakuValues,
  getAcceptedPäätösEmails,
  getYhteystiedotMuutettuEmails,
  getFirstPage,
  getHakemusTokenAndRegisterNumber,
  HAKIJA_URL,
  lastOrFail,
  mkBrowser,
  navigate,
  navigateHakija,
  navigateToHakemuksenArviointi,
  setPageErrorConsoleLogger,
  textContent,
  waitForElementWithText,
  waitUntilMinEmails
} from "../test-util"


async function waitForNewTabToOpen(browser: Browser): Promise<Page> {
  return await new Promise<Page>(resolve =>
    browser.once('targetcreated', target => resolve(target.page())))
}

const answers = {
  contactPersonEmail: "erkki.esimerkki@example.com",
  contactPersonName: "Erkki Esimerkki",
  contactPersonPhoneNumber: "666",
  projectName: "Rahassa kylpijät Ky Ay Oy",
}

jest.setTimeout(120000)

describe('When avustushaku is marked as muutoshakukelvoton', function () {
  const haku = createRandomHakuValues()
  let browser: Browser
  let page: Page
  let avustushakuID: number
  let hakemusID: number
  let userKey: string

  beforeAll(async () => {
    browser = await mkBrowser()
    page = await getFirstPage(browser)
    setPageErrorConsoleLogger(page)
    const { avustushakuID: aid, userKey: uk } = await createMuutoshakemusEnabledAvustushakuAndFillHakemus(page, haku, answers)
    avustushakuID = aid
    userKey = uk
    await markAvustushakuAsMuutoshakukelvoton(avustushakuID)
    const { hakemusID: hid } = await acceptAvustushaku(page, avustushakuID)
    hakemusID = hid
  })

  afterAll(async () => {
    await page.close()
    await browser.close()
  })

  it('copying it results in muutoshakukelpoinen avustushaku', async () => {
    await gotoHaunTiedot(page, avustushakuID)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      clickElement(page, 'aria/Kopioi uuden pohjaksi'),
    ])

    expect(await page.$('[data-test-id="muutoshakukelvoton-warning"]')).toBeNull()
  })

  it('shows warning on Haun tiedot tab', async () => {
    await gotoHaunTiedot(page, avustushakuID)
    expect(await textContent(page, '[data-test-id="muutoshakukelvoton-warning"]')).toEqual(
      'Huom.! Uusi muutoshakutoiminnallisuus ei ole käytössä tälle avustushaulle.' +
      'Avustushaun päätöksiin ei tule linkkiä uudelle muutoshakusivulle'
    )
  })

  async function gotoHaunTiedot(page: Page, avustushakuID: number): Promise<void> {
    await navigate(page, `/admin/haku-editor/?avustushaku=${avustushakuID}`)
  }

  it('does not send link to muutoshaku page with päätös', async () => {
    const { token, 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const emails = await waitUntilMinEmails(getAcceptedPäätösEmails, 1, hakemusID)
    const email = lastOrFail(emails)
    expect(email.formatted).toEqual( `${registerNumber} - ${answers.projectName}

${haku.avustushakuName}

Avustuspäätöstä voitte tarkastella tästä linkistä: ${HAKIJA_URL}/paatos/avustushaku/${avustushakuID}/hakemus/${userKey}

Avustuksen saajan tulee noudattaa avustuspäätöksessä sekä sen liitteissä kuvattuja ehtoja ja rajoituksia.

Mikäli otatte päätöksen mukaisen avustuksen vastaan, voitte käynnistää hankkeen. Avustussumma maksetaan päätöksessä ilmoitettuun päivämäärään mennessä.

Mikäli ette ota päätöksen mukaista avustusta vastaan, tulee siitä ilmoittaa Opetushallitukselle päätöksessä mainittuun päivämäärään mennessä. Ilmoitus asiasta tehdään valtionavustusjärjestelmään tästä linkistä: ${HAKIJA_URL}/avustushaku/${avustushakuID}/nayta?avustushaku=${avustushakuID}&hakemus=${userKey}&lang=fi&preview=true&token=${token}&refuse-grant=true&modify-application=false

Avustuksen saaja vastaa siitä, että valtionavustusjärjestelmään kirjatut yhteyshenkilön yhteystiedot ovat aina ajan tasalla. Yhteyshenkilö vaihdetaan oheisen linkin kautta, joka on käytettävissä läpi avustuksen käyttöajan:

${HAKIJA_URL}/avustushaku/${avustushakuID}/nayta?avustushaku=${avustushakuID}&hakemus=${userKey}&lang=fi&preview=false&token=${token}&refuse-grant=false&modify-application=true

Selvityspyynnöt sekä muut valtionavustusjärjestelmästä hankkeille osoitetut viestit saapuvat osoitteesta no-reply@valtionavustukset.oph.fi, ja ne lähetetään sekä hankkeen yhteyshenkilölle että hakijan ilmoittamaan viralliseen sähköpostiosoitteeseen.

Avustuksen saajan tulee säilyttää tämä viesti sekä viestin sisältämät linkit.

Tarvittaessa tarkempia lisätietoja antaa avustuspäätöksessä nimetty lisätietojen antaja.



Opetushallitus
Hakaniemenranta 6
PL 380, 00531 Helsinki
puhelin 029 533 1000
etunimi.sukunimi@oph.fi`)
  })

  it('navigates to the old virkailija edit view', async () => {
    await navigateToHakemuksenArviointi(page, avustushakuID, answers.projectName)
    await clickElementWithText(page, 'button', 'Muokkaa hakemusta')
    await page.type('[data-test-id="virkailija-edit-comment"]', 'Kuhan tässä nyt muokkaillaan')

    const newPagePromise = waitForNewTabToOpen(browser)
    await clickElementWithText(page, 'button', 'Siirry muokkaamaan')
    const modificationPage = await newPagePromise

    await modificationPage.bringToFront()
    expect(await modificationPage.evaluate(() => window.location.href))
      .toMatch(`${HAKIJA_URL}/avustushaku/${avustushakuID}/nayta?hakemus=${userKey}`)
    await page.bringToFront()
  })

  it('does not show link to muutoshaku in email preview', async () => {
    await navigate(page, `/admin/decision/?avustushaku=${avustushakuID}`)
    expect(await textContent(page, '.decision-email-content'))
      .toEqual(` - 

${haku.avustushakuName}

Avustuspäätöstä voitte tarkastella tästä linkistä: ${HAKIJA_URL}/paatos/avustushaku/${avustushakuID}/hakemus/

Avustuksen saajan tulee noudattaa avustuspäätöksessä sekä sen liitteissä kuvattuja ehtoja ja rajoituksia.

Mikäli otatte päätöksen mukaisen avustuksen vastaan, voitte käynnistää hankkeen. Avustussumma maksetaan päätöksessä ilmoitettuun päivämäärään mennessä.

Mikäli ette ota päätöksen mukaista avustusta vastaan, tulee siitä ilmoittaa Opetushallitukselle päätöksessä mainittuun päivämäärään mennessä. Ilmoitus asiasta tehdään valtionavustusjärjestelmään tästä linkistä: ${HAKIJA_URL}/avustushaku/${avustushakuID}/nayta?avustushaku=${avustushakuID}&hakemus=&lang=fi&preview=true&token=&refuse-grant=true&modify-application=false

Avustuksen saaja vastaa siitä, että valtionavustusjärjestelmään kirjatut yhteyshenkilön yhteystiedot ovat aina ajan tasalla. Yhteyshenkilö vaihdetaan oheisen linkin kautta, joka on käytettävissä läpi avustuksen käyttöajan:



Selvityspyynnöt sekä muut valtionavustusjärjestelmästä hankkeille osoitetut viestit saapuvat osoitteesta no-reply@valtionavustukset.oph.fi, ja ne lähetetään sekä hankkeen yhteyshenkilölle että hakijan ilmoittamaan viralliseen sähköpostiosoitteeseen.

Avustuksen saajan tulee säilyttää tämä viesti sekä viestin sisältämät linkit.

Tarvittaessa tarkempia lisätietoja antaa avustuspäätöksessä nimetty lisätietojen antaja.



Opetushallitus
Hakaniemenranta 6
PL 380, 00531 Helsinki
puhelin 029 533 1000
etunimi.sukunimi@oph.fi`)
  })

  describe('when hakija changes yhteyshenkilö', () => {

    beforeAll(async () => {
      const token = (await getHakemusTokenAndRegisterNumber(hakemusID)).token
      await navigateToHaunYhteystietojenMuokkaus(token)
      await clickElementWithText(page, 'button', 'Aloita yhteystietojen muokkaus')
      await waitForElementWithText(page, 'button', 'Tallenna muutos ja lopeta muokkaus')
      await clearAndSet(page, '#applicant-name', 'Etunimi Takanimi')
      await submitChanges()
      await clickElementWithText(page, 'button', 'Tallenna muutos ja lopeta muokkaus')
    })

    it('sends a notification to hakija', async () => {
      const emails = await waitUntilMinEmails(getYhteystiedotMuutettuEmails, 1, hakemusID)
      expect(emails).toHaveLength(1)
    })

    async function navigateToHaunYhteystietojenMuokkaus(token: string) {
      await navigateHakija(page, `/avustushaku/${avustushakuID}/nayta?avustushaku=${avustushakuID}&hakemus=${userKey}&lang=fi&preview=false&token=${token}&refuse-grant=false&modify-application=true`)
    }

    async function submitChanges() {
      await page.waitForFunction(() => (document.querySelector("#applicant-edit-submit") as HTMLInputElement).disabled === false)
      await clickElementWithText(page, 'button', 'Tallenna muutos ja lopeta muokkaus')
    }
  })
})
