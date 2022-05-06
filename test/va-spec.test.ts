import { Browser, Page } from "puppeteer";
import moment from "moment";

import {
  createValidCopyOfEsimerkkihakuAndReturnTheNewId,
  mkBrowser,
  getFirstPage,
  publishAvustushaku,
  fillAndSendHakemus,
  acceptHakemus,
  clickElementWithTestId,
  expectedResponseFromExternalAPIhakemuksetForAvustushaku,
  actualResponseFromExternalAPIhakemuksetForAvustushaku,
  closeAvustushakuByChangingEndDateToPast,
  navigate,
  clickElementWithText,
  clickElement,
  clearAndType,
  waitForArvioSave,
  fillAndSendHakemusAndReturnHakemusId,
  resolveAvustushaku,
  sendPäätös,
  textContent,
  selectValmistelijaForHakemus,
  deleteAttachment,
  dummyPdfPath,
  uploadFile,
  waitForSaveStatusOk,
  addFieldOfSpecificTypeToFormAndReturnElementIdAndLabel,
  typeValueInFieldAndExpectValidationError,
  typeValueInFieldAndExpectNoValidationError,
  clickFormSaveAndWait,
  addFieldToFormAndReturnElementIdAndLabel,
  navigateToHakemuksenArviointi,
  setPageErrorConsoleLogger,
  randomString,
  log,
  navigateToHakemus,
  countElements,
  getElementInnerText,
  navigateToPaatos,
  navigateToSeurantaTab,
  clickDropdownElementWithText,
  randomAsiatunnus,
  setupTestLogging,
  navigateToHaunTiedot,
} from "./test-util";
import {
  createAndPublishMuutoshakemusDisabledMenoluokiteltuHaku,
  fillAndSendMuutoshakemusDisabledMenoluokiteltuHakemus,
} from "./muutoshakemus/muutospaatosprosessi-util";

jest.setTimeout(400_000);

