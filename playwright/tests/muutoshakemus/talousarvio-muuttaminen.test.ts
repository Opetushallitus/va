import { expect, Page, test } from "@playwright/test";
import {
  BudjettimuutoshakemusFixtures,
  budjettimuutoshakemusTest,
} from "../../fixtures/budjettimuutoshakemusTest";
import { HakijaMuutoshakemusPage } from "../../pages/hakijaMuutoshakemusPage";
import {
  getAcceptedPäätösEmails,
  getLinkToMuutoshakemusFromSentEmails,
} from "../../utils/emails";
import { Budget, BudgetAmount } from "../../utils/budget";
import { HakemustenArviointiPage } from "../../pages/hakemustenArviointiPage";
import moment from "moment/moment";
import { HakijaMuutoshakemusPaatosPage } from "../../pages/hakijaMuutoshakemusPaatosPage";

const testBudget: Budget = {
  amount: {
    personnel: "300",
    material: "420",
    equipment: "1337",
    "service-purchase": "5318008",
    rent: "69",
    steamship: "0",
    other: "9000",
  },
  description: {
    personnel: "One euro for each of our Spartan workers",
    material: "Generic materials for innovation",
    equipment: "We need elite level equipment",
    "service-purchase": "We need some afterwork fun",
    rent: "More afterwork fun",
    steamship: "No need for steamship, we have our own yacht",
    other: "For power ups",
  },
  selfFinancing: "1",
};

const lumpSumTest =
  budjettimuutoshakemusTest.extend<BudjettimuutoshakemusFixtures>({
    budget: testBudget,
    acceptedBudget: "100000",
  });

lumpSumTest(
  "virkailija accepts with different budjet",
  async ({ acceptedHakemus: { hakemusID }, page, avustushakuID }) => {
    const hakijaMuutoshakemusPage = new HakijaMuutoshakemusPage(page);
    await test.step(
      "muutoshakemus page does not allow hakija to change menoluokat",
      async () => {
        const link = await getLinkToMuutoshakemusFromSentEmails(hakemusID);
        await hakijaMuutoshakemusPage.navigateWithLink(link);
        const locators = hakijaMuutoshakemusPage.locators();
        await expect(locators.haenKayttoajanPidennysta).toBeEnabled();
        await expect(
          locators.haenMuutostaTaloudenKayttosuunnitelmaan
        ).toBeHidden();
      }
    );
    await test.step("seuranta tab shows the accepted lump sum", async () => {
      const hakemustenArviointiPage = new HakemustenArviointiPage(page);
      await hakemustenArviointiPage.navigateToLatestMuutoshakemus(
        avustushakuID,
        hakemusID
      );
      await hakemustenArviointiPage.tabs().seuranta.click();
      const seuranta = hakemustenArviointiPage.seurantaTabLocators();
      await expect(seuranta.grantedTotal).toHaveText("100000");
      await expect(seuranta.amountTotal).toHaveText("100000");
    });
  }
);

const muutosTest =
  budjettimuutoshakemusTest.extend<BudjettimuutoshakemusFixtures>({
    budget: testBudget,
  });

