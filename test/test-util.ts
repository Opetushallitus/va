import * as xlsx from "xlsx"
import * as path from "path"
import * as yup from "yup"
import axios from "axios"
import {
  launch,
  Browser,
  Page,
  ElementHandle,
  WaitForSelectorOptions,
  Frame,
} from "puppeteer"
import * as assert from "assert"
import * as fs from "fs"
import moment from 'moment'
const {randomBytes} = require("crypto")

const HAKIJA_HOSTNAME = process.env.HAKIJA_HOSTNAME || 'localhost'
const HAKIJA_PORT = 8080

const VIRKAILIJA_HOSTNAME = process.env.VIRKAILIJA_HOSTNAME || 'localhost'
const VIRKAILIJA_PORT = 8081

export const VIRKAILIJA_URL = `http://${VIRKAILIJA_HOSTNAME}:${VIRKAILIJA_PORT}`
export const HAKIJA_URL = `http://${HAKIJA_HOSTNAME}:${HAKIJA_PORT}`

export const dummyPdfPath = path.join(__dirname, 'dummy.pdf')
export const dummyExcelPath = path.join(__dirname, 'dummy.xls')
export const standardizedHakulomakeJson = fs.readFileSync(path.join(__dirname, 'vakioitu-hakulomake.json'), 'utf8')

export const TEST_Y_TUNNUS = "2050864-5"

export interface Email {
  formatted: string
  "to-address": string[]
  bcc: string | null
  subject?: string
}

const emailSchema = yup.array().of(yup.object().shape<Email>({
  formatted: yup.string().required(),
  "to-address": yup.array().of(yup.string().required()).defined(),
  bcc: yup.string().defined().nullable(),
  subject: yup.string().optional(),
}).required()).defined()

export function setPageErrorConsoleLogger(page: Page) {
  page.on('error', err => {
    log('error in page: ', err)
  })

  page.on('pageerror', pageerr => {
    log('pageerror: ', pageerr)
  })

  page.on('request', async (request) => {
    if (!request.url().startsWith('data:image')) {
      log(`Outgoing request to ${request.url()}, navigation: ${request.isNavigationRequest()}`)
    }
  })

  page.on('requestfailed', request => {
    log(`Request failed to url: ${request.url()},
       errorText: ${request.failure()?.errorText},
       method: ${request.method()}`, request)
  })
}

export async function getElementInnerText(page: Page | Frame, selector: string) {
    return await page.evaluate((s: string) => (document.querySelector(s) && document.querySelector(s) as HTMLElement)?.innerText, selector)
}

export async function getElementAttribute(page: Page, selector: string, attribute: string) {
    return await page.evaluate((s: string, a: string) =>
          (document.querySelector(s) && document.querySelector(s) as HTMLElement)?.getAttribute(a), selector, attribute)
}

export async function hasElementAttribute(page: Page, selector: string, attribute: string) {
    return await page.evaluate((s: string, a: string) =>
          (document.querySelector(s) && document.querySelector(s) as HTMLElement)?.hasAttribute(a), selector, attribute)
}

export async function countElements(page: Page, selector: string) {
  return await page.evaluate((selector: string) => document.querySelectorAll(selector).length, selector)
}

type HakemusTokenAndRegisterNumber = { token: string, 'register-number': string }
export async function getHakemusTokenAndRegisterNumber(hakemusId: number): Promise<HakemusTokenAndRegisterNumber> {
  const applicationGeneratedValuesSchema = yup.object().required().shape<HakemusTokenAndRegisterNumber>({
    token: yup.string().required(),
    'register-number': yup.string().required(),
  })

  return await axios.get(`${VIRKAILIJA_URL}/api/test/hakemus/${hakemusId}/token-and-register-number`)
    .then(r => applicationGeneratedValuesSchema.validate(r.data))
}

const getEmails = (emailType: string) => (hakemusID: number): Promise<Email[]> =>
  axios.get(`${VIRKAILIJA_URL}/api/test/hakemus/${hakemusID}/email/${emailType}`)
    .then(r => { console.log(`getEmails(${emailType})`, r.data); return r })
    .then(r => emailSchema.validate(r.data))

export const getValmistelijaEmails = getEmails("notify-valmistelija-of-new-muutoshakemus")
export const getMuutoshakemusPaatosEmails = getEmails("muutoshakemus-paatos")
export const getMuutoshakemusEmails = getEmails("paatos-refuse")
export const getValiselvitysEmails = getEmails("valiselvitys-notification")
export const getLoppuselvitysEmails = getEmails("loppuselvitys-notification")
export const getAcceptedPäätösEmails = getMuutoshakemusEmails
export const getTäydennyspyyntöEmails = getEmails("change-request")
export async function waitUntilMinEmails(f: (hakemusId: number) => Promise<Email[]>, minEmails: number, hakemusId: number) {
  let emails: Email[] = await f(hakemusId)

  while (emails.length < minEmails) {
    await waitFor(1000)
    emails = await f(hakemusId)
  }
  return emails
}

export const linkToMuutoshakemusPaatosRegex = /https?:\/\/.*\/muutoshakemus\/paatos.*/

async function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


