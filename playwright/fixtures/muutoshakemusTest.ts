import {HakemustenArviointiPage} from "../pages/hakemustenArviointiPage";
import {createRandomHakuValues} from "../utils/random";
import {test} from "@playwright/test";
import {KoodienhallintaPage} from "../pages/koodienHallintaPage";
import {HakujenHallintaPage} from "../pages/hakujenHallintaPage";
import {HakijaAvustusHakuPage} from "../pages/hakijaAvustusHakuPage";
import {answers} from "../utils/constants";

export interface MuutoshakemusFixtures {
  avustushakuID: number
  hakemusID: number
  haku: {
    registerNumber: string
    avustushakuName: string
  }
  answers
}

/**
 * Creates a muutoshakuenabled hakemus with käyttöaika and sisältö, but no budjetti
 */
export const muutoshakemusTest = test.extend<MuutoshakemusFixtures>({
  answers,
  haku: async ({}, use) => {
    const randomHakuValues = createRandomHakuValues()
    await use(randomHakuValues)
  },
  avustushakuID: async ({page, haku}, use) => {
    const koodienHallintaPage = new KoodienhallintaPage(page)
    const codes = await koodienHallintaPage.createRandomCodeValues()
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    const avustushakuID = await hakujenHallintaPage.createMuutoshakemusEnabledHaku(haku.registerNumber, haku.avustushakuName, codes)
    await use(avustushakuID)
  },
  hakemusID: async ({avustushakuID, page}, use) => {
    const hakijaAvustusHakuPage = new HakijaAvustusHakuPage(page)
    await hakijaAvustusHakuPage.navigate(avustushakuID)
    await hakijaAvustusHakuPage.fillAndSendMuutoshakemusEnabledHakemus(avustushakuID, answers)
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.closeAvustushakuByChangingEndDateToPast()
    const hakemustenArviointiPage = new HakemustenArviointiPage(page)
    await hakemustenArviointiPage.navigate(avustushakuID)
    const hakemusID = await hakemustenArviointiPage.acceptAvustushaku(avustushakuID, "100000", "Ammatillinen koulutus")
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.resolveAvustushaku()
    await hakemustenArviointiPage.navigate(avustushakuID)
    await hakemustenArviointiPage.selectValmistelijaForHakemus(avustushakuID, hakemusID, "_ valtionavustus")
    await hakujenHallintaPage.navigateToPaatos(avustushakuID)
    await hakujenHallintaPage.sendPaatos(avustushakuID)
    await use(hakemusID)
  }
})
