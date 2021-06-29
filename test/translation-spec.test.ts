import { Browser, Page } from 'puppeteer'
import {
  BudgetAmount,
  clickElement,
  getElementInnerText,
  getFirstPage,
  log,
  mkBrowser,
  navigate,
  setPageErrorConsoleLogger,
  createRandomHakuValues,
  navigateToPaatos,
  Budget,
  waitUntilMinEmails,
  getAcceptedPäätösEmails,
  lastOrFail,
  Email,
  getHakemusTokenAndRegisterNumber,
  HAKIJA_URL,
  setCalendarDateForSelector,
  MailWithLinks,
  clickElementWithText,
} from './test-util'
import {
  Answers,
  fillAndSendMuutoshakemusDecision,
  navigateToLatestMuutoshakemusPaatos,
  parseMuutoshakemusPaatosFromEmails,
  ratkaiseBudjettimuutoshakemusEnabledAvustushakuButOverwriteMenoluokat,
} from './muutoshakemus/muutospaatosprosessi-util'
import {
  navigateToHakijaMuutoshakemusPage,
  navigateToMuutoshakemusAndApplyForJatkoaikaAndBudgetChanges,
} from './muutoshakemus/muutoshakemus-util'

import moment from 'moment'
import { openPaatosPreview } from './hakemuksen-arviointi-util'

jest.setTimeout(400_000)

export const answers: Answers = {
  contactPersonEmail: "erik.eksampletten@example.com",
  contactPersonName: "Erik Eksampletten",
  contactPersonPhoneNumber: "555",
  projectName: "Badet pengaren i Ankdammen",
  lang: 'sv'
}

export const budget: Budget = {
  amount: {
    personnel: '300',
    material: '420',
    equipment: '1337',
    'service-purchase': '5318008',
    rent: '69',
    steamship: '0',
    other: '9000',
  },
  description: {
    personnel: 'tjänare',
    material: 'båterna',
    equipment: 'champagne visp',
    'service-purchase': 'servitörena',
    rent: 'villa',
    steamship: 'ånga',
    other: 'Kalle Anka',
  },
  selfFinancing: '1',
}

const swedishBudgetRowNames = [
  'Personalkostnader',
  'Material, utrustning och varor',
  'Anskaffning av utrustning',
  'Tjänster',
  'Hyror',
  'Resekostnader',
  'Övriga kostnader'
]