export async function getNewHakemusEmails(avustushakuID: number): Promise<Email[]> {
  try {
    const emails = await axios.get<Email>(`${VIRKAILIJA_URL}/api/test/avustushaku/${avustushakuID}/email/new-hakemus`)
    return emailSchema.validate(emails.data)
  } catch (e) {
    log(`Failed to get emails for avustushaku ${avustushakuID}`, e)
    throw e
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function pollUntilNewHakemusEmailArrives(avustushakuID: number): Promise<Email[]> {
  while(true) {
    try {
      const emails = await getNewHakemusEmails(avustushakuID)
      if (emails.length > 0) {
        log(`Received emails`, JSON.stringify(emails, null, 2))
        return emails
      } else {
        log('No emails received')
        await sleep(1000)
      }
    } catch(e) {
      console.log(`Failed to get hakemus emails: ${e.message}`)
    }
  }
}


export async function getLinkToHakemusFromSentEmails(hakemusID: number) {
  const emails = await waitUntilMinEmails(getValmistelijaEmails, 1, hakemusID)

  const linkToHakemusRegex = /https?:\/\/.*\/avustushaku.*/
  const linkToHakemus = emails[0]?.formatted.match(linkToHakemusRegex)?.[0]
  expectToBeDefined(linkToHakemus)
  return linkToHakemus
}

export function mkBrowser() {
  const headless = process.env['HEADLESS'] === 'true'
  return launch({
    args: headless ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    slowMo: 0,
    headless: headless,
    timeout: 10_000,
    defaultViewport: { width: 1920, height: 1080 },
  })
}

export const getFirstPage = (browser: Browser) =>
  browser.pages().then(pages => pages[0])


export async function navigate(page: Page, path: string) {
  await page.goto(`${VIRKAILIJA_URL}${path}`, { waitUntil: "networkidle0" })
}

export async function navigateHakija(page: Page, path: string) {
  await page.goto(`${HAKIJA_URL}${path}`, { waitUntil: "networkidle0" })
}

export async function navigateToHakemuksenArviointi(page: Page, avustushakuID: number, hakijaName: string): Promise<{ hakemusID: number }> {
  await navigate(page, `/avustushaku/${avustushakuID}/`)
  await Promise.all([
    page.waitForNavigation(),
    clickElementWithText(page, "td", hakijaName),
  ])

  const hakemusID = await page.evaluate(() => window.location.pathname.match(/\/hakemus\/(\d+)\//)?.[1]).then(assumedHakemusID => {
    expectToBeDefined(assumedHakemusID)
    return parseInt(assumedHakemusID)
  })

  return { hakemusID }
}

export async function navigateToPaatos(page: Page, hakemusID: number) {
  const emails = await waitUntilMinEmails(getAcceptedPäätösEmails, 1, hakemusID)
  const linkToPaatos = emails[0]?.formatted.match(/https?:\/\/.*\/paatos\/.*/)?.[0]
  if (linkToPaatos) {
    await page.goto(linkToPaatos, { waitUntil: "networkidle0" })
  } else {
    throw new Error('did not find link to päätös')
  }
}

export interface MailWithLinks extends Email {
  title: string | undefined
  linkToMuutoshakemusPaatos: string | undefined
  linkToMuutoshakemus: string | undefined
}

export async function createValidCopyOfEsimerkkihakuAndReturnTheNewId(page: Page, hakuName?: string, registerNumber?: string): Promise<number> {
  return await createHakuFromEsimerkkihaku(page, {
    name: hakuName,
    registerNumber: registerNumber
  })
}

interface HakuProps {
  name?: string
  registerNumber?: string
  hakuaikaStart?: string
  hakuaikaEnd?: string
  hankkeenAlkamispaiva?: string
  hankkeenPaattymispaiva?: string
}

export async function createHakuFromEsimerkkihaku(page: Page, props: HakuProps): Promise<number> {
  const { name, registerNumber, hakuaikaStart, hakuaikaEnd, hankkeenAlkamispaiva, hankkeenPaattymispaiva } = props
  const avustushakuName = name || mkAvustushakuName()
  console.log(`Avustushaku name for test: ${avustushakuName}`)

  await copyEsimerkkihaku(page)

  const avustushakuID = parseInt(await expectQueryParameter(page, "avustushaku"))
  console.log(`Avustushaku ID: ${avustushakuID}`)

  await clearAndType(page, "#register-number", registerNumber || "230/2015")
  await clearAndType(page, "#haku-name-fi", avustushakuName)
  await clearAndType(page, "#haku-name-sv", avustushakuName + ' på svenska')
  await clearAndType(page, "#hakuaika-start", hakuaikaStart || "1.1.1970 0.00")

  const nextYear = (new Date()).getFullYear() + 1
  await clearAndType(page, "#hakuaika-end", hakuaikaEnd || `31.12.${nextYear} 23.59`)

  await clickElement(page, '[data-test-id="päätös-välilehti"]')
  await setCalendarDateForSelector(page, hankkeenAlkamispaiva || '20.04.1969', '[data-test-id="hankkeen-alkamispaiva"] div.datepicker input')
  await setCalendarDateForSelector(page, hankkeenPaattymispaiva || '20.04.4200', '[data-test-id="hankkeen-paattymispaiva"] div.datepicker input')
  await clickElementWithText(page, "span", "Haun tiedot")

  await waitForSave(page)

  return avustushakuID
}

export async function publishAvustushaku(page: Page) {
  await clickElement(page, "label[for='set-status-published']")
  await waitForSave(page)
}

export async function fillAndSendHakemus(page: Page, avustushakuID: number, beforeSubmitFn?: () => void) {
  await navigateHakija(page, `/avustushaku/${avustushakuID}/`)

  await page.waitForSelector('#haku-not-open', { hidden: true, timeout: 500 })
  await clearAndType(page, "#primary-email", "erkki.esimerkki@example.com")
  await clickElement(page, "#submit:not([disabled])")

  await navigateToNewHakemusPage(page, avustushakuID)

  await clearAndType(page, "#finnish-business-id", TEST_Y_TUNNUS)
  await clickElement(page, "input.get-business-id")

  await clearAndType(page, "#applicant-name", "Erkki Esimerkki")
  await clearAndType(page, "#signature", "Erkki Esimerkki")
  await clearAndType(page, "#signature-email", "erkki.esimerkki@example.com")
  await clearAndType(page, "#bank-iban", "FI95 6682 9530 0087 65")
  await clearAndType(page, "#bank-bic", "OKOYFIHH")
  await clickElementWithText(page, "label", "Kansanopisto")

  await clearAndType(page, "[name='project-costs-row.amount']", "100000")
  await uploadFile(page, "[name='previous-income-statement-and-balance-sheet']", dummyPdfPath)
  await uploadFile(page, "[name='previous-financial-year-report']", dummyPdfPath)
  await uploadFile(page, "[name='previous-financial-year-auditor-report']", dummyPdfPath)
  await uploadFile(page, "[name='current-year-plan-for-action-and-budget']", dummyPdfPath)
  await uploadFile(page, "[name='description-of-functional-development-during-last-five-years']", dummyPdfPath)
  await uploadFile(page, "[name='financial-information-form']", dummyPdfPath)

  if (beforeSubmitFn) {
    await beforeSubmitFn()
  }

  await page.waitForFunction(() => (document.querySelector("#topbar #form-controls button#submit") as HTMLInputElement).disabled === false)
  await clickElement(page, "#topbar #form-controls button#submit")
  await page.waitForFunction(() => (document.querySelector("#topbar #form-controls button#submit") as HTMLInputElement).textContent === "Hakemus lähetetty")
}

function getHakemusUrlFromEmail(email: Email) {
  return email.formatted.match(/https?:\/\/.*\/avustushaku.*/)?.[0] || email.formatted.match(/https?:\/\/.*\/statsunderstod.*/)?.[0]
}

export async function navigateToNewHakemusPage(page: Page, avustushakuID: number) {
  const receivedEmail = await pollUntilNewHakemusEmailArrives(avustushakuID)
  const hakemusUrl = getHakemusUrlFromEmail(receivedEmail[0])
  expectToBeDefined(hakemusUrl)

  await page.goto(hakemusUrl, { waitUntil: "networkidle0" })
}

export function createRandomHakuValues(name: string = 'Muutospäätösprosessi') {
  return {
    registerNumber: "230/2015",
    avustushakuName: `Testiavustushaku (${name}) ${randomString()} - ${moment(new Date()).format('YYYY-MM-DD hh:mm:ss:SSSS')}`
  }
}

export const defaultBudget = {
  amount: {
    personnel: "200000",
    material: "3000",
    equipment: "10000",
    'service-purchase': "100",
    rent: "161616",
    steamship: "100",
    other: "10000000",
  },
  description: {
    personnel: "Tarvitsemme ihmisiä aaltoihin.",
    material: "Jari Sarasvuon aalto-VHS-kasetteja.",
    equipment: "Hankimme aaltokoneen toimistolle.",
    'service-purchase': "Ostamme alihankkijoita jatkamaan aaltojamme.",
    rent: "Vuokraamme Aalto-yliopistolta seminaaritiloja.",
    steamship: "Taksikyydit Otaniemeen.",
    other: "Vähän ylimääräistä pahan päivän varalle.",
  },
  selfFinancing: "1",
}

export type BudgetAmount = typeof defaultBudget.amount
export type Budget = {
  amount: BudgetAmount
  description: { [k in keyof BudgetAmount]: string }
  selfFinancing: string
}

export async function fillBudget(page: Page, budget: Budget = defaultBudget, type: 'hakija' | 'virkailija') {

  const prefix = type === 'virkailija' ? 'budget-edit-' : ''

  await clearAndType(page, `[id='${prefix}personnel-costs-row.description']`, budget.description.personnel)
  await clearAndType(page, `[id='${prefix}personnel-costs-row.amount']`, budget.amount.personnel)
  await clearAndType(page, `[id='${prefix}material-costs-row.description']`, budget.description.material)
  await clearAndType(page, `[id='${prefix}material-costs-row.amount']`, budget.amount.material)
  await clearAndType(page, `[id='${prefix}equipment-costs-row.description']`, budget.description.equipment)
  await clearAndType(page, `[id='${prefix}equipment-costs-row.amount']`, budget.amount.equipment)
  await clearAndType(page, `[id='${prefix}service-purchase-costs-row.description']`, budget.description['service-purchase'])
  await clearAndType(page, `[id='${prefix}service-purchase-costs-row.amount']`, budget.amount['service-purchase'])
  await clearAndType(page, `[id='${prefix}rent-costs-row.description']`, budget.description.rent)
  await clearAndType(page, `[id='${prefix}rent-costs-row.amount']`, budget.amount.rent)
  await clearAndType(page, `[id='${prefix}steamship-costs-row.description']`, budget.description.steamship)
  await clearAndType(page, `[id='${prefix}steamship-costs-row.amount']`, budget.amount.steamship)
  await clearAndType(page, `[id='${prefix}other-costs-row.description']`, budget.description.other)
  await clearAndType(page, `[id='${prefix}other-costs-row.amount']`, budget.amount.other)

  if (type === 'hakija') {
    await clearAndType(page, `[id='${prefix}self-financing-amount']`, budget.selfFinancing)
  }
}

export async function expectQueryParameter(page: Page, paramName: string): Promise<string> {
  const value = await page.evaluate(param => (new URLSearchParams(window.location.search)).get(param), paramName)
  if (!value) throw Error(`Expected page url '${page.url()}' to have query parameter '${paramName}'`)
  return value
}

export async function uploadFile(page: Page, selector: string, filePath: string) {
  const element = await page.$(selector)
  await element?.uploadFile(filePath)
}

export async function closeAvustushakuByChangingEndDateToPast(page: Page, avustushakuID: number) {
  await navigate(page, `/admin/haku-editor/?avustushaku=${avustushakuID}`)
  const previousYear = (new Date()).getFullYear() - 1
  await clearAndType(page, "#hakuaika-end", `1.1.${previousYear} 0.00`)
  await waitForSave(page)
}


export function mkAvustushakuName() {
  return "Testiavustushaku " + randomString()
}

export function randomString() {
  return randomBytes(8).toString("hex")
}

export function log(...args: any[]) {
  console.log(moment().format('YYYY-MM-DD HH:mm:ss.SSSS'), ...args)
}

export function expectToBeDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    expect(val).toBeDefined();
  }
}

