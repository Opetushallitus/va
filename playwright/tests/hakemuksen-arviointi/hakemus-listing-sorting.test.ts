import { expect } from "@playwright/test";
import { budjettimuutoshakemusTest } from "../../fixtures/budjettimuutoshakemusTest";
import { HakemustenArviointiPage } from "../../pages/hakemustenArviointiPage";
import { expectToBeDefined } from "../../utils/util";
import { HakijaAvustusHakuPage } from "../../pages/hakijaAvustusHakuPage";
import { HakujenHallintaPage } from "../../pages/hakujenHallintaPage";

interface ArviointiUiFilteringFixtures {
  hakemustenArviointiPage: HakemustenArviointiPage;
}

const budget2 = {
  amount: {
    personnel: "1000",
    material: "1000",
    equipment: "1000",
    "service-purchase": "1000",
    rent: "1000",
    steamship: "1000",
    other: "1000",
  },
  description: {
    personnel: "a",
    material: "b",
    equipment: "c",
    "service-purchase": "d",
    rent: "e",
    steamship: "f",
    other: "g",
  },
  selfFinancing: "1",
};

const budget3 = {
  amount: {
    personnel: "500",
    material: "500",
    equipment: "500",
    "service-purchase": "500",
    rent: "500",
    steamship: "500",
    other: "500",
  },
  description: {
    personnel: "a",
    material: "b",
    equipment: "c",
    "service-purchase": "d",
    rent: "e",
    steamship: "f",
    other: "g",
  },
  selfFinancing: "1",
};

const test = budjettimuutoshakemusTest.extend<ArviointiUiFilteringFixtures>({
  hakemustenArviointiPage: async (
    { submittedHakemus, page, avustushakuID, answers },
    use
  ) => {
    expectToBeDefined(submittedHakemus);

    const hakijaAvustusHakuPage = new HakijaAvustusHakuPage(page);
    await hakijaAvustusHakuPage.navigate(avustushakuID, answers.lang);
    const answers2 = {
      ...answers,
      organization: "Cekaan kaupunki",
      projectName: "Mudassa kylpijät Ky Ay Oy",
      contactPersonEmail: "erkki2.esimerkki@example.com",
    };
    await hakijaAvustusHakuPage.fillBudjettimuutoshakemusEnabledHakemus(
      avustushakuID,
      answers2,
      budget2
    );
    await hakijaAvustusHakuPage.submitApplication();

    await hakijaAvustusHakuPage.navigate(avustushakuID, answers.lang);
    const answers3 = {
      ...answers,
      organization: "Bekaan kaupunki",
      projectName: "Töissä kylpijät Ky Ay Oy",
      contactPersonEmail: "erkki3.esimerkki@example.com",
    };
    await hakijaAvustusHakuPage.fillBudjettimuutoshakemusEnabledHakemus(
      avustushakuID,
      answers3,
      budget3
    );
    await hakijaAvustusHakuPage.submitApplication();

    const hakujenHallintaPage = new HakujenHallintaPage(page);
    await hakujenHallintaPage.navigate(avustushakuID);
    await hakujenHallintaPage.closeAvustushakuByChangingEndDateToPast();

    const hakemustenArviointiPage = new HakemustenArviointiPage(page);
    await hakemustenArviointiPage.navigateToHakemus(
      avustushakuID,
      answers.projectName
    );
    await hakemustenArviointiPage.acceptHakemus("7000");

    await hakemustenArviointiPage.navigateToHakemus(
      avustushakuID,
      answers2.projectName
    );
    await hakemustenArviointiPage.acceptHakemus("3000");

    await hakemustenArviointiPage.navigateToHakemus(
      avustushakuID,
      answers3.projectName
    );
    await hakemustenArviointiPage.rejectHakemus();

    await use(hakemustenArviointiPage);
  },
});

