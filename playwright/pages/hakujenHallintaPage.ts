import { Dialog, expect, Locator, Page } from "@playwright/test";
import { Response } from "playwright-core";
import moment from "moment";
import fs from "fs/promises";
import path from "path";

import { navigate } from "../utils/navigate";
import {
  clickElementWithText,
  clickElementWithTextStrict,
  expectQueryParameter,
} from "../utils/util";
import { VIRKAILIJA_URL } from "../utils/constants";
import { VaCodeValues, Field } from "../utils/types";
import { addFieldsToHakemusJson } from "../utils/hakemus-json";

interface Rahoitusalue {
  koulutusaste: string;
  talousarviotili: string;
}

const defaultRahoitusalueet: Rahoitusalue[] = [
  {
    koulutusaste: "Ammatillinen koulutus",
    talousarviotili: "29.10.30.20",
  },
];

interface Raportointivelvoite {
  raportointilaji: string;
  maaraaika: string;
  ashaTunnus: string;
  lisatiedot?: string;
}

export interface HakuProps {
  avustushakuName: string;
  randomName: string;
  registerNumber: string;
  vaCodes: VaCodeValues;
  hakuaikaStart: Date;
  hakuaikaEnd: Date;
  arvioituMaksupaiva?: Date;
  hankkeenAlkamispaiva: string;
  hankkeenPaattymispaiva: string;
  selectionCriteria: string[];
  raportointivelvoitteet: Raportointivelvoite[];
  hakemusFields: Field[];
  jaossaOlevaSumma?: number;
}

const dateFormat = "D.M.YYYY H.mm";
const formatDate = (date: Date | moment.Moment) =>
  moment(date).format(dateFormat);
export const parseDate = (input: string) => moment(input, dateFormat).toDate();

const waitForSaveStatusOk = (page: Page) =>
  page.waitForSelector(
    '[data-test-id="save-status"]:has-text("Kaikki tiedot tallennettu")'
  );

export class FormEditorPage {
  readonly page: Page;
  formErrorState: Locator;
  form: Locator;
  saveStatus: Locator;
  fieldId: Locator;
  saveFormButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formErrorState = this.page.locator(
      '[data-test-id="form-error-state"]'
    );
    this.form = this.page.locator(".form-json-editor textarea");
    this.saveStatus = this.page.locator('[data-test-id="save-status"]');
    this.fieldId = this.page.locator("span.soresu-field-id");
    this.saveFormButton = this.page.locator("#saveForm");
  }

  async changeLomakeJson(lomakeJson: string) {
    await this.form.waitFor();
    /*
      for some reason
      await this.page.fill(".form-json-editor textarea", lomakeJson)
      takes almost 50seconds
     */
    await this.form.evaluate((textarea, lomakeJson) => {
      (textarea as HTMLTextAreaElement).value = lomakeJson;
    }, lomakeJson);

    await this.formErrorState.waitFor({ state: "hidden" });
    // trigger autosave by typing space in the end
    await this.form.type(" ");
    await this.page.keyboard.press("Backspace");
  }

  async saveForm() {
    await this.saveFormButton.click();
    await this.saveStatus.locator("text=Kaikki tiedot tallennettu").isVisible();
  }

  async getFieldIds() {
    const ids = await this.fieldId.evaluateAll((elems) =>
      elems.map((e) => e.textContent)
    );
    return ids.filter((id): id is string => id !== null);
  }

  async addField(afterFieldId: string, newFieldType: string) {
    await this.page.hover(`[data-test-id="field-add-${afterFieldId}"]`);
    await this.page.click(
      `[data-test-id="field-${afterFieldId}"] [data-test-id="add-field-${newFieldType}"]`
    );
    await this.fieldId.first(); // hover on something else so that the added content from first hover doesn't change page coordinates
  }

  async removeField(fieldId: string) {
    async function acceptDialog(dialog: Dialog) {
      await dialog.accept("Oletko varma, että haluat poistaa kentän?");
    }
    this.page.on("dialog", acceptDialog);
    const fieldIdWithText = `text="${fieldId}"`;
    await this.fieldId.locator(fieldIdWithText).waitFor();
    await Promise.all([
      // without position this clicks the padding and does nothing
      this.page.click(`[data-test-id="delete-field-${fieldId}"]`, {
        position: { x: 15, y: 5 },
      }),
      this.fieldId.locator(fieldIdWithText).waitFor({ state: "detached" }),
    ]);
    this.page.removeListener("dialog", acceptDialog);
  }

  async moveField(fieldId: string, direction: "up" | "down") {
    const fields = await this.getFieldIds();
    const originalIndex = fields.indexOf(fieldId);
    const expectedIndex =
      direction === "up" ? originalIndex - 1 : originalIndex + 1;
    await this.page.click(
      `[data-test-id="move-field-${direction}-${fieldId}"]`
    );
    await this.page.waitForFunction(
      ({ fieldId, expectedIndex }) => {
        const fieldIds = Array.from(
          document.querySelectorAll("span.soresu-field-id")
        ).map((e) => e.textContent);
        return fieldIds[expectedIndex] === fieldId;
      },
      { expectedIndex, fieldId }
    );
  }
}