export async function copyEsimerkkihaku(page: Page) {
  await navigate(page, "/admin/haku-editor/")
  await clickElement(page, ".haku-filter-remove")
  const element = await clickElementWithText(page, "td", "Yleisavustus - esimerkkihaku") as ElementHandle
  const currentHakuTitle = await (await element.getProperty('textContent'))?.jsonValue() as string
  await clickElementWithText(page, "a", "Kopioi uuden pohjaksi")

  await page.waitForFunction((name: string) =>
    document.querySelector("#haku-name-fi")?.textContent !== name, {}, currentHakuTitle)
  await page.waitForFunction(() => document.querySelector('[data-test-id="save-status"]')?.textContent === 'Kaikki tiedot tallennettu')
  await page.waitForTimeout(2000)
}

export async function clickElement(page: Page, selector: string) {
  const element = await page.waitForSelector(selector, {visible: true, timeout: 5 * 1000})
  if (!element) throw new Error(`Could not click element with selector: ${selector}`)
  await element.click()
  return element
}

export async function clickElementWithText(page: Page, elementType: string, text: string) {
  const element = await waitForElementWithText(page, elementType, text)
  assert.ok(element, `Could not find ${elementType} element with text '${text}'`)
  await element?.click()
  return element
}

export async function selectMaakuntaFromDropdown(page: Page, text: string) {
  const maakuntainput = await clickElement(page,'#koodistoField-1_input .rw-dropdown-list-input')
  await maakuntainput.type(text)
  await clickDropdownElementWithText(page, text)
}