test("hakemus list sorting when avustushaku is not resolved", async ({
  hakemustenArviointiPage,
  hakuProps: { registerNumber },
  avustushakuID,
}) => {
  await hakemustenArviointiPage.navigate(avustushakuID);
  await hakemustenArviointiPage.page.click(
    '[aria-label="Poista hakemuksen tila rajaukset"]'
  );
  await expect(hakemustenArviointiPage.hakemusListing).toContainText(
    "3/3 hakemusta"
  );

  await test.step("can be sorted by organization", async () => {
    await hakemustenArviointiPage.sortBy("organization");
    const descElems = hakemustenArviointiPage.page.locator(
      '[class="organization-cell"]'
    );
    const descTexts = await descElems.allInnerTexts();
    expect(descTexts).toEqual([
      "Cekaan kaupunki",
      "Bekaan kaupunki",
      "Akaan kaupunki",
    ]);

    await hakemustenArviointiPage.sortBy("organization");
    const ascElems = hakemustenArviointiPage.page.locator(
      '[class="organization-cell"]'
    );
    const ascTexts = await ascElems.allInnerTexts();
    expect(ascTexts).toEqual([
      "Akaan kaupunki",
      "Bekaan kaupunki",
      "Cekaan kaupunki",
    ]);
  });

  await test.step("can be sorted by register number", async () => {
    await hakemustenArviointiPage.sortBy("registerNumber");
    const descElems =
      hakemustenArviointiPage.page.locator(".project-name-cell");
    const descTexts = await descElems.allInnerTexts();
    expect(descTexts).toEqual([
      `3/${registerNumber}Töissä kylpijät Ky Ay Oy`,
      `2/${registerNumber}Mudassa kylpijät Ky Ay Oy`,
      `1/${registerNumber}Rahassa kylpijät Ky Ay Oy`,
    ]);

    await hakemustenArviointiPage.sortBy("registerNumber");
    const ascElems = hakemustenArviointiPage.page.locator(".project-name-cell");
    const ascTexts = await ascElems.allInnerTexts();
    expect(ascTexts).toEqual([
      `1/${registerNumber}Rahassa kylpijät Ky Ay Oy`,
      `2/${registerNumber}Mudassa kylpijät Ky Ay Oy`,
      `3/${registerNumber}Töissä kylpijät Ky Ay Oy`,
    ]);
  });

  await test.step("can be sorted by hakemus state", async () => {
    await hakemustenArviointiPage.sortBy("hakemus");
    const descElems = hakemustenArviointiPage.page.locator(
      ".hakemus-status-cell"
    );
    const descTexts = await descElems.allInnerTexts();
    expect(descTexts).toEqual([`Hylätty`, `Hyväksytty`, `Hyväksytty`]);

    await hakemustenArviointiPage.sortBy("hakemus");
    const ascElems = hakemustenArviointiPage.page.locator(
      ".hakemus-status-cell"
    );
    const ascTexts = await ascElems.allInnerTexts();
    expect(ascTexts).toEqual([`Hyväksytty`, `Hyväksytty`, `Hylätty`]);
  });

  await test.step("can be sorted by applied sum", async () => {
    await hakemustenArviointiPage.sortBy("applied");
    const descElems = hakemustenArviointiPage.page.locator(".applied-sum-cell");
    const descTexts = await descElems.allInnerTexts();
    expect(descTexts).toEqual(["10 374 815 €", "6 999 €", "3 499 €"]);

    await hakemustenArviointiPage.sortBy("applied");
    const ascElems = hakemustenArviointiPage.page.locator(".applied-sum-cell");
    const ascTexts = await ascElems.allInnerTexts();
    expect(ascTexts).toEqual(["3 499 €", "6 999 €", "10 374 815 €"]);
  });

  await test.step("can be sorted by granted sum", async () => {
    await hakemustenArviointiPage.sortBy("granted");
    const descElems = hakemustenArviointiPage.page.locator(".granted-sum-cell");
    const descTexts = await descElems.allInnerTexts();
    expect(descTexts).toEqual(["6 999 €", "2 999 €", "-"]);

    await hakemustenArviointiPage.sortBy("granted");
    const ascElems = hakemustenArviointiPage.page.locator(".granted-sum-cell");
    const ascTexts = await ascElems.allInnerTexts();
    expect(ascTexts).toEqual(["-", "2 999 €", "6 999 €"]);
  });
});
