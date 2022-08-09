import moment from "moment";
import { Page } from "@playwright/test";

import {
  clickElementWithText,
  waitForClojureScriptLoadingDialogHidden,
  waitForClojureScriptLoadingDialogVisible,
  clearAndType,
} from "../utils/util";
import { HakujenHallintaPage } from "./hakujenHallintaPage";
import { waitForSaveStatusOk } from "../../test/test-util";

export function MaksatuksetPage(
  page: Page,
  isTypescriptImplementation: boolean
) {
  async function goto(avustushakuName: string) {
    const hakujenHallintaPage = new HakujenHallintaPage(page);
    await hakujenHallintaPage.navigateToHakemusByClicking(avustushakuName);
    await page.locator("text=Maksatukset >> a").click();
  }

  async function fillTositepaivamaaraTypescript() {
    const openDatepicker = `[data-test-id="tosite-pvm"] button`;
    const selectToday = `${openDatepicker} >> text=tänään`;

    await page.locator(openDatepicker).click();
    await page.locator(selectToday).click();
  }

  async function fillTositepaivamaara() {
    const isFilledWithDateValue = async () => {
      try {
        const inputValue = await page.getAttribute(
          '[id="Tositepäivämäärä"]',
          "value"
        );

        if (typeof inputValue !== "string") return false;

        return /[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(inputValue);
      } catch (e) {
        console.log("Failed to get tositepäivämäärä", e);
        return false;
      }
    };

    for (let tries = 0; tries < 3; tries++) {
      try {
        await page.click("#Tositepäivämäärä", { timeout: 5000 });
        await clickElementWithText(page, "button", "OK");
        if (await isFilledWithDateValue()) {
          break;
        }
      } catch (e) {
        console.log("Failed to set tositepäivämäärä calendar date", e);
      }
    }
  }

  async function getDueDateInputValue(): Promise<string> {
    const datePicker = isTypescriptImplementation
      ? `[data-test-id="eräpäivä"] input`
      : `[id="Eräpäivä"]`;

    const dueDate = await page.getAttribute(datePicker, "value");
    if (!dueDate) throw new Error("Cannot find due date from form");

    if (isTypescriptImplementation) {
      return moment(dueDate, "DD.MM.YYYY").format("YYYY-MM-DD");
    } else {
      return dueDate;
    }
  }

  async function fillMaksueranTiedotAndSendMaksatukset() {
    const dueDate = await getDueDateInputValue();

    await fillInMaksueranTiedot(
      "asha pasha",
      "essi.esittelija@example.com",
      "hygge.hyvaksyja@example.com"
    );
    await sendMaksatukset();

    return dueDate;
  }

  async function fillInMaksueranTiedotTypescriptImplementation(
    ashaTunniste: string,
    esittelijanOsoite: string,
    hyvaksyjanOsoite: string
  ) {
    await page.waitForSelector(`.maksatukset_documents`);
    const amountOfInstallments = await page
      .locator(`.maksatukset_document-phase`)
      .count();

    function phaseFiller(phase: number) {
      const row = page.locator(`.maksatukset_document`).nth(phase);

      async function fillASHA(tunniste: string) {
        await row.locator("input").nth(0).fill(tunniste);
      }
      async function fillPresenterEmail(email: string) {
        await row.locator("input").nth(1).fill(email);
      }
      async function fillAcceptorEmail(email: string) {
        await row.locator("input").nth(2).fill(email);
      }
      async function lisaaAsiakirja() {
        await row.locator("text=Lisää asiakirja").click();
      }

      return {
        fillASHA,
        fillPresenterEmail,
        fillAcceptorEmail,
        lisaaAsiakirja,
      };
    }

    await fillTositepaivamaaraTypescript();

    for (let i = 0; i < amountOfInstallments; i++) {
      const rowFiller = phaseFiller(i);
      await rowFiller.fillASHA(ashaTunniste);
      await rowFiller.fillPresenterEmail(esittelijanOsoite);
      await rowFiller.fillAcceptorEmail(hyvaksyjanOsoite);
      await rowFiller.lisaaAsiakirja();
    }
  }

  async function fillInMaksueranTiedot(
    ashaTunniste: string,
    esittelijanOsoite: string,
    hyvaksyjanOsoite: string
  ) {
    if (isTypescriptImplementation) {
      return await fillInMaksueranTiedotTypescriptImplementation(
        ashaTunniste,
        esittelijanOsoite,
        hyvaksyjanOsoite
      );
    } else {
      await fillInMaksueranTiedotClojure(
        ashaTunniste,
        esittelijanOsoite,
        hyvaksyjanOsoite
      );
    }
  }

  async function fillInMaksueranTiedotClojure(
    ashaTunniste: string,
    esittelijanOsoite: string,
    hyvaksyjanOsoite: string
  ) {
    const installmentWrapper = '[data-test-id="installment-phase"]';
    const installmentSelect = `${installmentWrapper} select`;
    const installmentOption = `${installmentSelect} option`;

    await page.locator(installmentOption).nth(0).waitFor({ state: "attached" });
    const amountOfInstallments: number = await page
      .locator(installmentOption)
      .count();

    for (let i = 0; i < amountOfInstallments; i++) {
      await page.locator(installmentSelect).selectOption({ value: `${i}` });
      await fillTositepaivamaara();

      await clearAndType(
        page,
        "[data-test-id=maksatukset-asiakirja--asha-tunniste]",
        `${ashaTunniste}-${i}`
      );
      await clearAndType(
        page,
        "[data-test-id=maksatukset-asiakirja--esittelijan-sahkopostiosoite]",
        esittelijanOsoite
      );
      await clearAndType(
        page,
        "[data-test-id=maksatukset-asiakirja--hyvaksyjan-sahkopostiosoite]",
        hyvaksyjanOsoite
      );
      await page.click(
        "button:not(disabled)[data-test-id=maksatukset-asiakirja--lisaa-asiakirja]"
      );
    }
  }

  async function reloadPaymentPage() {
    if (isTypescriptImplementation) {
      await page.reload({ waitUntil: "networkidle" });
    } else {
      await Promise.all([
        waitForClojureScriptLoadingDialogVisible(page),
        page.reload({ waitUntil: "load" }),
      ]);
      await waitForClojureScriptLoadingDialogHidden(page);
    }
  }

  function getExpectedPaymentXML(
    projekti: string,
    toiminto: string,
    toimintayksikko: string,
    pitkaviite: string,
    invoiceNumber: string,
    dueDate: string,
    ovt: string = "003727697901"
  ): string {
    const today = moment(new Date()).format("YYYY-MM-DD");
    return `<?xml version="1.0" encoding="UTF-8"?><objects><object><header><toEdiID>${ovt}</toEdiID><invoiceType>INVOICE</invoiceType><vendorName>Akaan kaupunki</vendorName><addressFields><addressField1></addressField1><addressField2></addressField2><addressField5></addressField5></addressFields><vendorRegistrationId>2050864-5</vendorRegistrationId><bic>OKOYFIHH</bic><bankAccount>FI95 6682 9530 0087 65</bankAccount><invoiceNumber>${invoiceNumber}</invoiceNumber><longReference>${pitkaviite}</longReference><documentDate>${today}</documentDate><dueDate>${dueDate}</dueDate><paymentTerm>Z001</paymentTerm><currencyCode>EUR</currencyCode><grossAmount>99999</grossAmount><netamount>99999</netamount><vatamount>0</vatamount><voucherSeries>XE</voucherSeries><postingDate>${today}</postingDate><ownBankShortKeyCode></ownBankShortKeyCode><handler><verifierName>essi.esittelija@example.com</verifierName><verifierEmail>essi.esittelija@example.com</verifierEmail><approverName>hygge.hyvaksyja@example.com</approverName><approverEmail>hygge.hyvaksyja@example.com</approverEmail><verifyDate>${today}</verifyDate><approvedDate>${today}</approvedDate></handler><otsData><otsBankCountryKeyCode></otsBankCountryKeyCode></otsData><invoicesource>VA</invoicesource></header><postings><postingRows><postingRow><rowId>1</rowId><generalLedgerAccount>82010000</generalLedgerAccount><postingAmount>99999</postingAmount><accountingObject01>${toimintayksikko}</accountingObject01><accountingObject02>29103020</accountingObject02><accountingObject04>${projekti}</accountingObject04><accountingObject05>${toiminto}</accountingObject05><accountingObject08></accountingObject08></postingRow></postingRows></postings></object></objects>`;
  }

  async function sendMaksatukset(): Promise<void> {
    if (isTypescriptImplementation) {
      return await sendMaksatuksetTypescript();
    } else {
      return await sendMaksatuksetClojure();
    }
  }

  async function sendMaksatuksetClojure(): Promise<void> {
    await Promise.all([
      page.waitForSelector(`text="Kaikki maksatukset lähetetty"`, {
        timeout: 10000,
      }),
      clickElementWithText(page, "button", "Lähetä maksatukset"),
    ]);
  }

  async function sendMaksatuksetTypescript(): Promise<void> {
    await Promise.all([
      waitForSaveStatusOk(page),
      clickElementWithText(page, "button", "Lähetä maksatukset"),
    ]);
  }

  async function clickLahtevatMaksatuksetTab() {
    await page.locator(`text=Lähtevät maksatukset`).click();
    return lahtevatMaksueratTab(page);
  }

  async function clickLahetetytMaksatuksetTab() {
    await page.locator(`text=Lähetetyt maksatukset`).click();
    return lahetetytMaksueratTab(page, isTypescriptImplementation);
  }

  return {
    fillInMaksueranTiedot,
    fillMaksueranTiedotAndSendMaksatukset,
    getExpectedPaymentXML,
    goto,
    reloadPaymentPage,
    sendMaksatukset,
    clickLahtevatMaksatuksetTab,
    clickLahetetytMaksatuksetTab,
  };
}

function lahetetytMaksueratTab(
  page: Page,
  isTypescriptImplementation: boolean
) {
  return function maksuerat(phase: 1 | 2 | 3) {
    const tableSelector = isTypescriptImplementation
      ? `[data-test-id="maksatukset-table-batches"] tbody tr:nth-of-type(${phase})`
      : `[data-test-id="batches-table"] [class="va-ui-table-body"] tr:nth-of-type(${phase})`;

    const paymentSelector = isTypescriptImplementation
      ? `[data-test-id="maksatukset-table-payments"] .maksatukset_table-container >> nth=${
          phase - 1
        } `
      : `[data-test-id="payments-table"] tbody >> nth=${phase - 1}`;

    async function getPitkaviite(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=0`)
        .innerText();
    }

    async function getPaymentStatus(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=1`)
        .innerText();
    }

    async function getToimittaja(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=2`)
        .innerText();
    }

    async function getHanke(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=3`)
        .innerText();
    }

    async function getMaksuun(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=4`)
        .innerText();
    }

    async function getIBAN(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=5`)
        .innerText();
    }

    async function getLKPT(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=6`)
        .innerText();
    }

    async function getTAKP(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=7`)
        .innerText();
    }
    async function getTiliöinti(): Promise<string> {
      return await page
        .locator(`${paymentSelector} >> td >> nth=8`)
        .innerText();
    }

    async function getPhaseTitle(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(1)`);
    }

    async function getTotalSum(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(2)`);
    }

    async function getAmountOfPayments(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(3)`);
    }

    async function getLaskupvm(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(4)`);
    }

    async function getErapvm(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(5)`);
    }

    async function getTositepaiva(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(6)`);
    }

    async function getAllekirjoitettuYhteenveto(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(7)`);
    }

    async function getPresenterEmail(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(8)`);
    }

    async function getAcceptorEmail(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(9)`);
    }

    return {
      getPhaseTitle,
      getTotalSum,
      getAmountOfPayments,
      getLaskupvm,
      getErapvm,
      getTositepaiva,
      getAllekirjoitettuYhteenveto,
      getPresenterEmail,
      getAcceptorEmail,
      getPitkaviite,
      getPaymentStatus,
      getToimittaja,
      getHanke,
      getMaksuun,
      getIBAN,
      getLKPT,
      getTAKP,
      getTiliöinti,
    };
  };
}

function lahtevatMaksueratTab(page: Page) {
  return function maksuerat(phase: 1 | 2 | 3) {
    const tableSelector = `[title="Olemassaolevan maksuerän tietoja ei voi muokata"] [class="va-ui-table-body"] tr:nth-of-type(${phase})`;

    async function getPhaseTitle(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(1)`);
    }
    async function getAsha(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(2)`);
    }
    async function getPresenterEmail(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(3)`);
    }
    async function getAcceptorEmail(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(4)`);
    }
    async function getDateAdded(): Promise<string> {
      return await page.innerText(`${tableSelector} td:nth-of-type(5)`);
    }
    return {
      getAsha,
      getPresenterEmail,
      getAcceptorEmail,
      getDateAdded,
      getPhaseTitle,
    };
  };
}