export async function selectAvustushakuFromDropdown(page: Page, text: string) {
  const input = await clickElement(page,'#avustushaku-dropdown .dropdown-list .rw-dropdown-list-input')
  await input.type(text)
  await clickDropdownElementWithText(page, text)
}

export async function clickDropdownElementWithText(page: Page, text: string) {
  const element = await waitForDropdownElementWithText(page, text)
  assert.ok(element, `Could not find dropdown element with text '${text}'`)
  await element?.click()
  return element
}

export async function waitForElementWithText(page: Page, elementType: string, text: string, waitForSelectorOptions: WaitForSelectorOptions = {visible: true}) {
  return await page.waitForXPath(`//${elementType}[contains(., '${text}')]`, waitForSelectorOptions)
}

export async function waitForDropdownElementWithText(page: Page, text: string) {
  return waitForElementWithAttribute(page, 'role', 'option', text)
}

async function waitForElementWithAttribute(page: Page, attribute: string, attributeValue: string, text: string, waitForSelectorOptions: WaitForSelectorOptions = {visible: true}) {
  return await page.waitForXPath(`//*[@${attribute}='${attributeValue}'][contains(., '${text}')]`, waitForSelectorOptions)
}

export async function clearAndType(page: Page, selector: string, text: string) {
  const element = await page.waitForSelector(selector, {visible: true, timeout: 5 * 1000})
  if (!element) throw new Error(`Could not type text to element with selector: ${selector}`)
  await element.click()
  await page.evaluate(e => e.value = "", element)
  await page.keyboard.type(text)
  await page.evaluate(e => e.blur(), element)
}

export async function waitForSave(page: Page) {
  await page.waitForFunction(() => document.querySelector("#form-controls .status .info")?.textContent === "Kaikki tiedot tallennettu")
}