function SelvitysTab(page: Page) {
  const titleSelector = '[name="applicant-info-label-fi"]';

  async function save() {
    await Promise.all([
      page.click('text="Tallenna"'),
      page.waitForResponse(
        (response) =>
          response.status() === 200 && isSelvitysSavedResponse(response)
      ),
    ]);
  }

  function isSelvitysSavedResponse(response: Response) {
    if (response.request().method() !== "POST") return false;
    return (
      response.url().endsWith("/selvitysform/valiselvitys") ||
      response.url().endsWith("/selvitysform/loppuselvitys")
    );
  }

  async function setSelvitysTitleFi(title: string) {
    await page.fill(titleSelector, title);
    await save();
  }

  async function getSelvitysTitleFi() {
    return await page.textContent(titleSelector);
  }

  async function openFormPreview(selector: string) {
    const [previewPage] = await Promise.all([
      page.context().waitForEvent("page"),
      await page.click(selector),
    ]);
    await previewPage.bringToFront();
    return previewPage;
  }

  async function openFormPreviewFi() {
    return await openFormPreview(`[data-test-id='form-preview-fi']`);
  }

  async function openFormPreviewSv() {
    return await openFormPreview(`[data-test-id='form-preview-sv']`);
  }

  return {
    getSelvitysTitleFi,
    setSelvitysTitleFi,
    openFormPreviewFi,
    openFormPreviewSv,
  };
}

