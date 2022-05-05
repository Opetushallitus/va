import { expect } from "@playwright/test";
import { budjettimuutoshakemusTest } from "../../fixtures/budjettimuutoshakemusTest";
import { HakemustenArviointiPage } from "../../pages/hakemustenArviointiPage";
import { expectToBeDefined } from "../../utils/util";
import { HakijaAvustusHakuPage } from "../../pages/hakijaAvustusHakuPage";
import { VIRKAILIJA_URL } from "../../utils/constants";

interface ArviointiUiFilteringFixtures {
  hakemustenArviointiPage: HakemustenArviointiPage;
}

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
      contactPersonEmail: "erkki2.esimerkki@example.com",
      lang: "sv" as const,
    };
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
    await hakijaAvustusHakuPage.navigate(avustushakuID, answers2.lang);
    await hakijaAvustusHakuPage.fillBudjettimuutoshakemusEnabledHakemus(
      avustushakuID,
      answers2,
      budget2
    );
    await hakijaAvustusHakuPage.submitApplication();
    const answers3 = {
      ...answers,
      contactPersonEmail: "erkki3.esimerkki@example.com",
    };
    await hakijaAvustusHakuPage.navigate(avustushakuID, answers3.lang);
    await hakijaAvustusHakuPage.fillBudjettimuutoshakemusEnabledHakemus(
      avustushakuID,
      answers3,
      budget2
    );
    await hakijaAvustusHakuPage.waitForEditSaved();
    const hakemustenArviointiPage = new HakemustenArviointiPage(page);
    await use(hakemustenArviointiPage);
  },
});

test("hakemus list filtering", async ({
  hakemustenArviointiPage,
  hakuProps,
  avustushakuID,
}) => {
  await hakemustenArviointiPage.navigate(avustushakuID);
  await expect(hakemustenArviointiPage.hakemusListing).toContainText(
    "2/2 hakemusta"
  );

  await test.step("filtering with organization works", async () => {
    await hakemustenArviointiPage.inputFilterOrganization.fill(
      "Nothing will be found"
    );
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "0/2 hakemusta"
    );
    await hakemustenArviointiPage.inputFilterOrganization.fill("");
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
  });

  await test.step("filtering with project works", async () => {
    await hakemustenArviointiPage.inputFilterProject.fill(
      `1/${hakuProps.registerNumber}`
    );
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "1/2 hakemusta"
    );
    await hakemustenArviointiPage.inputFilterProject.fill("");
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
  });

  await test.step(
    "clicking näytä keskeneräiset shows unfinished hakemuses in the listing",
    async () => {
      await expect(hakemustenArviointiPage.hakemusListing).toContainText(
        "2/2 hakemusta"
      );
      await expect(hakemustenArviointiPage.showUnfinished).not.toBeChecked();
      await hakemustenArviointiPage.showUnfinished.click();
      await expect(hakemustenArviointiPage.showUnfinished).toBeChecked();
      await expect(hakemustenArviointiPage.hakemusListing).toContainText(
        "3/3 hakemusta"
      );
      await hakemustenArviointiPage.showUnfinished.click();
    }
  );

  await test.step("can filter with arvioija", async () => {
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
    await hakemustenArviointiPage.hakemusRows
      .first()
      .locator('[aria-label="Lisää arvioija hakemukselle"]')
      .click();
    await hakemustenArviointiPage.page
      .locator('text="Päivi Pääkäyttäjä"')
      .click();
    await hakemustenArviointiPage.closeUkotusModal();
    await hakemustenArviointiPage.page.click("text=Arvioija");
    await hakemustenArviointiPage.page
      .locator('text="Päivi Pääkäyttäjä"')
      .click();
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "1/2 hakemusta"
    );
    await hakemustenArviointiPage.page
      .locator('[aria-label="Poista arvioija rajaus"]')
      .click();
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
  });
  await test.step("can filter with valmistelija", async () => {
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
    await hakemustenArviointiPage.hakemusRows
      .first()
      .locator('[aria-label="Lisää valmistelija hakemukselle"]')
      .click();
    await hakemustenArviointiPage.page
      .locator('[aria-label="Lisää _ valtionavustus valmistelijaksi"]')
      .click();
    await hakemustenArviointiPage.closeUkotusModal();
    await hakemustenArviointiPage.page.click("text=Valmistelija");
    await hakemustenArviointiPage.page
      .locator('[aria-label="Rajaa valmistelijalla _ valtionavustus"]')
      .click();
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "1/2 hakemusta"
    );
    await hakemustenArviointiPage.page
      .locator('[aria-label="Poista valmistelija rajaus"]')
      .click();
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
  });

  await test.step("filtering with 'Rajaa listaa' hakemus filter works", async () => {
    await hakemustenArviointiPage.clickRajaaListaaFilter("Asiointikieli", "Suomi");
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "1/2 hakemusta"
    );
    await hakemustenArviointiPage.clickRajaaListaaFilter("Asiointikieli", "Suomi");
    await expect(hakemustenArviointiPage.hakemusListing).toContainText(
      "2/2 hakemusta"
    );
  });

  await test.step(
    "clicking another avustushaku from dropdown switches to that",
    async () => {
      await hakemustenArviointiPage.avustushakuDropdown
        .locator(".rw-popup-container")
        .waitFor({ state: "hidden" });
      await hakemustenArviointiPage.avustushakuDropdown.click();
      await hakemustenArviointiPage.avustushakuDropdown
        .locator(".rw-popup-container")
        .waitFor();
      await Promise.all([
        hakemustenArviointiPage.page.waitForNavigation(),
        hakemustenArviointiPage.avustushakuDropdown
          .locator("text=Ammatillisen peruskoulutuksen laadun kehittäminen")
          .click(),
      ]);
      await expect(hakemustenArviointiPage.hakemusListing).toContainText(
        "0/0 hakemusta"
      );
      expect(hakemustenArviointiPage.page.url()).toMatch(
        `${VIRKAILIJA_URL}/avustushaku/1/`
      );
    }
  );
});