muutosTest(
  "changing budget multiple times",
  async ({ page, acceptedHakemus: { hakemusID }, budget, avustushakuID }) => {
    const hakijaMuutoshakemusPage = new HakijaMuutoshakemusPage(page);
    const muutoshakemus1Budget: BudgetAmount = {
      personnel: "301",
      material: "421",
      equipment: "1338",
      "service-purchase": "5318007",
      rent: "68",
      steamship: "0",
      other: "8999",
    };
    const jatkoaika = {
      jatkoaika: moment(new Date()).add(1, "days").locale("fi"),
      jatkoaikaPerustelu: "TODO Perustele",
    };
    await test.step("submit muutoshakemus #1", async () => {
      await hakijaMuutoshakemusPage.navigate(hakemusID);
      await hakijaMuutoshakemusPage.fillJatkoaikaValues(jatkoaika);
      await hakijaMuutoshakemusPage.clickHaenMuutostaTaloudenKayttosuunnitelmaan();
      await hakijaMuutoshakemusPage.fillTalousarvioValues(
        muutoshakemus1Budget,
        "uus budu"
      );
      await hakijaMuutoshakemusPage.sendMuutoshakemus(true);
    });
    await test.step("validate submitted values after sending it", async () => {
      const hakijaMuutoshakemusPaatosPage = new HakijaMuutoshakemusPaatosPage(
        page
      );
      const currentBudget = await getCurrentBudget(
        hakijaMuutoshakemusPaatosPage.page
      );
      expect(currentBudget).toMatchObject(budget.amount);
      const muutoshakemusBudget = await getMuutoshakemusBudget(
        hakijaMuutoshakemusPaatosPage.page
      );
      expect(muutoshakemusBudget).toMatchObject(muutoshakemus1Budget);
      const locators = hakijaMuutoshakemusPaatosPage.locators();
      await expect(locators.reasoning).toHaveText("Hakijan perustelut");
      await expect(locators.currentBudgetTitle).toHaveText(
        "Haettu uusi budjetti"
      );
      await expect(locators.oldBudgetTitle).toHaveText(
        "Voimassaoleva budjetti"
      );
      await expect(locators.talousarvioPerustelut).toHaveText("uus budu");
      await expect(locators.jatkoaika).toHaveText(
        jatkoaika.jatkoaika.format("DD.MM.YYYY")
      );
    });
    const hakemustenArviointiPage = new HakemustenArviointiPage(page);
    const acceptedBudget: BudgetAmount = {
      personnel: "1301",
      material: "1421",
      equipment: "2338",
      "service-purchase": "5312007",
      rent: "1068",
      steamship: "1000",
      other: "9999",
    };
    await test.step(
      "virkailija seuranta tab shows the granted budget as accepted by OPH",
      async () => {
        await hakemustenArviointiPage.navigateToLatestMuutoshakemus(
          avustushakuID,
          hakemusID
        );
        await hakemustenArviointiPage.tabs().seuranta.click();
        for (const key of Object.keys(budget.description)) {
          const budgetAmount = budget.amount[key as keyof BudgetAmount];
          await expect(
            page.locator(
              `[data-test-id=${key}-costs-row] td.granted-amount-column`
            )
          ).toHaveText(budgetAmount);
          await expect(
            page.locator(`[data-test-id=${key}-costs-row] td.amount-column`)
          ).toHaveText(budgetAmount);
        }
        const seurantaLocators = hakemustenArviointiPage.seurantaTabLocators();
        await expect(seurantaLocators.grantedTotal).toHaveText("5329134");
        await expect(seurantaLocators.amountTotal).toHaveText("5329134");
      }
    );
    await test.step("accept muutoshakemus #1 with changes", async () => {
      await hakemustenArviointiPage.tabs().muutoshakemus.click();
      await hakemustenArviointiPage.setMuutoshakemusBudgetDecision(
        "accepted_with_changes",
        acceptedBudget
      );
      await hakemustenArviointiPage.setMuutoshakemusJatkoaikaDecision(
        "accepted_with_changes",
        "01.01.2099"
      );
      await hakemustenArviointiPage.selectVakioperusteluInFinnish();
      await hakemustenArviointiPage.saveMuutoshakemus();
    });
    await test.step(
      "virkailija seuranta tab shows the accepted muutoshakemus budget as accepted by OPH",
      async () => {
        await hakemustenArviointiPage.tabs().seuranta.click();
        for (const key of Object.keys(budget.description)) {
          const grantedSelector = `[data-test-id=${key}-costs-row] td.granted-amount-column`;
          await expect(
            hakemustenArviointiPage.page.locator(grantedSelector)
          ).toHaveText(budget.amount[key as keyof BudgetAmount]);
          await expect(
            hakemustenArviointiPage.page.locator(
              `[data-test-id=${key}-costs-row] td.amount-column`
            )
          ).toHaveText(acceptedBudget[key as keyof BudgetAmount]);
        }
        await expect(
          hakemustenArviointiPage.seurantaTabLocators().grantedTotal
        ).toHaveText("5329134");
        await expect(
          hakemustenArviointiPage.seurantaTabLocators().amountTotal
        ).toHaveText("5329134");
      }
    );
    await test.step(
      "newest approved budget is prefilled on the new muutoshakemus form",
      async () => {
        await hakijaMuutoshakemusPage.navigate(hakemusID);
        await hakijaMuutoshakemusPage.clickHaenMuutostaTaloudenKayttosuunnitelmaan();
        const expectedBudgetInputs = [
          { name: "talousarvio.personnel-costs-row", amount: 1301 },
          { name: "talousarvio.material-costs-row", amount: 1421 },
          { name: "talousarvio.equipment-costs-row", amount: 2338 },
          { name: "talousarvio.service-purchase-costs-row", amount: 5312007 },
          { name: "talousarvio.rent-costs-row", amount: 1068 },
          { name: "talousarvio.steamship-costs-row", amount: 1000 },
          { name: "talousarvio.other-costs-row", amount: 9999 },
        ];
        const rows = await getMenoInputRows(page);
        expect(sortedInputFields(rows)).toEqual(
          sortedInputFields(expectedBudgetInputs)
        );
      }
    );
    await test.step("also has correct titles", async () => {
      const hakijaMuutoshakemusPaatosPage = new HakijaMuutoshakemusPaatosPage(
        page
      );
      await expect(
        hakijaMuutoshakemusPaatosPage.locators().oldBudgetTitle
      ).toHaveText("Vanha budjetti");
      await expect(
        hakijaMuutoshakemusPaatosPage.locators().currentBudgetTitle
      ).toHaveText("Hyväksytty uusi budjetti");
    });
    const muutoshakemus2Budget = {
      ...muutoshakemus1Budget,
      ...{ personnel: "302", other: "8998" },
    };
    const muutoshakemus2Perustelut =
      "Fattan fossiilit taas sniiduili ja oon akuutis likviditettivajees, pydeeks vippaa vähän hilui";
    await test.step("submit muutoshakemus #2 ", async () => {
      await hakijaMuutoshakemusPage.navigate(hakemusID);
      await hakijaMuutoshakemusPage.clickHaenMuutostaTaloudenKayttosuunnitelmaan();
      await hakijaMuutoshakemusPage.fillTalousarvioValues(
        muutoshakemus2Budget,
        muutoshakemus2Perustelut
      );
      await hakijaMuutoshakemusPage.sendMuutoshakemus(true);
    });
    await test.step("paatospage shows correct data", async () => {
      const hakijaMuutoshakemusPaatosPage = new HakijaMuutoshakemusPaatosPage(
        page
      );
      const currentBudget = await getCurrentBudget(
        hakijaMuutoshakemusPaatosPage.page
      );
      expect(currentBudget).toMatchObject(acceptedBudget);
      const muutoshakemusBudget = await getMuutoshakemusBudget(
        hakijaMuutoshakemusPaatosPage.page
      );
      expect(muutoshakemusBudget).toMatchObject(muutoshakemus2Budget);
      await expect(
        hakijaMuutoshakemusPaatosPage.locators().currentTalousarvioPerustelut
      ).toHaveText(muutoshakemus2Perustelut);
      expect(
        await hakijaMuutoshakemusPaatosPage
          .locators()
          .talousarvio.allTextContents()
      ).toHaveLength(2);
      expect(
        await hakijaMuutoshakemusPaatosPage
          .locators()
          .budgetInput.allTextContents()
      ).toHaveLength(0);
    });
    await test.step("virkailija views handled muutoshakemus #1", async () => {
      await hakemustenArviointiPage.navigateToLatestMuutoshakemus(
        avustushakuID,
        hakemusID
      );
      await hakemustenArviointiPage.page
        .locator('[data-test-id="muutoshakemus-tab-1"]')
        .click();
      await expect(
        hakemustenArviointiPage.muutoshakemusTabLocators().oldBudgetTitle
      ).toHaveText("Vanha budjetti");
      await expect(
        hakemustenArviointiPage.muutoshakemusTabLocators().currentBudgetTitle
      ).toHaveText("Hyväksytty uusi budjetti");
    });
    await test.step(
      "unapproved muutoshakemus #2 has current and applied budget",
      async () => {
        await hakemustenArviointiPage.page
          .locator('[data-test-id="muutoshakemus-tab-0"]')
          .click();
        await expect(
          hakemustenArviointiPage.muutoshakemusTabLocators().oldBudgetTitle
        ).toHaveText("Voimassaoleva budjetti");
        await expect(
          hakemustenArviointiPage.muutoshakemusTabLocators().currentBudgetTitle
        ).toHaveText("Haettu uusi budjetti");
      }
    );
    await test.step("reject muutoshakemus #2", async () => {
      await hakemustenArviointiPage.setMuutoshakemusBudgetDecision("rejected");
      await hakemustenArviointiPage.selectVakioperusteluInFinnish();
      await hakemustenArviointiPage.saveMuutoshakemus();
      await expect(
        hakemustenArviointiPage.muutoshakemusTabLocators().oldBudgetTitle
      ).toHaveText("Voimassaoleva budjetti");
    });
    await test.step(
      "prefilled budget for next muutoshakemus is still the one accepted",
      async () => {
        await hakijaMuutoshakemusPage.navigate(hakemusID);
        await hakijaMuutoshakemusPage.clickHaenMuutostaTaloudenKayttosuunnitelmaan();
        const expectedBudgetInputs = [
          { name: "talousarvio.personnel-costs-row", amount: 1301 },
          { name: "talousarvio.material-costs-row", amount: 1421 },
          { name: "talousarvio.equipment-costs-row", amount: 2338 },
          { name: "talousarvio.service-purchase-costs-row", amount: 5312007 },
          { name: "talousarvio.rent-costs-row", amount: 1068 },
          { name: "talousarvio.steamship-costs-row", amount: 1000 },
          { name: "talousarvio.other-costs-row", amount: 9999 },
        ];
        const rows = await getMenoInputRows(page);
        expect(sortedInputFields(rows)).toEqual(
          sortedInputFields(expectedBudgetInputs)
        );
      }
    );
  }
);

