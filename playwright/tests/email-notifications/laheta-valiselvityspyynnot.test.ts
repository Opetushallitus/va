import { test, expect, Page } from '@playwright/test'
import moment from 'moment'

import { VIRKAILIJA_URL } from '../../utils/constants'
import { väliselvitysTest } from '../../fixtures/väliselvitysTest'
import { HakujenHallintaPage } from '../../pages/hakujenHallintaPage'
import {HakemustenArviointiPage} from "../../pages/hakemustenArviointiPage";
import { getLahetaValiselvityspyynnotEmails } from '../../utils/emails'
import { expectToBeDefined } from '../../utils/util'


väliselvitysTest('Väliselvityspyyntö can be previewed', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(avustushakuID)

  const hakujenHallintaPage = new HakujenHallintaPage(page)
  const tab = await hakujenHallintaPage.switchToValiselvitysTab()

  await test.step('in finnish', async () => {
    await page.bringToFront()
    const previewPage = await tab.openFormPreviewFi()

    expect(await previewPage.textContent('h1')).toEqual('Väliselvitys')
    expect(await previewPage.textContent('[id="financing-plan"] h2')).toEqual('Talousarvio')
  })

  await test.step('in swedish', async () => {
    await page.bringToFront()
    const previewPage = await tab.openFormPreviewSv()

    expect(await previewPage.textContent('h1')).toEqual('Mellanredovisning')
    expect(await previewPage.textContent('[id="financing-plan"] h2')).toEqual('Projektets budget')
  })
})

väliselvitysTest('Lähetä väliselvityspyynnot notifications are not sent if väliselvitys deadline is not set', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(acceptedHakemus)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter).toEqual(emailsBefore)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are not sent if valiselvitys deadline is more than 6 months in the future', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(acceptedHakemus)
  const valiselvitysdate = moment().add(7, 'months').format('DD.MM.YYYY')

  await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter).toEqual(emailsBefore)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are not sent if valiselvitys deadline is in the past', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(acceptedHakemus)
  const valiselvitysdate = moment().subtract(1, 'day').format('DD.MM.YYYY')

  await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter).toEqual(emailsBefore)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are send 6 months before valiselvitys deadline', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(acceptedHakemus)
  const valiselvitysdate = moment().add(6, 'months').format('DD.MM.YYYY')
  await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter.length).toBeGreaterThan(emailsBefore.length)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are send after paatos has been send', async ({closedAvustushaku, avustushakuID, answers, page, ukotettuValmistelija}) => {
  expectToBeDefined(closedAvustushaku)

  await test.step('ensure notifications are not send before paatos has been send', async  () => {
    const valiselvitysdate = moment().add(5, 'months').format('DD.MM.YYYY')
    await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

    const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
    await sendLahetaValiselvityspyynnotNotifications(page)

    const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
    expect(emailsAfter).toEqual(emailsBefore)
  })

  await test.step('send paatos', async () => {
    const hakemustenArviointiPage = new HakemustenArviointiPage(page)
    await hakemustenArviointiPage.navigate(avustushakuID)
    const hakemusID = await hakemustenArviointiPage.acceptAvustushaku(avustushakuID, answers.projectName)

    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.resolveAvustushaku()

    await hakemustenArviointiPage.navigate(avustushakuID)
    await hakemustenArviointiPage.selectValmistelijaForHakemus(avustushakuID, hakemusID, ukotettuValmistelija)

    await hakujenHallintaPage.navigateToPaatos(avustushakuID)
    await hakujenHallintaPage.sendPaatos(avustushakuID)
  })

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter.length).toBeGreaterThan(emailsBefore.length)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are not sent if väliselvityspyyntö has been sent', async ({page, avustushakuID, väliselvityspyyntöSent}) => {
  expectToBeDefined(väliselvityspyyntöSent)

  const valiselvitysdate = moment().add(5, 'months').format('DD.MM.YYYY')
  await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)

  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter).toEqual(emailsBefore)
})

väliselvitysTest('Lähetä väliselvityspyynnöt notifications are sent until väliselvityspyynnöt have been sent', async ({page, avustushakuID, acceptedHakemus}) => {
  expectToBeDefined(acceptedHakemus)
  const valiselvitysdate = moment().add(6, 'months').format('DD.MM.YYYY')
  await setValiselvitysDate(page, avustushakuID, valiselvitysdate)

  const emailsBefore = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter.length).toBeGreaterThan(emailsBefore.length)

  const emailsBefore2 = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter2 = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter2.length).toBeGreaterThan(emailsBefore2.length)

  await page.goto(`${VIRKAILIJA_URL}/admin/valiselvitys/?avustushaku=${avustushakuID}`)
  await Promise.all([
    page.waitForResponse(`${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/selvitys/valiselvitys/send-notification`),
    page.click('[data-test-id="send-valiselvitys"]'),
  ])

  const emailsBefore3 = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  await sendLahetaValiselvityspyynnotNotifications(page)

  const emailsAfter3 = await getLahetaValiselvityspyynnotEmails(avustushakuID)
  expect(emailsAfter3).toEqual(emailsBefore3)
})

const sendLahetaValiselvityspyynnotNotifications = (page: Page) =>
  page.request.post(`${VIRKAILIJA_URL}/api/test/send-laheta-valiselvityspyynnot-notifications`, { failOnStatusCode: true })

async function setValiselvitysDate(page: Page, avustushakuID: number, value: string) {
  const hakujenHallinta = new HakujenHallintaPage(page)
  await hakujenHallinta.navigateToPaatos(avustushakuID)
  await hakujenHallinta.setValiselvitysDate(value)
  await hakujenHallinta.waitForSave()
}