export async function waitForArvioSave(page: Page, avustushakuID: number, hakemusID: number) {
  await page.waitForResponse(`${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/hakemus/${hakemusID}/arvio`)
}

export async function resolveAvustushaku(page: Page, avustushakuID: number) {
  await navigate(page, `/admin/haku-editor/?avustushaku=${avustushakuID}`)
  await clickElement(page, "label[for='set-status-resolved']")
  await waitForSave(page)
}

export async function sendPäätös(page: Page, avustushakuID: number) {
  await navigate(page, `/admin/decision/?avustushaku=${avustushakuID}`)
  await clickElementWithText(page, "button", "Lähetä 1 päätöstä")

  await Promise.all([
    page.waitForResponse(`${VIRKAILIJA_URL}/api/paatos/sendall/${avustushakuID}`),
    clickElementWithText(page, "button", "Vahvista lähetys"),
  ])
}

export async function textContent(page: Page, selector: string) {
  const element = await page.waitForSelector(selector, {visible: true})
  return await page.evaluate(_ => _.textContent, element)
}

export async function selectValmistelijaForHakemus(page: Page, avustushakuID: number, hakemusID: number, valmistelijaName: string) {
  await navigate(page, `/avustushaku/${avustushakuID}/`)
  await clickElement(page, `#hakemus-${hakemusID} .btn-role`)

  const xpath = `//table[contains(@class, 'hakemus-list')]/tbody//tr[contains(@class, 'selected')]//button[contains(., '${valmistelijaName}')]`
  const valmistelijaButton = await page.waitForXPath(xpath, {visible: true})
  if (!valmistelijaButton) throw new Error(`Valmistelija button not found with XPath: ${xpath}`)

  await Promise.all([
    page.waitForResponse(`${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/hakemus/${hakemusID}/arvio`),
    valmistelijaButton.click(),
  ])
}

export async function deleteAttachment(page: Page, attachmentFieldId: string) {
  await clickElement(page, `#${attachmentFieldId} button.soresu-remove`)
  await page.waitForSelector(`[name='${attachmentFieldId}']`)
}

export async function verifyText(page: Page, selector: string, regex: RegExp) {
  await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({block: 'center'}), selector)
  const element = await page.waitForSelector(selector, { visible: true })
  const text = await page.evaluate(element => element.textContent, element)
  assert.ok(regex.test(text), `Text ${regex.source} found from: ${text}`)
}

async function removePreviousHoverEffect(page: Page) {
  /* Move mouse away from current position, hopefully to a place with no hover effects */
  await page.mouse.move(0, 0)
}

export async function verifyTooltipText(page: Page, tooltipAnchorSelector: string, tooltipTextRegex: RegExp) {
  await removePreviousHoverEffect(page)
  const tooltipContentSelector = `${tooltipAnchorSelector} span`
  await page.evaluate((tooltipAnchorSelector) => {
    document.querySelector(tooltipAnchorSelector).scrollIntoView({ block: 'center' });
  }, tooltipAnchorSelector)

  await page.hover(tooltipAnchorSelector)
  const tooltipElement = await page.waitForSelector(tooltipContentSelector, { visible: true })
  const tooltipText = await page.evaluate(element => element.textContent, tooltipElement)
  assert.ok(tooltipTextRegex.test(tooltipText), `Tooltip ${tooltipTextRegex.source} found from: ${tooltipText}`)
}

export async function createValidCopyOfLukioEsimerkkihakuWithValintaperusteetAndReturnTheNewId(page: Page) {
  const avustushakuName = mkAvustushakuName()
  console.log(`Avustushaku name for test: ${avustushakuName}`)

  await copyEsimerkkihaku(page)

  const avustushakuID = await expectQueryParameter(page, "avustushaku")

  expectToBeDefined(avustushakuID)

  console.log(`Avustushaku ID: ${avustushakuID}`)

  await clearAndType(page, "#register-number", "230/2015")
  await clearAndType(page, "#haku-name-fi", avustushakuName)
  await clearAndType(page, "#hakuaika-start", "1.1.1970 0.00")

  const lukioKoulutusasteSelector = '[name=education-levels][data-title="Lukiokoulutus"]'
  await clearAndType(page, lukioKoulutusasteSelector, "29.10.30")

  await clickElementWithText(page, "button", "Lisää uusi valintaperuste")
  await clearAndType(page, "#selection-criteria-0-fi", "Hanke edistää opetustuntikohtaisen valtionosuuden piiriin kuuluvan taiteen perusopetuksen pedagogista kehittämistä.")
  await clearAndType(page, "#selection-criteria-0-sv", "Och samma på svenska.")

  const nextYear = (new Date()).getFullYear() + 1
  await clearAndType(page, "#hakuaika-end", `31.12.${nextYear} 23.59`)

  await clickElement(page, '[data-test-id="päätös-välilehti"]')
  await setCalendarDateForSelector(page, '20.04.1969', '[data-test-id="hankkeen-alkamispaiva"] div.datepicker input')
  await setCalendarDateForSelector(page, '20.04.4200', '[data-test-id="hankkeen-paattymispaiva"] div.datepicker input')
  await clickElementWithText(page, "span", "Haun tiedot")

  await waitForSave(page)

  return parseInt(avustushakuID)
}