budjettimuutoshakemusTest(
  "filling muutoshakemus budget",
  async ({ page, acceptedHakemus: { hakemusID } }) => {
    await test.step("email has correct text", async () => {
      const emails = await getAcceptedPäätösEmails(hakemusID);
      expect(emails).toHaveLength(1);
      expect(emails[0].formatted).toContain(
        "Pääsette tekemään muutoshakemuksen sekä muuttamaan yhteyshenkilöä ja hänen yhteystietojaan koko hankekauden ajan tästä linkistä"
      );
    });
    const hakijaMuutoshakemusPage = new HakijaMuutoshakemusPage(page);
    await hakijaMuutoshakemusPage.navigate(hakemusID);
    await test.step("has prefilled menoluokat", async () => {
      await hakijaMuutoshakemusPage.clickHaenMuutostaTaloudenKayttosuunnitelmaan();
      const expectedBudgetInputs = [
        { name: "talousarvio.personnel-costs-row", amount: 200000 },
        { name: "talousarvio.material-costs-row", amount: 3000 },
        { name: "talousarvio.equipment-costs-row", amount: 10000 },
        { name: "talousarvio.service-purchase-costs-row", amount: 100 },
        { name: "talousarvio.rent-costs-row", amount: 161616 },
        { name: "talousarvio.steamship-costs-row", amount: 100 },
        { name: "talousarvio.other-costs-row", amount: 100000 },
      ];
      const rows = await getMenoInputRows(page);
      expect(sortedInputFields(expectedBudgetInputs)).toEqual(
        sortedInputFields(rows)
      );
    });
    const locators = hakijaMuutoshakemusPage.locators();
    const { budget } = locators;
    await test.step("yhteissumma changes when changing value", async () => {
      await expect(budget.originalSum).toHaveText("474816 €");
      await expect(budget.currentSum).toHaveText("474816");
      await budget.input.personnelCosts.fill("200001");
      await expect(budget.originalSum).toHaveText("474816 €");
      await expect(budget.currentSum).toHaveText("474817");
      await budget.input.personnelCosts.fill("200000");
      await expect(budget.originalSum).toHaveText("474816 €");
      await expect(budget.currentSum).toHaveText("474816");
    });
    await test.step("require perustelut", async () => {
      await expect(locators.sendMuutospyyntoButton).toBeDisabled();
      await expect(
        budget.input.errors.taloudenKayttosuunnitelmanPerustelut
      ).toHaveText("Pakollinen kenttä");
      await budget.input.taloudenKayttosuunnitelmanPerustelut.fill("perustelu");
      await expect(locators.sendMuutospyyntoButton).toBeEnabled();
      await expect(
        budget.input.errors.taloudenKayttosuunnitelmanPerustelut
      ).toHaveText("");
    });
    await test.step("require current sum to match original sum", async () => {
      await expect(budget.currentSumError).toBeHidden();
      await budget.input.equipmentCosts.fill("9999");
      await expect(locators.sendMuutospyyntoButton).toBeDisabled();
      await expect(budget.currentSumError).toHaveText(
        "Loppusumman on oltava 474816"
      );
      await budget.input.materialCosts.fill("3001");
      await expect(locators.sendMuutospyyntoButton).toBeEnabled();
      await expect(budget.currentSumError).toBeHidden();
    });
  }
);