describe('Translations', () => {
  let browser: Browser
  let page: Page

  beforeEach(() => {
    log(`Starting test: ${expect.getState().currentTestName}`)
  })

  beforeAll(async () => {
    browser = await mkBrowser()
    page = await getFirstPage(browser)
    setPageErrorConsoleLogger(page)
  })

  afterEach(() => {
    log(`Finished test: ${expect.getState().currentTestName}`)
  })

  afterAll(async () => {
    await page.close()
    await browser.close()
  })

  describe('When avustushaku has been created and swedish hakemus has been submitted and approved', () => {
    let avustushakuID: number
    let hakemusID: number
    let userKey: string
    const haku = createRandomHakuValues()

    beforeAll(async () => {
      const { avustushakuID: avustushakuId, hakemusID: hakemusId, userKey: userkey } = await ratkaiseBudjettimuutoshakemusEnabledAvustushakuButOverwriteMenoluokat(page, haku, answers, budget)
      avustushakuID = avustushakuId
      hakemusID = hakemusId
      userKey = userkey
    })

    describe('And hakija gets an email', () => {
      let email: Email
      beforeAll(async () => {
        const emails = await waitUntilMinEmails(getAcceptedPäätösEmails, 1, hakemusID)
        email = lastOrFail(emails)
      })

      it('päätös email is in swedish', async () => {
        const { token, 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
        expect(email.formatted).toBe(`${registerNumber} - ${answers.projectName}

${haku.avustushakuName} på svenska

Ni kan granska understödsbeslutet via denna länk: ${HAKIJA_URL}/paatos/avustushaku/${avustushakuID}/hakemus/${userKey}

Understödsmottagaren ska följa de villkor och begränsningar som beskrivs i understödsbeslutet och i dess bilagor.

Om ni tar emot understödet i enlighet med beslutet, kan ni påbörja projektet. Understödsbeloppet betalas senast den dag som anges i beslutet.

Om ni inte tar emot understödet i enlighet med beslutet, ska ni meddela om detta till Utbildningsstyrelsen inom den tidsfrist som anges i beslutet. Anmälan ska göras i statsunderstödssystemet via denna länk: ${HAKIJA_URL}/avustushaku/${avustushakuID}/nayta?avustushaku=${avustushakuID}&hakemus=${userKey}&lang=sv&preview=true&token=${token}&refuse-grant=true&modify-application=false


Om det uppstår förändringar som inverkar på användningen av statsunderstödet ska man genast göra en skriftlig ändringsansökan. Man ska framföra tillräckliga motiveringar för ändringarna som ingår i ändringsansökan. I oklara situationer kan understödsmottagaren vara i kontakt med kontaktpersonen som anges i understödsbeslutet innan en ändringsansökan görs.

Understödsmottagaren ansvarar för att kontaktuppgifterna till den person som angetts som kontaktperson i statsunderstödssystemet alltid är uppdaterade. Ni kan göra en ändringsansökan samt byta ut kontaktpersonen och göra ändringar i hens kontaktuppgifter under hela projektperiodens gång via följande länk:
${HAKIJA_URL}/muutoshakemus?lang=sv&user-key=${userKey}&avustushaku-id=${avustushakuID}

Begäranden om redovisningar och andra meddelanden som riktas till projektet skickas från adressen no-reply@valtionavustukset.oph.fi. De skickas både till projektets kontaktperson och till den officiella e-postadress som den sökande har angett.

Mottagaren av understöd ska spara detta meddelande och länkarna som ingår i meddelandet.

Vid behov ges närmare information av den person som angetts som kontaktperson i understödsbeslutet.

Utbildningsstyrelsen
Hagnäskajen 6
PB 380, 00531 Helsingfors
telefon 029 533 1000
fornamn.efternamn@oph.fi
`)

      })
    })

    describe('And hakija navigates to päätös', () => {
      beforeAll(async () => {
        await navigateToPaatos(page, hakemusID)
      })

      it('päätös header title is in swedish', async () => {
        const title = await getElementInnerText(page, '[data-test-id="paatos-header-title"]')
        expect(title).toContain('BESLUT')
      })

      it('päätös title is in swedish', async () => {
        const title = await getElementInnerText(page, '[data-test-id="paatos-title"]')
        expect(title).toBe('BESLUT')
      })

      it('päätös accepted title is in swedish', async () => {
        const title = await getElementInnerText(page, '[data-test-id="paatos-accepted-title"]')
        expect(title).toBe('Utbildningsstyrelsen har beslutat att bevilja statsunderstöd till projektet')
      })

      it('lisätietoja title is in swedish', async () => {
        const title = await getElementInnerText(page, '[data-test-id="lisatietoja-title"]')
        expect(title).toBe('MER INFORMATION')
      })
    })

    describe('And hakija navigates to muutoshakemus page', () => {
      beforeAll(async () => {
        await navigateToHakijaMuutoshakemusPage(page, hakemusID)
      })

      it('register number title is in swedish', async () => {
        const title = await getElementInnerText(page, '.muutoshakemus__register-number')
        expect(title).toContain('Ärendenummer')
      })

      it('contact person title is in swedish', async () => {
        const title = await getElementInnerText(page, 'label[for="muutoshakemus__contact-person"]')
        expect(title).toBe('Kontaktperson')
      })

      it('contact person email title is in swedish', async () => {
        const title = await getElementInnerText(page, 'label[for="muutoshakemus__email"]')
        expect(title).toBe('Kontaktpersonens e-postadress')
      })

      it('contact person number title is in swedish', async () => {
        const title = await getElementInnerText(page, 'label[for="muutoshakemus__phone"]')
        expect(title).toBe('Kontaktpersonens telefonnummer')
      })

      it('jatkoaika title is in swedish', async () => {
        const title = await getElementInnerText(page, 'label[for="checkbox-haenKayttoajanPidennysta"]')
        expect(title).toBe('Jag ansöker om förlängd användningstid för statsunderstödet')
      })

      it('budget change title is in swedish', async () => {
        const title = await getElementInnerText(page, 'label[for="checkbox-haenMuutostaTaloudenKayttosuunnitelmaan"]')
        expect(title).toBe('Jag ansöker om ändringar i projektets budget')
      })

      describe('When user clicks "Haen pidennystä avustuksen käyttöajalle"', () => {
        beforeAll(async () => {
          await clickElement(page, '#checkbox-haenKayttoajanPidennysta')
        })

        it('existing date title is in swedish', async () => {
          const title = await getElementInnerText(page, '[data-test-id="jatkoaika-title-existing"]')
          expect(title).toBe('NUVARANDE SISTA ANVÄNDNINGDAG')
        })

        it('new date title is in swedish', async () => {
          const title = await getElementInnerText(page, '[data-test-id="jatkoaika-title-new"]')
          expect(title).toBe('NY SISTA ANVÄNDNINGSDAG')
        })

        it('perustelut title is in swedish', async () => {
          const title = await getElementInnerText(page, 'label[for="perustelut-kayttoajanPidennysPerustelut"]')
          expect(title).toBe('Motivering')
        })

        it('error message is in swedish', async () => {
          const title = await getElementInnerText(page, '.muutoshakemus__perustelut .muutoshakemus__error-message')
          expect(title).toBe('Obligatorisk uppgift')
        })

        it('calendar component is in Swedish', async () => {
          await setCalendarDateForSelector(page, '13.05.2021', '[name=haettuKayttoajanPaattymispaiva]')
          await clickElement(page, 'button[title="Select date"]')
          const monthLabel = await page.waitForXPath('//button[contains(@id,"_calendar_label")]')
          const monthName = (await page.evaluate(button => button.textContent, monthLabel)).trim()
          expect(monthName).toBe('maj 2021')
        })
      })

      describe('When user clicks "Haen muutosta hankkeen talouden käyttösuunnitelmaan"', () => {
        beforeAll(async () => {
          await clickElement(page, '#checkbox-haenMuutostaTaloudenKayttosuunnitelmaan')
        })

        it('Current budget title is in swedish', async () => {
          const title = await getElementInnerText(page, '.currentBudget')
          expect(title).toBe('Nuvarande budget')
        })

        it('Modified new budget title is in swedish', async () => {
          const title = await getElementInnerText(page, '.modifiedBudget')
          expect(title).toBe('Ny budget')
        })

        it('Total sum title is in swedish', async () => {
          const title = await getElementInnerText(page, '[data-test-id="expenses-total-title"]')
          expect(title).toBe('Sammanlagt')
        })

        it('Reasoning title is in swedish', async () => {
          const title = await getElementInnerText(page, 'label[for="perustelut-taloudenKayttosuunnitelmanPerustelut"]')
          expect(title).toBe('Motivering')
        })

        it('Budget rows are in Swedish', async () => {
          const budgetRows = await page.$$eval('[data-test-id=meno-input-row]', elements => {
            return elements.map(elem => elem.querySelector('.description')?.textContent || '')
          })
          expect(budgetRows.sort()).toEqual(swedishBudgetRowNames.sort())
        })
      })

      describe('And hakija submits muutoshakemus #1 with jatkoaika and budget changes', () => {
        const muutoshakemus1Budget = {
          ...budget.amount,
          personnel: '299',
          material: '421',
        }

        const muutoshakemus1Perustelut = 'Ska få ta bort något akut .... koda något om något ois ta bort bit sit mo'

        const jatkoaika = {
          jatkoaika: moment(new Date()).add(1, 'days').locale('fi'),
          jatkoaikaPerustelu: 'Dubbel dubbel-laa'
        }

        beforeAll(async () => {
          await navigateToMuutoshakemusAndApplyForJatkoaikaAndBudgetChanges(page, hakemusID, jatkoaika, muutoshakemus1Budget, muutoshakemus1Perustelut)
        })

        it('perustelut title is displayed to hakija in swedish', async () => {
          const perustelut = await getElementInnerText(page, '[data-test-id="reasoning-title"')
          expect(perustelut).toBe('Den sökandes motiveringar')
        })

        it('current budged title is displayed to hakija in swedish', async () => {
          const perustelut = await getElementInnerText(page, '.currentBudget')
          expect(perustelut).toBe('Nuvarande budget')
        })

        it('haetut muutokset title is displayed to hakija in swedish', async () => {
          const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="budget-change-title"]')
          expect(currentBudgetHeader).toEqual('Den ansökta nya budgeten')
        })

        describe('And virkailija navigates to muutoshakemus tab', () => {
          const acceptedBudget: BudgetAmount = {
            personnel: '1301',
            material: '1421',
            equipment: '2338',
            'service-purchase': '5312007',
            rent: '1068',
            steamship: '1000',
            other: '9999',
          }

          beforeAll(async () => {
            await navigate(page, `/avustushaku/${avustushakuID}/hakemus/${hakemusID}/`)
            await clickElement(page, 'span.muutoshakemus-tab')
          })

          it('current budget title is in finnish', async () => {
            const title = await getElementInnerText(page, '.currentBudget')
            expect(title).toBe('Voimassaoleva budjetti')
          })

          it('applied budget title is in finnish', async () => {
            const title = await getElementInnerText(page, '[data-test-id="budget-change-title"]')
            expect(title).toBe('Haettu uusi budjetti')
          })

          it('reasoning title is in finnish', async () => {
            const title = await getElementInnerText(page, '[data-test-id="muutoshakemus-reasoning-title"]')
            expect(title).toBe('Hakijan perustelut')
          })

          describe('preview muutoshakemus päätös in swedish', () => {
            beforeAll(async () => {
              await openPaatosPreview(page)
            })

            afterAll(async () => {
              await clickElementWithText(page, 'button', 'Sulje')
            })

            it('modal title is still in finnish', async () => {
              expect(await getElementInnerText(page, '.hakemus-details-modal__title-row > span'))
                .toBe('ESIKATSELU')
            })

            it('päätös preview content is in swedish', async () => {
              expect(await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-title"]'))
                .toBe('BESLUT')
            })
          })

          describe('And accepts muutoshakemus #1 changes', () => {
            beforeAll(async () => {
              await navigate(page, `/avustushaku/${avustushakuID}/hakemus/${hakemusID}/`)
              await clickElement(page, 'span.muutoshakemus-tab')
              await fillAndSendMuutoshakemusDecision(page, 'accepted_with_changes', '01.01.2099', acceptedBudget)
            })

            describe('And hakija receives an email', () => {
              let email: MailWithLinks

              beforeAll(async () => {
                email = await parseMuutoshakemusPaatosFromEmails(hakemusID)
              })

              it('päätös email subject is in swedish', () => {
                expect(email.subject).toBe('Automatiskt meddelande: Er ändringsansökan har behandlats - Länk till beslutet')
              })

              it(`muutoshakemus päätös is sent to hakija's address`, () => {
                expect(email["to-address"]).toContain(answers.contactPersonEmail)
              })

              it('muutoshakemus päätös email is in swedish', async () => {
                const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
                expect(email.formatted).toBe(`Bästa mottagare,

er ändringsansökan har behandlats.

Projekt: ${registerNumber} - ${answers.projectName}

Ni kan granska beslutet via denna länk:
${email.linkToMuutoshakemusPaatos}

Ni kan vid behov göra en ny ändringsansökan via denna länk:
${HAKIJA_URL}/muutoshakemus?lang=sv&user-key=${userKey}&avustushaku-id=${avustushakuID}

Bilaga: Rättelseyrkande

Mera information ges vid behov av kontaktpersonen som anges i understödsbeslutet.

Hälsningar,
_ valtionavustus

Utbildningsstyrelsen
Hagnäskajen 6
PB 380, 00531 Helsingfors

telefon 029 533 1000
fornamn.efternamn@oph.fi

`)
              })
            })

            describe('And hakija navigates to muutoshakemus page', () => {
              beforeAll(async () => {
                await navigateToHakijaMuutoshakemusPage(page, hakemusID)
              })

              it('Muutoshakemus title states in swedish that it has been approved with changes', async () => {
                const text = await getElementInnerText(page, '[data-test-id="paatos-status-text"')
                expect(text).toBe('Hyväksytty muutettuna')
              })

              it('old budget title is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '.currentBudget')
                expect(currentBudgetHeader).toEqual('Den tidigare budgeten')
              })

              it('new budget is shown as approved in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="budget-change-title"]')
                expect(currentBudgetHeader).toEqual('Godkänd ny budget')
              })
            })

            describe('And hakija navigates to muutoshakemus päätös page', () => {
              beforeAll(async () => {
                await navigateToLatestMuutoshakemusPaatos(page, hakemusID)
              })

              it('Decision title is shown in swedish', async () => {
                const title = await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-title"]')
                expect(title).toEqual('BESLUT')
              })

              it('Asia title is shown in swedish', async () => {
                const title = await getElementInnerText(page, '[data-test-id="muutospaatos-asia-title"]')
                expect(title).toEqual('Ärende')
              })

              it('Decision section title is shown in swedish', async () => {
                const title = await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-section-title"]')
                expect(title).toEqual('Beslut')
              })

              it.skip('Decision is shown in swedish', async () => {
                const title = await getElementInnerText(page, '[data-test-id="paatos-paatos"]')
                expect(title).toEqual('Och samma på svenska! - translations have not been provided')
              })

              it('Accepted changes title is shown in swedish', async () => {
                const title = await getElementInnerText(page, '[data-test-id="accepted-changes-title"]')
                expect(title).toEqual('Godkända ändringar')
              })

              it('current budget title is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '.currentBudget')
                expect(currentBudgetHeader).toEqual('Den tidigare budgeten')
              })

              it('approved budget title is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="budget-change-title"]')
                expect(currentBudgetHeader).toEqual('Godkänd ny budget')
              })

              it('päätöksen perustelut is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-perustelut-title"]')
                expect(currentBudgetHeader).toEqual('Motiveringar för beslutet')
              })

              it('päätöksen tekijä is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-tekija-title"]')
                expect(currentBudgetHeader).toEqual('Har godkänts av')
              })

              it('lisätietoja title is shown in swedish', async () => {
                const currentBudgetHeader = await getElementInnerText(page, '[data-test-id="muutoshakemus-paatos-lisatietoja-title"]')
                expect(currentBudgetHeader).toEqual('Mer information')
              })

              it('budget change is mentioned in the info section', async () => {
                const budgetChangeText = await getElementInnerText(page, '[data-test-id="budget-change"]')
                expect(budgetChangeText).toEqual('Ändringsansökan som gäller projektets budget')
              })

              it('Budget rows are in Swedish', async () => {
                const budgetRows = await page.$$eval('[data-test-id=meno-input-row]', elements => {
                  return elements.map(elem => elem.querySelector('.description')?.textContent || '')
                })
                expect(budgetRows.sort()).toEqual(swedishBudgetRowNames.sort())
              })
            })
          })
        })
      })
    })
  })
})
