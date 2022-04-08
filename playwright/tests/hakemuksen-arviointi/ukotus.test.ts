import { expect, test } from '@playwright/test';

import { muutoshakemusTest } from '../../fixtures/muutoshakemusTest';
import { HakemustenArviointiPage } from '../../pages/hakemustenArviointiPage'
import { HakujenHallintaPage } from '../../pages/hakujenHallintaPage'

test.setTimeout(180000)

muutoshakemusTest.use({
  hakuProps: ({hakuProps}, use) => use({
    ...hakuProps,
    selectionCriteria: [
      'Onko hyvin tehty?',
      'Onko mittää järkee?',
    ],
  })
})

muutoshakemusTest('Valmistelija as an arvostelija', async ({ page, avustushakuID, submittedHakemus }) => {
  expect(submittedHakemus).toBeDefined()

  const hakemustenArviointiPage = new HakemustenArviointiPage(page)
  const hakujenHallintaPage = new HakujenHallintaPage(page)

  await hakujenHallintaPage.navigate(avustushakuID)
  await hakujenHallintaPage.closeAvustushakuByChangingEndDateToPast()
  const hakemusId = await hakemustenArviointiPage.navigateToLatestHakemusArviointi(avustushakuID)
  await hakemustenArviointiPage.navigate(avustushakuID)
  await hakemustenArviointiPage.selectValmistelijaForHakemus(hakemusId, '_ valtionavustus')

  await test.step('can be set as arvioija in addition to valmistelija', async () => {
    await hakemustenArviointiPage.selectArvioijaForHakemus(hakemusId, '_ valtionavustus')

    await hakemustenArviointiPage.navigate(avustushakuID)
    await hakemustenArviointiPage.openUkotusModal(hakemusId)
    await page.locator(`[aria-label="Poista _ valtionavustus arvioijan roolista"]`).waitFor()
    await page.locator(`[aria-label="Poista _ valtionavustus valmistelijan roolista"]`).waitFor()
    await hakemustenArviointiPage.closeUkotusModal()
  })

  await test.step('can set arvio', async () => {
    await hakemustenArviointiPage.setSelectionCriteriaStars(1, 4)
    await hakemustenArviointiPage.setSelectionCriteriaStars(2, 4)
    await page.reload()
    const hakemusScore = await hakemustenArviointiPage.getHakemusScore(hakemusId)
    expect(hakemusScore).toEqual('4')
  })

  await test.step('can still do things a valmistelija can do', async () => {
    await hakemustenArviointiPage.navigateToLatestHakemusArviointi(avustushakuID)
    await expect(page.locator('[data-test-id="virkailija-edit-hakemus"]')).toBeEnabled()
    await expect(page.locator('[data-test-id="request-change-button"]')).toBeEnabled()

    await page.click('label[for="useDetailedCosts-true"]')
    await page.fill('[id="budget-edit-personnel-costs-row.amount"]', '100000')

    await page.click('label[for="set-arvio-status-accepted"]')

    await page.reload()
    await expect(page.locator('td.status-column')).toContainText('Hyväksytty')
    await expect(page.locator('td.granted-sum-column span.money')).toContainText('99 999')
  })
})