describe("Puppeteer tests", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await mkBrowser();
    page = await getFirstPage(browser);
    setPageErrorConsoleLogger(page);
  });

  setupTestLogging();

  afterAll(async () => {
    await page.close();
    await browser.close();
  });

  it("should allow removing attachment from hakemus", async function () {
    const avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
      page,
      randomAsiatunnus()
    );

    await publishAvustushaku(page, avustushakuID);
    await fillAndSendHakemus(page, avustushakuID, async function () {
      await deleteAttachment(page, "financial-information-form");
      await uploadFile(
        page,
        "input[name='financial-information-form']",
        dummyPdfPath
      );
    });
  });

  describe("should allow basic avustushaku flow and check each hakemus has valmistelija", () => {
    const allowBasicAvustushakuFlowAndCheckEachHakemusHasValmistelija =
      (getPage: () => Page, multiplePaymentBatches: boolean) => async () => {
        const page = getPage();
        const avustushakuID =
          await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
            page,
            randomAsiatunnus()
          );
        await navigateToHaunTiedot(page, avustushakuID);
        if (multiplePaymentBatches) {
          await clickElement(page, "label[for='set-maksuera-true']");
          await waitForSaveStatusOk(page);
        } else {
          await clickElement(page, "label[for='set-maksuera-false']");
        }

        await publishAvustushaku(page, avustushakuID);
        await fillAndSendHakemus(page, avustushakuID);

        await closeAvustushakuByChangingEndDateToPast(page, avustushakuID);

        // Accept the hakemus
        const { hakemusID } = await navigateToHakemuksenArviointi(
          page,
          avustushakuID,
          "Akaan kaupunki"
        );

        log("Hakemus ID:", hakemusID);

        await clickElement(
          page,
          "#arviointi-tab label[for='set-arvio-status-plausible']"
        );
        await clearAndType(
          page,
          "#budget-edit-project-budget .amount-column input",
          "100000"
        );
        await Promise.all([
          clickElement(
            page,
            "#arviointi-tab label[for='set-arvio-status-accepted']"
          ),
          waitForArvioSave(page, avustushakuID, hakemusID),
        ]);

        await resolveAvustushaku(page, avustushakuID);

        // Sending päätös should give error because the hakemus is missing valmistelija
        await sendPäätös(page, avustushakuID);
        expect(await textContent(page, "#päätös-send-error")).toEqual(
          `Hakemukselle numero ${hakemusID} ei ole valittu valmistelijaa. Päätöksiä ei lähetetty.`
        );

        await selectValmistelijaForHakemus(
          page,
          avustushakuID,
          hakemusID,
          "_ valtionavustus"
        );

        await sendPäätös(page, avustushakuID);
        const tapahtumaloki = await page.waitForSelector(".tapahtumaloki");
        const logEntryCount = await tapahtumaloki?.evaluate(
          (e) => e.querySelectorAll(".entry").length
        );
        expect(logEntryCount).toEqual(1);
      };

    it(
      "when the avustushaku has a single payment batch",
      allowBasicAvustushakuFlowAndCheckEachHakemusHasValmistelija(
        () => page,
        false
      )
    );
    it(
      "when the avustushaku has multiple payment batches",
      allowBasicAvustushakuFlowAndCheckEachHakemusHasValmistelija(
        () => page,
        true
      )
    );
  });

  it("supports fields that accept only decimals", async function () {
    const avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
      page,
      randomAsiatunnus()
    );
    const { fieldId, fieldLabel } =
      await addFieldOfSpecificTypeToFormAndReturnElementIdAndLabel(
        page,
        "decimalField"
      );
    await publishAvustushaku(page, avustushakuID);

    await fillAndSendHakemus(page, avustushakuID, async () => {
      await typeValueInFieldAndExpectValidationError(
        page,
        fieldId,
        "Not an decimal",
        fieldLabel,
        "fi: Syötä yksi numeroarvo"
      );
      await typeValueInFieldAndExpectNoValidationError(page, fieldId, "4.2");
    });
  });

  it("supports fields that accept only whole numbers", async function () {
    const avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
      page,
      randomAsiatunnus()
    );
    const { fieldId, fieldLabel } =
      await addFieldOfSpecificTypeToFormAndReturnElementIdAndLabel(
        page,
        "integerField"
      );
    await publishAvustushaku(page, avustushakuID);

    await fillAndSendHakemus(page, avustushakuID, async () => {
      await typeValueInFieldAndExpectValidationError(
        page,
        fieldId,
        "Not an integer",
        fieldLabel,
        "fi: Syötä arvo kokonaislukuina"
      );
      await typeValueInFieldAndExpectNoValidationError(page, fieldId, "420");
    });
  });

  it("supports editing and saving the values of the fields", async function () {
    await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
      page,
      randomAsiatunnus()
    );
    await clickElementWithText(page, "span", "Hakulomake");
    await page.waitForFunction(
      () =>
        (document.querySelector("button#saveForm") as HTMLInputElement)
          .disabled === true
    );
    await clearAndType(
      page,
      "textarea[name='duration-help-text-fi']",
      "Gimblegamble"
    );
    await page.waitForFunction(
      () =>
        (document.querySelector("button#saveForm") as HTMLInputElement)
          .disabled === false
    );
  });

  it("should allow user to add koodistokenttä to form and save it", async function () {
    const avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
      page,
      randomAsiatunnus()
    );
    await navigate(page, `/admin/form-editor/?avustushaku=${avustushakuID}`);
    // Add new Koodistokenttä
    await page.hover(".soresu-field-add-header");
    await clickElementWithText(page, "a", "Koodistokenttä");
    const inputfield = await clickElementWithText(
      page,
      "span",
      "Valitse koodisto"
    );
    const inputWidth = await page.evaluate((e) => e.offsetWidth, inputfield);
    expect(inputWidth).toBeGreaterThanOrEqual(200);
    await inputfield?.type("ammattil");
    // Select koodisto for the field
    await clickDropdownElementWithText(page, "ammattiluokitus");
    // Select input type for the field
    await clickElementWithText(page, "label", "Pudotusvalikko");

    await clickFormSaveAndWait(page);
  });

  describe("When haku #1 has been created and published", () => {
    let fieldId: string;
    let avustushakuID: number;
    let hakemusID: number;
    const randomValueForProjectNutshell = randomString();

    beforeAll(async () => {
      avustushakuID = await createValidCopyOfEsimerkkihakuAndReturnTheNewId(
        page,
        randomAsiatunnus()
      );
      fieldId = (
        await addFieldToFormAndReturnElementIdAndLabel(
          page,
          "project-goals",
          "textField"
        )
      ).fieldId;
      await publishAvustushaku(page, avustushakuID);
    });

    describe("And new hakemus has been created", () => {
      beforeAll(async () => {
        hakemusID = await fillAndSendHakemusAndReturnHakemusId(
          page,
          avustushakuID,
          async () => {
            await typeValueInFieldAndExpectNoValidationError(
              page,
              fieldId,
              randomValueForProjectNutshell
            );
          }
        );
        await closeAvustushakuByChangingEndDateToPast(page, avustushakuID);
      });

      it("virkailija can add comments", async () => {
        await navigateToHakemus(page, avustushakuID, hakemusID);
        await clearAndType(page, "#comment-input", "ei jatkoon");
        await clickElement(page, "[data-test-id=send-comment]");

        await page.waitForSelector(".comment-list");
        const comments = await countElements(page, ".single-comment");
        expect(comments).toEqual(1);
        const comment = await getElementInnerText(
          page,
          ".single-comment > div"
        );
        expect(comment).toContain("ei jatkoon");
      });

      describe("And hakemus has been approved", () => {
        beforeAll(async () => {
          await acceptHakemus(page, avustushakuID, hakemusID, async () => {
            await navigateToHakemus(page, avustushakuID, hakemusID);
            await clickElementWithTestId(page, "tab-seuranta");
            await clickElementWithTestId(
              page,
              "set-allow-visibility-in-external-system-true"
            );
            await waitForSaveStatusOk(page);
          });
        });

        it("shows the contents of the project-goals -field of a hakemus in external api as 'nutshell'", async () => {
          const expectedResponse =
            await expectedResponseFromExternalAPIhakemuksetForAvustushaku(
              avustushakuID,
              hakemusID,
              randomValueForProjectNutshell
            );
          const actualResponse =
            await actualResponseFromExternalAPIhakemuksetForAvustushaku(
              avustushakuID
            );
          expect(actualResponse).toMatchObject(expectedResponse);
        });

        describe("And päätös has been created", () => {
          beforeAll(async () => {
            await resolveAvustushaku(page, avustushakuID);
            await selectValmistelijaForHakemus(
              page,
              avustushakuID,
              hakemusID,
              "_ valtionavustus"
            );
            await sendPäätös(page, avustushakuID);
          });

          it("shows the standardized käyttöaika on päätös", async () => {
            await navigateToPaatos(page, hakemusID);
            await page.waitForXPath(
              "//h2[contains(text(), 'Avustuksen käyttöaika')]"
            );
            const firstDay = await page.$x(
              "//p[contains(text(), 'Avustuksen ensimmäinen käyttöpäivä 20.04.1969')]"
            );
            expect(firstDay.length).toEqual(1);
            const lastDay = await page.$x(
              "//p[contains(text(), 'Avustuksen viimeinen käyttöpäivä 20.04.4200')]"
            );
            expect(lastDay.length).toEqual(1);
          });

          describe("when väliselvityspyyntö is sent", () => {
            beforeAll(async () => {
              await navigate(
                page,
                `/admin/valiselvitys/?avustushaku=${avustushakuID}`
              );
              await clickElement(page, "[data-test-id=send-valiselvitys]");
            });

            it("shows the väliselvitys log", async () => {
              await navigate(
                page,
                `/admin/valiselvitys/?avustushaku=${avustushakuID}`
              );
              await page.waitForSelector("div.tapahtumaloki");
              const sender = await textContent(
                page,
                '[data-test-id="sender-0"]'
              );
              expect(sender).toEqual("_ valtionavustus");
              const sent = await textContent(page, '[data-test-id="sent-0"]');
              expect(sent).toEqual("1");
            });

            it("shows väliselvitys as missing on Hakemusten arviointi view", async () => {
              await navigate(page, `/avustushaku/${avustushakuID}/`);
              expect(
                await textContent(
                  page,
                  `[data-test-id="hakemus-${hakemusID}"] [data-test-class=valiselvitys-status-cell]`
                )
              ).toEqual("Puuttuu");
            });
          });

          describe("when loppuselvityspyyntö is sent", () => {
            beforeAll(async () => {
              await navigate(
                page,
                `/admin/loppuselvitys/?avustushaku=${avustushakuID}`
              );
              await clickElement(page, "[data-test-id=send-loppuselvitys]");
            });

            it("shows the loppuselvitys log", async () => {
              await navigate(
                page,
                `/admin/loppuselvitys/?avustushaku=${avustushakuID}`
              );
              await page.waitForSelector("div.tapahtumaloki");
              const sender = await textContent(
                page,
                '[data-test-id="sender-0"]'
              );
              expect(sender).toEqual("_ valtionavustus");
              const sent = await textContent(page, '[data-test-id="sent-0"]');
              expect(sent).toEqual("1");
            });

            it("shows loppuselvitys as missing on Hakemusten arviointi view", async () => {
              await navigate(page, `/avustushaku/${avustushakuID}/`);
              expect(
                await textContent(
                  page,
                  `[data-test-id=\"hakemus-${hakemusID}\"] [data-test-class=loppuselvitys-status-cell]`
                )
              ).toEqual("Puuttuu");
            });
          });
        });
      });
    });
  });

  describe("When muutoshakukelvoton avustushaku with menoluokat has been created", () => {
    let avustushakuID: number;
    let hakemusID: number;
    const haku = {
      registerNumber: randomAsiatunnus(),
      avustushakuName: `Muutoshakukelvoton menoluokallinen haku - ${moment(
        new Date()
      ).format("YYYY-MM-DD HH:mm:ss:SSSS")}`,
    };

    beforeAll(async () => {
      avustushakuID =
        await createAndPublishMuutoshakemusDisabledMenoluokiteltuHaku(
          page,
          haku
        );
    });

    describe("And menoluokallinen hakemus has been submitted", () => {
      const answers = {
        contactPersonEmail: "aku.ankka@example.com",
        contactPersonName: "Aku Ankka",
        contactPersonPhoneNumber: "313",
        projectName: "Akuutin budjettivajeen jeesaus",
      };
      beforeAll(async () => {
        hakemusID = await fillAndSendMuutoshakemusDisabledMenoluokiteltuHakemus(
          page,
          avustushakuID,
          answers
        );
      });

      describe("And hakemus has been approved with lump sum and päätös has been sent", () => {
        beforeAll(async () => {
          await closeAvustushakuByChangingEndDateToPast(page, avustushakuID);
          await acceptHakemus(page, avustushakuID, hakemusID, async () => {});
          await sendPäätös(page, avustushakuID);
        });

        describe("And virkailija navigates to seuranta", () => {
          beforeAll(async () => {
            await navigateToSeurantaTab(page, avustushakuID, hakemusID);
          });

          it("total myönnetty amount is displayed correctly", async () => {
            expect(
              await getElementInnerText(
                page,
                '#budget-edit-project-budget tfoot [class="granted-amount-column"] [class="money"]'
              )
            ).toBe("100000");
          });

          it("OPH:n hyväksymä amount is displayed correctly", async () => {
            expect(
              await getElementInnerText(
                page,
                '#budget-edit-project-budget [class="amount-column"] [class="money sum"]'
              )
            ).toBe("0");
          });
        });
      });
    });
  });
});
