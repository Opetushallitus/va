import { expect, Page } from '@playwright/test'
import SelvitysTab from './CommonSelvitysPage'

export const LoppuselvitysPage = (page: Page) => {
  const asiatarkastus = page.getByTestId('loppuselvitys-asiatarkastus')
  const taloustarkastus = page.getByTestId('loppuselvitys-taloustarkastus')
  const locators = {
    linkToForm: page.locator('a', { hasText: 'Linkki lomakkeelle' }),
    warning: page.locator('#selvitys-not-sent-warning'),
    asiatarkastettu: page.getByTestId('loppuselvitys-tarkastus').first(),
    taloustarkastettu: page.getByTestId('loppuselvitys-tarkastus').nth(1),
    asiatarkastus: {
      taydennyspyynto: asiatarkastus.getByText('Täydennyspyyntö'),
      accept: asiatarkastus.getByRole('button', { name: 'Hyväksy' }),
      confirmAcceptance: asiatarkastus.getByRole('button', {
        name: 'Vahvista hyväksyntä',
      }),
    },
    taloustarkastus: {
      taydennyspyynto: taloustarkastus.getByText('Täydennyspyyntö'),
      accept: taloustarkastus.getByRole('button', { name: 'Hyväksy' }),
      confirmAcceptance: page.getByRole('button', {
        name: 'Hyväksy ja lähetä viesti',
      }),
    },
  }

  async function ensureMuistutusViestiEmailRecipientsContain(recipients: string[]) {
    await page.getByRole('button', { name: 'Kirjoita' }).click()
    await Promise.all(
      recipients.map((recipent, i) => {
        expect(page.locator(`[data-test-id="muistutusviesti-receiver-${i}"]`)).toHaveValue(recipent)
      })
    )
  }

  async function getSelvitysFormUrl() {
    const formUrl = await locators.linkToForm.getAttribute('href')
    if (!formUrl) {
      throw Error(`loppuselvitys form url not found on ${page.url()}`)
    }
    return formUrl
  }
  async function sendLoppuselvitys(expectedAmount = 1) {
    await page.click('text="Lähetä loppuselvityspyynnöt"')
    await page.waitForSelector(`text="Lähetetty ${expectedAmount} viestiä"`)
  }

  async function asiatarkastaLoppuselvitys(_: string) {
    await expect(locators.asiatarkastettu).toBeHidden()
    await locators.asiatarkastus.accept.click()
    await locators.asiatarkastus.confirmAcceptance.click()
    await expect(locators.asiatarkastettu).toBeVisible()
    await expect(locators.asiatarkastettu).toContainText('Asiatarkastettu')
  }

  async function taloustarkastaLoppuselvitys() {
    await expect(locators.taloustarkastettu).toBeHidden()
    await expect(locators.taloustarkastus.confirmAcceptance).toBeHidden()
    await locators.taloustarkastus.accept.click()
    await locators.taloustarkastus.confirmAcceptance.click()
    await expect(locators.taloustarkastus.confirmAcceptance).toBeHidden()
    await expect(locators.taloustarkastettu).toBeVisible()
    await expect(locators.taloustarkastettu).toContainText('Hyväksytty')
  }

  return {
    locators,
    getSelvitysFormUrl,
    sendLoppuselvitys,
    asiatarkastaLoppuselvitys,
    taloustarkastaLoppuselvitys,
    ensureMuistutusViestiEmailRecipientsContain,
    ...SelvitysTab(page, 'loppu'),
  }
}