export async function gotoPäätösTab(page: Page, avustushakuID: number) {
  await navigate(page, `/admin/decision/?avustushaku=${avustushakuID}`)
}

export async function addFieldOfSpecificTypeToFormAndReturnElementIdAndLabel(page: Page, avustushakuID: number, fieldType: string) {
  const fieldId = "fieldId" + randomString()
  return addFieldToFormAndReturnElementIdAndLabel(page, avustushakuID, fieldId, fieldType)
}

export async function addFieldToFormAndReturnElementIdAndLabel(page: Page, avustushakuID: number, fieldId: string, fieldType: string) {
  const fields = [{fieldId: fieldId, fieldType: fieldType}]
  const augmentedFields = await addFieldsToFormAndReturnElementIdsAndLabels(page, avustushakuID, fields)
  return augmentedFields[0]
}

interface Field {
  fieldId: string
  fieldType: string
}

async function addFieldsToFormAndReturnElementIdsAndLabels(page: Page, avustushakuID: number, fields: Field[]) {
  await clickElementWithText(page, "span", "Hakulomake")
  const jsonString = await textContent(page, ".form-json-editor textarea")
  const json = JSON.parse(jsonString)
  const content = json.content

  const fieldsWithIdAndLabel = fields.map(({ fieldId, fieldType }) => ({
    fieldType: fieldType,
    fieldId: fieldId,
    fieldLabel: "fieldLabel" + randomString(),
  }))

  const fieldsJson = fieldsWithIdAndLabel.map(({ fieldType, fieldId, fieldLabel }) => fieldJson(fieldType, fieldId, fieldLabel))
  const newJson = JSON.stringify(Object.assign({}, json, { content: content.concat(fieldsJson) }))
  await clearAndSet(page, ".form-json-editor textarea", newJson)

  await clickFormSaveAndWait(page, avustushakuID)

  return fieldsWithIdAndLabel
}

function fieldJson(type: string, id: string, label: string) {
  return {
    "fieldClass": "wrapperElement",
    "id": id + 'wrapper',
    "fieldType": "theme",
    "children": [
      {
        "label": {
          "fi": label + "fi",
          "sv": label + "sv"
        },
        "fieldClass": "formField",
        "helpText": {
          "fi": "helpText fi",
          "sv": "helpText sv"
        },
        "id": id,
        "params": {
          "size": "small",
          "maxlength": 1000
        },
        "required": true,
        "fieldType": type
      }
    ]}
}

export async function clearAndSet(page: Page, selector: string, text: string) {
  const element = await page.waitForSelector(selector, {visible: true, timeout: 5 * 1000})
  await page.evaluate((e, t) => e.value = t, element, text)
  await page.focus(selector);
  await page.keyboard.type(' ')
  await page.keyboard.press('Backspace')
}

export async function clickFormSaveAndWait(page: Page, avustushakuID: number) {
  await Promise.all([
    page.waitForResponse(response => response.url() === `${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/form` && response.status() === 200),
    clickElementWithText(page, "button", "Tallenna")
  ])
}

export async function typeValueInFieldAndExpectValidationError(page: Page, fieldId: string, value: string, fieldLabel: string, errorMessage: string) {
  const selector = '#' + fieldId
  const errorSummarySelector = 'a.validation-errors-summary'
  await clearAndType(page, selector, value)
  await page.waitForSelector(errorSummarySelector, { visible: true })
  assert.equal(await textContent(page, errorSummarySelector), '1 vastauksessa puutteita')
  await clickElement(page, errorSummarySelector)
  assert.equal(await textContent(page, '.validation-errors'), fieldLabel + errorMessage)
  await page.waitForSelector('#submit:disabled')
}

export async function typeValueInFieldAndExpectNoValidationError(page: Page, fieldId: string, value: string) {
  const selector = '#' + fieldId
  const errorSummarySelector = 'a.validation-errors-summary'
  await clearAndType(page, selector, value)
  await page.waitForFunction((s: string) => document.querySelector(s) == null, {}, errorSummarySelector)
  await page.waitForSelector('#submit:enabled')
}

export async function gotoVäliselvitysTab(page: Page, avustushakuID: number) {
  await navigate(page, `/admin/valiselvitys/?avustushaku=${avustushakuID}`)
}

export async function fillAndSendVäliselvityspyyntö(page: Page, avustushakuID: number, väliselvitysKey: string) {
  await navigateHakija(page, `/avustushaku/${avustushakuID}/valiselvitys?hakemus=${väliselvitysKey}&lang=fi`)
  await clearAndType(page, "#organization", "Akaan kaupungin kissojenkasvatuslaitos")
  await clearAndType(page, "#project-name", "Kissojen koulutuksen tehostaminen")
  await clearAndType(page, "[name='project-description.project-description-1.goal']", "Kouluttaa kissoja entistä tehokkaamminen")
  await clearAndType(page, "[name='project-description.project-description-1.activity']", "Kissoille on tarjottu enemmän kissanminttua")
  await clearAndType(page, "[name='project-description.project-description-1.result']", "Ei tiedossa")

  await clearAndType(page, "[name='textArea-1']", "Miten hankeen toimintaa, tuloksia ja vaikutuksia on arvioitu?")
  await clearAndType(page, "[name='textArea-3']", "Miten hankkeesta/toiminnasta on tiedotettu?")

  await clickElementWithText(page, "label", "Toimintamalli")

  await clearAndType(page, "[name='project-outcomes.project-outcomes-1.description']", "Kuvaus")
  await clearAndType(page, "[name='project-outcomes.project-outcomes-1.address']", "Saatavuustiedot, www-osoite tms.")

  await clickElement(page, "label[for='radioButton-good-practices.radio.1']")
  await clearAndType(page, "[name='textArea-4']", "Lisätietoja")

  await uploadFile(page, "[name='namedAttachment-0']", dummyPdfPath)

  await submitVäliselvitys(page)
}

