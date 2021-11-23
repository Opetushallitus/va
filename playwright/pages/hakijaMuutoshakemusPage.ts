import {Page} from "playwright";
import {expect} from "@playwright/test"
import {
  getElementInnerText,
  getExistingBudgetTableCells,
} from "../utils/util";
import {
  getLinkToMuutoshakemusFromSentEmails,
} from "../utils/emails";
import {MuutoshakemusValues} from "../utils/types";
import {BudgetAmount} from "../utils/budget";

export class HakijaMuutoshakemusPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(hakemusID: number) {
    const linkToMuutoshakemus = await getLinkToMuutoshakemusFromSentEmails(hakemusID)
    await this.page.goto(linkToMuutoshakemus)
  }

  async fillJatkoaikaValues(muutoshakemus: MuutoshakemusValues) {
    if (!muutoshakemus.jatkoaika) throw new Error('Jatkoaika is required')

    await this.clickHaenKayttoajanPidennysta()
    await this.page.fill('#perustelut-kayttoajanPidennysPerustelut', muutoshakemus.jatkoaikaPerustelu)
    await this.page.fill('div.datepicker input', muutoshakemus.jatkoaika.format('DD.MM.YYYY'))
  }

  async clickHaenSisaltomuutosta() {
    await this.page.click('#checkbox-haenSisaltomuutosta')
  }

  async clickHaenKayttoajanPidennysta() {
    await this.page.click('#checkbox-haenKayttoajanPidennysta')
  }

  async fillSisaltomuutosPerustelut(perustelut: string) {
    await this.page.fill('#perustelut-sisaltomuutosPerustelut', perustelut)
  }

  async clickHaenMuutostaTaloudenKayttosuunnitelmaan() {
    await this.page.click('#checkbox-haenMuutostaTaloudenKayttosuunnitelmaan')
  }

  async fillTalousarvioValues(budget: Partial<BudgetAmount>, explanation?: string) {
    const keyValuePair = Object.entries(budget)
    for (const [key, value] of keyValuePair) {
      await this.page.fill(`input[name='talousarvio.${key}-costs-row'][type='number']`, value ?? '0')
    }
    if (explanation) {
      await this.page.fill('#perustelut-taloudenKayttosuunnitelmanPerustelut', explanation)
    }

  }

  async clickSendMuutoshakemus() {
    await this.page.click('#send-muutospyynto-button:has-text("Lähetä käsiteltäväksi")')
  }

  async expectMuutoshakemusToBeSubmittedSuccessfully(isApplication: boolean) {
    const notification = this.page.textContent('div[class="auto-hide success"]')

    // The text is different if we are actually applying for jatkoaika/budjettimuutos/sisältömuutos
    const notificationText = isApplication ? 'Muutoshakemus lähetetty' : 'Muutokset tallennettu'
    expect(notification).toBe(notificationText)
  }

  async getMuutoshakemusSisaltomuutosPerustelut() {
    return getElementInnerText(this.page, '[data-test-class="existing-muutoshakemus"] [data-test-id="sisaltomuutos-perustelut"]')
  }

  expectApprovedBudgetToBe(page: Page, budget: BudgetAmount): () => Promise<void> {
    return async function verifyBudget() {
      const budgetExpectedItems = [
        {description: 'Henkilöstömenot', amount: `${budget.personnel} €`},
        {description: 'Aineet, tarvikkeet ja tavarat', amount: `${budget.material} €`},
        {description: 'Laitehankinnat', amount: `${budget.equipment} €`},
        {description: 'Palvelut', amount: `${budget['service-purchase']} €`},
        {description: 'Vuokrat', amount: `${budget.rent} €`},
        {description: 'Matkamenot', amount: `${budget.steamship} €`},
        {description: 'Muut menot', amount: `${budget.other} €`}
      ]

      const budgetRows = await getExistingBudgetTableCells(page)
      expect(budgetRows).toEqual(budgetExpectedItems)
    }
  }

  async sendMuutoshakemus(isApplication: boolean, swedish?: boolean) {
    if (swedish) {
      await this.page.click('#send-muutospyynto-button')
      expect(this.page.textContent('div[class="auto-hide success"]')).toEqual('Ändringsansökan har skickats')
    } else {
      await this.clickSendMuutoshakemus()
      await this.expectMuutoshakemusToBeSubmittedSuccessfully(isApplication)
    }
  }
}