export class HakujenHallintaPage {
  readonly page: Page;
  readonly paatosUpdatedAt: Locator;
  readonly valiselvitysUpdatedAt: Locator;
  readonly loppuselvitysUpdatedAt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.paatosUpdatedAt = this.page.locator("#paatosUpdatedAt");
    this.valiselvitysUpdatedAt = this.page.locator("#valiselvitysUpdatedAt");
    this.loppuselvitysUpdatedAt = this.page.locator("#loppuselvitysUpdatedAt");
  }

  async navigate(avustushakuID: number, opts?: { newHakuListing?: boolean }) {
    await navigate(
      this.page,
      `/admin/haku-editor/?avustushaku=${avustushakuID}${
        opts?.newHakuListing ? "&new-haku-listing=true" : ""
      }`
    );
  }

  async navigateToPaatos(avustushakuID: number) {
    await navigate(this.page, `/admin/decision/?avustushaku=${avustushakuID}`);
  }

  async navigateToValiselvitys(avustushakuID: number) {
    await navigate(
      this.page,
      `/admin/valiselvitys/?avustushaku=${avustushakuID}`
    );
  }

  async navigateToFormEditor(avustushakuID: number) {
    await navigate(
      this.page,
      `/admin/form-editor/?avustushaku=${avustushakuID}`
    );
    await this.page.waitForLoadState("networkidle");
    return new FormEditorPage(this.page);
  }

  async switchToHaunTiedotTab() {
    await this.page.click('[data-test-id="haun-tiedot-välilehti"]');
    await this.page.waitForSelector("#register-number");
  }

  async switchToPaatosTab() {
    await this.page.click('[data-test-id="päätös-välilehti"]');
  }

  async switchToValiselvitysTab() {
    await this.page.click('[data-test-id="väliselvitys-välilehti"]');
    return SelvitysTab(this.page);
  }

  async switchToLoppuselvitysTab() {
    await this.page.click('[data-test-id="loppuselvitys-välilehti"]');
    return SelvitysTab(this.page);
  }

  async sendValiselvitys() {
    await this.page.click('text="Lähetä väliselvityspyynnöt"');
  }

  async sendLoppuselvitys() {
    await this.page.click('text="Lähetä loppuselvityspyynnöt"');
    await this.page.waitForSelector('text="Lähetetty 1 viestiä"');
  }

  async waitForSave() {
    await waitForSaveStatusOk(this.page);
  }

  async searchUsersForRoles(user: string) {
    await Promise.all([
      this.page.waitForResponse(`${VIRKAILIJA_URL}/api/va-user/search`),
      this.page.fill("#va-user-search-input", user),
    ]);
  }

  async searchUsersForVastuuvalmistelija(user: string) {
    await Promise.all([
      this.page.waitForResponse(`${VIRKAILIJA_URL}/api/va-user/search`),
      this.page.fill("#va-user-search-vastuuvalmistelija", user),
    ]);
  }

  async clearUserSearchForRoles() {
    this.page.click('[data-test-id="clear-role-search"]');
  }

  async clearUserSearchForVastuuvalmistelija() {
    this.page.click('[data-test-id="clear-vastuuvalmistelija-search"]');
  }

  async fillVastuuvalmistelijaName(name: string) {
    await Promise.all([
      this.waitForRolesSaved(),
      this.page.fill('[data-test-id="vastuuvalmistelija-name"]', name),
    ]);
  }

  async fillVastuuvalmistelijaEmail(email: string) {
    await Promise.all([
      this.waitForRolesSaved(),
      this.page.fill('[data-test-id="vastuuvalmistelija-email"]', email),
    ]);
  }

  async selectUser(user: string) {
    await Promise.all([
      this.waitForRolesSaved(),
      clickElementWithText(this.page, "a", user),
    ]);
  }

  async removeUser(name: string) {
    const testId = "role-" + name.toLowerCase().replace(" ", "-");
    await Promise.all([
      this.waitForRolesSaved(),
      this.page.click(`[data-test-id="${testId}"] button.remove`),
    ]);
  }

  async setUserRole(
    name: string,
    role: "presenting_officer" | "evaluator" | "vastuuvalmistelija"
  ) {
    const testId = "role-" + name.toLowerCase().replace(" ", "-");
    await Promise.all([
      this.waitForRolesSaved(),
      this.page
        .selectOption(`[data-test-id="${testId}"] select[name=role]`, role)
        .then((_) => this.page.keyboard.press("Tab")), // tab out of the field to trigger save
    ]);
  }

  async waitForRolesSaved() {
    return await Promise.all([
      this.page.waitForResponse(
        new RegExp(`${VIRKAILIJA_URL}/api/avustushaku/\\d+/role(/\\d+)?`)
      ),
      this.page.waitForResponse(
        new RegExp(`${VIRKAILIJA_URL}/api/avustushaku/\\d+/privileges`)
      ),
    ]);
  }

  async setLoppuselvitysDate(value: string) {
    await this.page.fill(
      '[data-test-id="loppuselvityksen-aikaraja"] div.datepicker input',
      value
    );
    await this.page.keyboard.press("Tab");
  }

  async setValiselvitysDate(value: string) {
    await this.page.fill(
      '[data-test-id="valiselvityksen-aikaraja"] div.datepicker input',
      value
    );
    await this.page.keyboard.press("Tab");
  }

  async sendPaatos(avustushakuID: number, amount = 1) {
    await this.page.click(`text="Lähetä ${amount} päätöstä"`);
    await Promise.all([
      this.page.waitForResponse(
        `${VIRKAILIJA_URL}/api/paatos/sendall/${avustushakuID}`
      ),
      clickElementWithText(this.page, "button", "Vahvista lähetys"),
    ]);
    const tapahtumaloki = await this.page.waitForSelector(".tapahtumaloki");
    const logEntryCount = await tapahtumaloki.evaluate(
      (e) => e.querySelectorAll(".entry").length
    );
    expect(logEntryCount).toEqual(1);
  }

  async resendPaatokset(amountToSend = 1) {
    await this.page.click(`text="Lähetä ${amountToSend} päätöstä uudelleen"`);
    await this.page.click('text="Vahvista päätösten uudelleenlähetys"');
    await this.page.waitForSelector('text="Päätökset lähetetty uudelleen"');
  }

  async resolveAvustushaku() {
    await this.page.click("label[for='set-status-resolved']");
    await this.waitForSave();
  }

  async copyCurrentHaku(): Promise<number> {
    const currentHakuTitle = await this.page.textContent("#haku-name-fi");
    await clickElementWithText(this.page, "a", "Kopioi uuden pohjaksi");

    await this.page.waitForFunction(
      (name) => document.querySelector("#haku-name-fi")?.textContent !== name,
      currentHakuTitle
    );

    return parseInt(await expectQueryParameter(this.page, "avustushaku"));
  }

  async copyEsimerkkihaku(): Promise<number> {
    await navigate(this.page, "/admin/haku-editor/");
    await clickElementWithTextStrict(
      this.page,
      "td",
      "Yleisavustus - esimerkkihaku"
    );
    return await this.copyCurrentHaku();
  }

  async inputTalousarviotili({ koulutusaste, talousarviotili }: Rahoitusalue) {
    await this.page.fill(
      `input[name="education-levels"][data-title="${koulutusaste}"]`,
      talousarviotili
    );
  }

  dropdownSelector(codeType: "operational-unit" | "project" | "operation") {
    return `[data-test-id=code-value-dropdown__${codeType}]`;
  }

  async selectCode(
    codeType: "operational-unit" | "project" | "operation",
    code: string
  ): Promise<void> {
    await this.page.click(`${this.dropdownSelector(codeType)} > div`);
    await this.page.click(`[data-test-id='${code}']`);
  }

  raportointilajiSelector(index: number) {
    return `[id="raportointilaji-dropdown-${index}"]`;
  }

  async selectRaportointilaji(
    index: number,
    raportointilaji: string
  ): Promise<void> {
    await this.page.click(`${this.raportointilajiSelector(index)} > div`);
    await this.page.click(`[data-test-id='${raportointilaji}']`);
  }

  async fillCode(
    codeType: "operational-unit" | "project" | "operation",
    code: string
  ): Promise<void> {
    await this.page.fill(
      `${this.dropdownSelector(codeType)} > div input`,
      `${code}`
    );
  }

  async selectCodeAndWaitForSave(code: string): Promise<void> {
    await Promise.all([
      this.page.click(`[data-test-id="${code}"]`),
      this.page.locator("text=Tallennetaan").waitFor(),
      this.page.locator("text=Kaikki tiedot tallennettu").waitFor(),
    ]);
  }

  async getInputOptionCodeStyles(code: string): Promise<CSSStyleDeclaration> {
    const selectableOptionElement = await this.page.waitForSelector(
      `[data-test-id="${code}"]`
    );
    return await this.page.evaluate(
      (e) => getComputedStyle(e),
      selectableOptionElement
    );
  }

  async getInputPlaceholderCodeStyles(
    codeType: "operational-unit" | "project" | "operation"
  ): Promise<CSSStyleDeclaration> {
    const selectableOptionElement = await this.page.waitForSelector(
      `[data-test-id="singlevalue-${codeType}"]`
    );
    return await this.page.evaluate(
      (e) => getComputedStyle(e),
      selectableOptionElement
    );
  }

  async selectTositelaji(value: "XE" | "XB"): Promise<void> {
    await this.page.selectOption("select#document-type", value);
  }

  async createHakuFromEsimerkkihaku(props: HakuProps): Promise<number> {
    const {
      avustushakuName,
      registerNumber,
      hakuaikaStart,
      hakuaikaEnd,
      hankkeenAlkamispaiva,
      hankkeenPaattymispaiva,
      selectionCriteria,
      arvioituMaksupaiva,
      jaossaOlevaSumma,
      raportointivelvoitteet,
    } = props;
    console.log(`Avustushaku name for test: ${avustushakuName}`);

    const avustushakuID = await this.copyEsimerkkihaku();
    await this.page.waitForLoadState("networkidle");
    console.log(`Avustushaku ID: ${avustushakuID}`);

    await this.page.fill("#register-number", registerNumber);
    await this.page.fill("#haku-name-fi", avustushakuName);
    await this.page.fill("#haku-name-sv", avustushakuName + " på svenska");

    if (props.vaCodes) {
      await this.selectCode("operational-unit", props.vaCodes.operationalUnit);
      await this.selectCode("project", props.vaCodes.project);
      await this.selectCode("operation", props.vaCodes.operation);
    }

    for (const rahoitusalue of defaultRahoitusalueet) {
      await this.inputTalousarviotili(rahoitusalue);
    }

    if (arvioituMaksupaiva) {
      await this.page.fill(
        '[name="arvioitu_maksupaiva"]',
        formatDate(arvioituMaksupaiva)
      );
    }

    if (jaossaOlevaSumma !== undefined) {
      await this.page.fill("#total-grant-size", String(jaossaOlevaSumma));
    }

    await this.selectTositelaji("XE");
    await this.page.fill("#hakuaika-start", formatDate(hakuaikaStart));
    await this.page.fill("#hakuaika-end", formatDate(hakuaikaEnd));
    await this.addValmistelija("Viivi Virkailija");
    await this.addArvioija("Päivi Pääkäyttäjä");

    for (var i = 0; i < selectionCriteria.length; i++) {
      await this.page.click('[data-test-id="add-selection-criteria"]');
      await this.page.fill(`#selection-criteria-${i}-fi`, selectionCriteria[i]);
      await this.page.fill(`#selection-criteria-${i}-sv`, selectionCriteria[i]);
    }

    for (var i = 0; i < raportointivelvoitteet.length; i++) {
      await this.selectRaportointilaji(
        i,
        raportointivelvoitteet[i].raportointilaji
      );
      await this.page.fill(
        `[id="asha-tunnus-${i}"]`,
        raportointivelvoitteet[i].ashaTunnus
      );
      await this.page.fill(
        `[name="maaraaika-${i}"]`,
        raportointivelvoitteet[i].maaraaika
      );
      if (raportointivelvoitteet[i].lisatiedot) {
        await this.page.fill(
          `[id="lisatiedot-${i}"]`,
          raportointivelvoitteet[i].lisatiedot ?? ""
        );
      }
      await this.waitForSave();
      await this.page.click(`[id="new-raportointivelvoite-${i}"]`);
    }

    await this.waitForSave();

    await this.page.click('[data-test-id="päätös-välilehti"]');
    await this.page.fill(
      '[data-test-id="hankkeen-alkamispaiva"] div.datepicker input',
      hankkeenAlkamispaiva
    );
    await this.page.fill(
      '[data-test-id="hankkeen-paattymispaiva"] div.datepicker input',
      hankkeenPaattymispaiva
    );

    await this.waitForSave();

    await this.page.fill('[id="decision.taustaa.fi"]', "taustaa");

    await this.waitForSave();

    return avustushakuID;
  }

  async addValmistelija(name: string) {
    await this.searchUsersForRoles(name);
    await this.selectUser(name);
  }

  async addArvioija(name: string) {
    await this.searchUsersForRoles(name);
    await this.selectUser(name);
    await this.setUserRole(name, "evaluator");
  }

  async addVastuuvalmistelija(name: string) {
    await this.searchUsersForRoles(name);
    await this.selectUser(name);
    await this.setUserRole(name, "vastuuvalmistelija");
  }

  async createHakuWithLomakeJson(
    lomakeJson: string,
    hakuProps: HakuProps
  ): Promise<{ avustushakuID: number }> {
    const avustushakuID = await this.createHakuFromEsimerkkihaku(hakuProps);
    const formEditorPage = await this.navigateToFormEditor(avustushakuID);

    if (hakuProps.hakemusFields.length) {
      const newJson = addFieldsToHakemusJson(
        lomakeJson,
        hakuProps.hakemusFields
      );
      await formEditorPage.changeLomakeJson(newJson);
    } else {
      await formEditorPage.changeLomakeJson(lomakeJson);
    }

    await formEditorPage.saveForm();
    return { avustushakuID };
  }

  async publishAvustushaku(avustushakuId: number) {
    await this.navigate(avustushakuId);
    await this.page.click("label[for='set-status-published']");
    await this.waitForSave();
  }

  async setStartDate(time: moment.Moment) {
    const selector = "#hakuaika-start";
    await this.page.fill(selector, formatDate(time));
    await this.page.$eval(selector, (e) => e.blur());
    await this.waitForSave();
  }

  async setEndDate(endTime: string) {
    const selector = "#hakuaika-end";
    await this.page.fill(selector, endTime);
    await this.page.$eval(selector, (e) => e.blur());
    await this.waitForSave();
  }

  async setAvustushakuEndDateToTomorrow() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = `${tomorrow.getDate()}.${
      tomorrow.getMonth() + 1
    }.${tomorrow.getFullYear()} ${tomorrow.getHours()}.${tomorrow.getMinutes()}`;
    await this.setEndDate(tomorrowString);
  }

  async closeAvustushakuByChangingEndDateToPast() {
    const previousYear = new Date().getFullYear() - 1;
    await this.setEndDate(`1.1.${previousYear} 0.00`);
  }

  async createMuutoshakemusEnabledHaku(hakuProps: HakuProps) {
    const muutoshakemusEnabledHakuLomakeJson = await fs.readFile(
      path.join(__dirname, "../fixtures/prod.hakulomake.json"),
      "utf8"
    );
    const { avustushakuID } = await this.createHakuWithLomakeJson(
      muutoshakemusEnabledHakuLomakeJson,
      hakuProps
    );
    await this.publishAvustushaku(avustushakuID);
    return avustushakuID;
  }

  async createBudjettimuutosEnabledHaku(hakuProps: HakuProps) {
    const muutoshakemusEnabledHakuLomakeJson = await fs.readFile(
      path.join(__dirname, "../fixtures/budjettimuutos.hakulomake.json"),
      "utf8"
    );
    const { avustushakuID } = await this.createHakuWithLomakeJson(
      muutoshakemusEnabledHakuLomakeJson,
      hakuProps
    );
    await this.publishAvustushaku(avustushakuID);
    return avustushakuID;
  }

  async allowExternalApi(allow: boolean) {
    await this.page.click(
      `label[for="allow_visibility_in_external_system_${allow}"]`
    );
    await this.waitForSave();
  }

  hakuListingTableSelectors() {
    const hakuList = this.page.locator("#haku-listing");
    const hakuRows = hakuList.locator("tbody tr");
    const baseTableLocators = (columnTestId: string) => ({
      cellValue: (trTestId: string) =>
        hakuList
          .locator(`[data-test-id="${trTestId}"]`)
          .locator(`[data-test-id=${columnTestId}]`),
      cellValues: () =>
        hakuRows.locator(`[data-test-id=${columnTestId}]`).allInnerTexts(),
      sort: this.page.locator(`[data-test-id=sort-button-${columnTestId}]`),
    });
    return {
      hakuList,
      hakuRows,
      avustushaku: {
        ...baseTableLocators("avustushaku"),
        input: this.page.locator('[placeholder="Avustushaku"]'),
      },
      tila: {
        ...baseTableLocators("status"),
        toggle: this.page.locator('button:has-text("Tila")'),
        uusiCheckbox: this.page.locator('label:has-text("Uusi")'),
      },
      vaihe: {
        ...baseTableLocators("phase"),
        toggle: this.page.locator('button:has-text("Vaihe")'),
        kiinniCheckbox: this.page.locator('label:has-text("Kiinni")'),
      },
      hakuaika: {
        ...baseTableLocators("hakuaika"),
        toggle: this.page.locator('button:has-text("Hakuaika")'),
        clear: this.page.locator('[aria-label="Tyhjennä hakuaika rajaukset"]'),
        hakuaikaStart: this.page.locator(
          '[aria-label="Rajaa avustushaut niihin joiden hakuaika alkaa päivämääränä tai sen jälkeen"] input'
        ),
        hakuaikaEnd: this.page.locator(
          '[aria-label="Rajaa avustushaut niihin joiden hakuaika päättyy päivämääränä tai sitä ennen"] input'
        ),
      },
      paatos: baseTableLocators("paatos"),
      valiselvitykset: baseTableLocators("valiselvitykset"),
      loppuselvitykset: baseTableLocators("loppuselvitykset"),
      vastuuvalmistelija: baseTableLocators("valmistelija"),
      muutoshakukelpoinen: baseTableLocators("muutoshakukelpoinen"),
      maksatukset: baseTableLocators("maksatukset"),
      kayttoaikaAlkaa: baseTableLocators("kayttoaikaAlkaa"),
      kayttoaikaPaattyy: baseTableLocators("kayttoaikaPaattyy"),
      jaossaOllutSumma: baseTableLocators("jaossaOllutSumma"),
      maksettuSumma: baseTableLocators("maksettuSumma"),
      budjetti: baseTableLocators("budjetti"),
    };
  }
}