async function submitVäliselvitys(page: Page) {
  await page.waitForFunction(() => (document.querySelector("#topbar #form-controls button#submit") as HTMLInputElement).disabled === false)
  await clickElement(page, "#topbar #form-controls button#submit")
  await page.waitForFunction(() => (document.querySelector("#topbar #form-controls button#submit") as HTMLInputElement).textContent === "Väliselvitys lähetetty")
}

export async function downloadExcelExport(page: Page, avustushakuID: number) {
  await navigate(page, `/avustushaku/${avustushakuID}/`)

  // Hack around Puppeteer not being able to tell Puppeteer where to download files
  const url = `${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/export.xslx`
  const buffer = await downloadFile(page, url)
  return xlsx.read(buffer, {type: "buffer"})
}

// https://github.com/puppeteer/puppeteer/issues/299#issuecomment-569221074
async function downloadFile(page: Page, resource: string) {
  const data: any = await page.evaluate((resource, init) => {
    return window.fetch(resource, init)
      .then(resp => {
        if (!resp.ok)
          throw new Error(`Server responded with ${resp.status} ${resp.statusText}`)
        return resp.blob()
          .then( data => {
            const reader = new FileReader()
            return new Promise(resolve => {
              reader.addEventListener("loadend", () => resolve({
                url: reader.result,
                mime: resp.headers.get('Content-Type'),
              }))
              reader.readAsDataURL(data)
            })
          })
      })
  }, resource)
  return Buffer.from(data.url.split(",")[1], "base64")
}

export async function getHakemusIDFromHakemusTokenURLParameter(page: Page): Promise<number> {
  const token = await expectQueryParameter(page, "hakemus")
  const url = `${VIRKAILIJA_URL}/api/v2/external/hakemus/id/${token}`
  return await axios.get(url).then(r => r.data.id)
}

export async function fillAndSendHakemusAndReturnHakemusId(page: Page, avustushakuID: number, beforeSubmitFn?: () => void) {
  let hakemusID

  async function fn() {
    hakemusID = await getHakemusIDFromHakemusTokenURLParameter(page)

    if (beforeSubmitFn)
      await beforeSubmitFn()
  }

  await fillAndSendHakemus(page, avustushakuID, fn)

  expectToBeDefined(hakemusID)
  return parseInt(hakemusID)
}

export async function navigateToHakemus(page: Page, avustushakuID: number, hakemusID: number) {
  await navigate(page, `/avustushaku/${avustushakuID}/`)
  await Promise.all([
    page.waitForNavigation(),
    clickElement(page, `#hakemus-${hakemusID}`)
  ])
}

export async function acceptHakemus(page: Page, avustushakuID: number, hakemusID: number, beforeSubmitFn: () => {}) {
  await navigate(page, `/avustushaku/${avustushakuID}/`)
  await Promise.all([
    page.waitForNavigation(),
    clickElementWithText(page, "td", "Akaan kaupunki"),
  ])

  await clickElement(page, "#arviointi-tab label[for='set-arvio-status-plausible']")
  await clearAndType(page, "#budget-edit-project-budget .amount-column input", "100000")
  await clickElement(page, "#arviointi-tab label[for='set-arvio-status-accepted']")
  await waitForArvioSave(page, avustushakuID, hakemusID)
  await beforeSubmitFn()
  await resolveAvustushaku(page, avustushakuID)
}

export async function clickElementWithTestId(page: Page, testId: string) {
  await clickElement(page, `[data-test-id='${testId}']`)
}

export async function waitForElementWIthTestId(page: Page, testId: string): Promise<ElementHandle | null> {
  return await page.waitForSelector(`[data-test-id='${testId}']`, {visible: true, timeout: 5 * 1000})
}

export async function expectedResponseFromExternalAPIhakemuksetForAvustushaku(avustushakuID: number, hakemusID: number, valueForNutshellField: string) {
  return [{
    'project-name': "",
    'project-begin': null,
    'organization-name': "Akaan kaupunki",
    'grant-id': avustushakuID,
    partners: null,
    'costs-granted' : 100000,
    'user-last-name': null,
    'language': "fi",
    id: hakemusID,
    nutshell: valueForNutshellField,
    'user-first-name': null,
    'budget-granted': 100000,
    'project-end': null
  }]
}

export async function actualResponseFromExternalAPIhakemuksetForAvustushaku(avustushakuID: number) {
  const url = `${VIRKAILIJA_URL}/api/v2/external/avustushaku/${avustushakuID}/hakemukset`
  return await axios.get(url).then(r => r.data)
}

