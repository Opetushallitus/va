import { Browser, Page } from 'puppeteer'
import {
  aria,
  clickElement,
  clickElementWithText,
  createRandomHakuValues,
  expectingLoadingProgressBar,
  getElementInnerText,
  getFirstPage,
  getHakemusTokenAndRegisterNumber,
  mkBrowser,
  navigate,
  setPageErrorConsoleLogger,
  setupTestLoggingAndScreenshots,
  VIRKAILIJA_URL,
  waitForClojureScriptLoadingDialogHidden,
  waitForClojureScriptLoadingDialogVisible,
} from '../test-util'
import { ratkaiseMuutoshakemusEnabledAvustushaku } from '../muutoshakemus/muutospaatosprosessi-util'
import axios from 'axios'

jest.setTimeout(400_000)

describe("Maksatukset", () => {
  let browser: Browser
  let page: Page
  let hakemusID: number
  let avustushakuID: number

  beforeAll(async () => {
    browser = await mkBrowser()
    page = await getFirstPage(browser)
    setPageErrorConsoleLogger(page)
  })

  afterAll(async () => {
    await page.close()
    await browser.close()
  })

  setupTestLoggingAndScreenshots(() => page)

  beforeEach(async () => {
    const x = await ratkaiseMuutoshakemusEnabledAvustushaku(page, createRandomHakuValues("Maksatukset"), {
      contactPersonEmail: "erkki.esimerkki@example.com",
      contactPersonName: "Erkki Esimerkki",
      contactPersonPhoneNumber: "666",
      projectName: "Rahassa kylpijät Ky Ay Oy",
    })
    hakemusID = x.hakemusID
    avustushakuID = x.avustushakuID

    await navigate(page, "/admin-ui/payments/")
  })

  it("work with pitkaviite without contact person name", async () => {
    await fillInMaksueranTiedot(page, "asha pasha", "essi.esittelija@example.com", "hygge.hyvaksyja@example.com")

    await expectingLoadingProgressBar(page, "Lähetetään maksatuksia", () =>
      aria(page, "Lähetä maksatukset").then(e => e.click()))

    await removeStoredPitkäviiteFromAllAvustushakuPayments(avustushakuID)
    await reloadPaymentPage(page)

    await gotoLähetetytMaksatuksetTab(page)
    const { "register-number": registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const pitkaviite = registerNumber

    expect(await getBatchPitkäViite(page, 1)).toEqual(pitkaviite)
    expect(await getBatchStatus(page, 1)).toEqual("Lähetetty")
    expect(await getBatchToimittajanNimi(page, 1)).toEqual("Akaan kaupunki")
    expect(await getBatchHanke(page, 1)).toEqual("Rahassa kylpijät Ky Ay Oy")
    expect(await getBatchMaksuun(page, 1)).toEqual("99,999 €")
    expect(await getBatchIBAN(page, 1)).toEqual("FI95 6682 9530 0087 65")
    expect(await getBatchLKPTili(page, 1)).toEqual("82010000")
    expect(await getBatchTaKpTili(page, 1)).toEqual("29103020")
    expect(await getTiliönti(page, 1)).toEqual("99,999 €")

    await putMaksupalauteToMaksatuspalveluAndProcessIt(`
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `)

    await reloadPaymentPage(page)
    await gotoLähetetytMaksatuksetTab(page)
    expect(await getBatchStatus(page, 1)).toEqual("Maksettu")
  })

  it("work with pitkaviite with contact person name", async () => {
    await fillInMaksueranTiedot(page, "asha pasha", "essi.esittelija@example.com", "hygge.hyvaksyja@example.com")

    await expectingLoadingProgressBar(page, "Lähetetään maksatuksia", () =>
      aria(page, "Lähetä maksatukset").then(e => e.click()))
    await reloadPaymentPage(page)

    await gotoLähetetytMaksatuksetTab(page)
    const { "register-number": registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const pitkaviite = `${registerNumber}_1 Erkki Esimerkki`

    expect(await getBatchPitkäViite(page, 1)).toEqual(pitkaviite)
    expect(await getBatchStatus(page, 1)).toEqual("Lähetetty")
    expect(await getBatchToimittajanNimi(page, 1)).toEqual("Akaan kaupunki")
    expect(await getBatchHanke(page, 1)).toEqual("Rahassa kylpijät Ky Ay Oy")
    expect(await getBatchMaksuun(page, 1)).toEqual("99,999 €")
    expect(await getBatchIBAN(page, 1)).toEqual("FI95 6682 9530 0087 65")
    expect(await getBatchLKPTili(page, 1)).toEqual("82010000")
    expect(await getBatchTaKpTili(page, 1)).toEqual("29103020")
    expect(await getTiliönti(page, 1)).toEqual("99,999 €")


    await putMaksupalauteToMaksatuspalveluAndProcessIt(`
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `)

    await reloadPaymentPage(page)
    await gotoLähetetytMaksatuksetTab(page)
    expect(await getBatchStatus(page, 1)).toEqual("Maksettu")
  })
})

async function fillInMaksueranTiedot(page: Page, ashaTunniste: string, esittelijanOsoite: string, hyvaksyjanOsoite: string) {
  await clickElement(page, "#Tositepäivämäärä")
  await clickElementWithText(page, 'button', 'OK')

  async function clearAndType(page: Page, selector: string, content: string) {
    let value = await page.$eval(selector, input => input.getAttribute("value"))
    while (value !== content) {
      await page.type(selector, content, { delay: 50 })
      value = await page.$eval(selector, input => input.getAttribute("value"))
    }
  }

  await clearAndType(page, "[data-test-id=maksatukset-asiakirja--asha-tunniste]", ashaTunniste)
  await clearAndType(page, "[data-test-id=maksatukset-asiakirja--esittelijan-sahkopostiosoite]", esittelijanOsoite)
  await clearAndType(page, "[data-test-id=maksatukset-asiakirja--hyvaksyjan-sahkopostiosoite]", hyvaksyjanOsoite)
  await clickElement(page, "button:not(disabled)[data-test-id=maksatukset-asiakirja--lisaa-asiakirja]")
}

function getUniqueFileName(): string {
  return `va_${new Date().getTime()}.xml`
}

async function putMaksupalauteToMaksatuspalveluAndProcessIt(xml: string): Promise<void> {
  await axios.post(`${VIRKAILIJA_URL}/api/test/process-maksupalaute`, {
    // The XML parser fails if the input doesn't start with "<?xml " hence the trimLeft
    xml: xml.trimLeft(),
    filename: getUniqueFileName()
  })
}

async function removeStoredPitkäviiteFromAllAvustushakuPayments(avustushakuId: number): Promise<void> {
  await axios.post(`${VIRKAILIJA_URL}/api/test/remove-stored-pitkaviite-from-all-avustushaku-payments`, { avustushakuId })
}

const getBatchStatus = getSentPaymentBatchColumn(2)
const getBatchPitkäViite = getSentPaymentBatchColumn(1)
const getBatchToimittajanNimi = getSentPaymentBatchColumn(3)
const getBatchHanke = getSentPaymentBatchColumn(4)
const getBatchMaksuun = getSentPaymentBatchColumn(5)
const getBatchIBAN = getSentPaymentBatchColumn(6)
const getBatchLKPTili = getSentPaymentBatchColumn(7)
const getBatchTaKpTili = getSentPaymentBatchColumn(8)
const getTiliönti = getSentPaymentBatchColumn(9)

async function gotoLähetetytMaksatuksetTab(page: Page): Promise<void> {
  await page.click('[data-test-id=sent-payments-tab]')
}

async function reloadPaymentPage(page: Page) {
  await Promise.all([
    waitForClojureScriptLoadingDialogVisible(page),
    page.reload({ waitUntil: ['load', 'networkidle0'] }),
  ])
  await waitForClojureScriptLoadingDialogHidden(page)
}

function getSentPaymentBatchColumn(column: number) {
  return async (page: Page, paymentBatchRow: number): Promise<string | undefined> => {
    const rowSelector = (n: number) => `[data-test-id=sent-payment-batches-table] tbody > tr:nth-child(${n})`
    return await getElementInnerText(page, `${rowSelector(paymentBatchRow)} > td:nth-child(${column})`)
  }
}