const getHakemusBudget = async (page: Page, selector: string) => {
  const values = await page
    .locator('[data-test-state="new"] [data-test-id="meno-input-row"]')
    .evaluateAll(
      (rows, s) =>
        rows.map((elem) => ({
          name:
            elem.getAttribute("data-test-type")?.replace("-costs-row", "") ||
            "",
          amount: elem.querySelector(s)?.textContent?.replace(" €", "") || "",
        })),
      selector
    );
  return values.reduce<Record<string, string>>((acc, pair) => {
    acc[pair.name] = pair.amount;
    return acc;
  }, {});
};

const getCurrentBudget = (page: Page) =>
  getHakemusBudget(page, '[data-test-id="current-value"]');
const getMuutoshakemusBudget = (page: Page) =>
  getHakemusBudget(page, '[data-test-id="muutoshakemus-value"]');

const sortedInputFields = (budgetList: { name: string; amount: number }[]) => {
  return [...budgetList].sort((a, b) => (a.name < b.name ? 1 : -1));
};

const getMenoInputRows = (page: Page) =>
  page
    .locator("[data-test-id=talousarvio-form] [data-test-id=meno-input]")
    .evaluateAll((elements) =>
      elements.map((elem) => ({
        name: elem.querySelector("input")?.getAttribute("name") || "",
        amount: parseInt(
          elem.querySelector("input")?.getAttribute("value") || ""
        ),
      }))
    );