export async function createUniqueCode(page: Page) {
  const uniqueCode = (new Date()).getTime()
  await clearAndType(page, '[data-test-id=code-form__year', '2020')
  await clearAndType(page, '[data-test-id=code-form__code', `${uniqueCode}`)
  await clearAndType(page, '[data-test-id=code-form__name', `Test code ${uniqueCode}`)
  await clickElementWithTestId(page, 'code-form__add-button')
  await page.waitForSelector(`tr[data-test-id="${uniqueCode}"]`)
  return uniqueCode
}

export async function assertCodeIsVisible(page: Page, code: number, visibility: boolean) {
  const buttonId = visibility ? 'code-row__hide-button' : 'code-row__show-button'
  const selector = `tr[data-test-id='${code}'] [data-test-id=${buttonId}]`
  await page.waitForSelector(selector)
}

export async function clickCodeVisibilityButton(page: Page, code: number, visibility: boolean) {
  const buttonId = visibility ? 'code-row__show-button' : 'code-row__hide-button'
  const selector = `tr[data-test-id='${code}'] [data-test-id=${buttonId}]`
  await clickElement(page, selector)
}

export interface PaatosValues {
  status: 'accepted' | 'rejected' | 'accepted_with_changes'
}

export async function setCalendarDate(page: Page, jatkoaika: string) {
  return await setCalendarDateForSelector(page, jatkoaika, 'div.datepicker input')
}

export async function setCalendarDateForSelector(page: Page, date: string, selector: string) {
  // For whatever reason, sometimes when running tests locally the date is reset after after input, which disables the send button and breaks tests.
  while(await getElementAttribute(page, selector, 'value') !== date) {
    await clearAndType(page, selector, date)
  }
}

export async function navigateToSeurantaTab(page: Page, avustushakuID: number, hakemusID: number) {
  await navigate(page, `/avustushaku/${avustushakuID}/hakemus/${hakemusID}/seuranta/`)
  await page.waitForSelector('#set-allow-visibility-in-external-system', { visible: true })
}

export async function makePaatosForMuutoshakemusIfNotExists(page: Page, status: string, avustushakuID: number, hakemusID: number) {
  await navigate(page, `/avustushaku/${avustushakuID}/hakemus/${hakemusID}/`)
  await clickElement(page, 'span.muutoshakemus-tab')
  if (await countElements(page, '[data-test-id="muutoshakemus-paatos"]')) {
    return
  }

  await page.click(`label[for="${status}"]`)
  await selectVakioperusteluInFinnish(page)
  await page.click('[data-test-id="muutoshakemus-submit"]:not([disabled])')
  await page.waitForSelector('[data-test-id="muutoshakemus-paatos"]')
}

export async function selectVakioperusteluInFinnish(page: Page): Promise<void> {
  await clickElementWithText(page, 'a', 'Lisää vakioperustelu suomeksi')
}

export async function ratkaiseAvustushaku(page: Page) {
  const avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(page)
  await publishAvustushaku(page)
  await fillAndSendHakemus(page, avustushakuID)

  return await acceptAvustushaku(page, avustushakuID)
}

type AcceptedBudget = string | Budget

async function acceptBudget(page: Page, budget: AcceptedBudget) {
  if (typeof budget === 'string') {
    await clearAndType(page, "#budget-edit-project-budget .amount-column input", budget)
  } else {
    await clickElement(page, 'label[for="useDetailedCosts-true"]')
    await fillBudget(page, budget, 'virkailija')
  }
}

export async function acceptAvustushaku(page: Page, avustushakuID: number, budget: AcceptedBudget = "100000") {
  await closeAvustushakuByChangingEndDateToPast(page, avustushakuID)

  // Accept the hakemus
  await navigate(page, `/avustushaku/${avustushakuID}/`)
  await Promise.all([
    page.waitForNavigation(),
    clickElementWithText(page, "td", "Akaan kaupunki"),
  ])

  const hakemusID = await page.evaluate(() => window.location.pathname.match(/\/hakemus\/(\d+)\//)?.[1]).then(possibleHakemusID => {
    expectToBeDefined(possibleHakemusID)
    return parseInt(possibleHakemusID)
  })

  expectToBeDefined(hakemusID)
  console.log("Hakemus ID:", hakemusID)

  await clickElement(page, "#arviointi-tab label[for='set-arvio-status-plausible']")
  await acceptBudget(page, budget)
  await clickElement(page, "#arviointi-tab label[for='set-arvio-status-accepted']")
  await waitForArvioSave(page, avustushakuID, hakemusID)

  await resolveAvustushaku(page, avustushakuID)

  await selectValmistelijaForHakemus(page, avustushakuID, hakemusID, "_ valtionavustus")

  await sendPäätös(page, avustushakuID)
  const tapahtumaloki = await page.waitForSelector(".tapahtumaloki")
  const logEntryCount = await tapahtumaloki?.evaluate(e => e.querySelectorAll(".entry").length)
  expect(logEntryCount).toEqual(1)
  return { avustushakuID, hakemusID}
}

export function lastOrFail<T>(xs: ReadonlyArray<T>): T {
  if (xs.length === 0) throw Error("Can't get last element of empty list")
  return xs[xs.length - 1]
}
