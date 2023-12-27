import { expect, test } from '@playwright/test'
import { expectToBeDefined } from '../../utils/util'
import { twoAcceptedHakemusTest } from '../../fixtures/twoHakemusTest'
import { downloadHallinnoiAvustuksiaExcel } from '../../utils/downloadExcel'
import { expectToFindRowWithValuesInSheet, SheetRow } from '../../utils/sheet'
import { JotpaTest } from '../../fixtures/JotpaTest'
import muutoshakemusEnabledHakuLomakeJson from '../../fixtures/prod.hakulomake.json'
import moment from 'moment'

const ophTest = twoAcceptedHakemusTest.extend({
  hakuProps: ({ hakuProps }, use) =>
    use({
      ...hakuProps,
      hallinoiavustuskiaRegisterNumber: 'va-oph-2023-6',
    }),
})

ophTest.use({
  acceptDownloads: true,
})

const SheetName = 'VA'

test.describe('OPH', () => {
  ophTest(
    'Hallinnoiavustuksia.fi Excel export',
    async ({ page, avustushakuID, acceptedHakemukset, hakuProps }) => {
      expectToBeDefined(avustushakuID)
      expectToBeDefined(acceptedHakemukset)
      const workbook = await downloadHallinnoiAvustuksiaExcel(page, avustushakuID)
      expect(workbook.SheetNames).toMatchObject([SheetName])
      const sheet = workbook.Sheets[SheetName]
      const vireilletuloPvm = moment().format('DD.MM.YYYY')
      await twoAcceptedHakemusTest.step('produces correct column labels', async () => {
        const expectedRows: SheetRow[] = [
          {
            A1: 'valtionapuviranomainen',
            B1: 'avustushakuAsianumero',
            C1: 'avustushakuNimi',
            D1: 'avustushakuAvustuslaji',
            E1: 'avustushakuAlkaaPvm',
            F1: 'avustushakuPaattyyPvm',
            G1: 'avustushakuURL',
            H1: 'avustusasiaAsianumero',
            I1: 'avustusasiaVireilletuloPvm',
            J1: 'avustusasiaKieli',
            K1: 'avustusasiaVireillepanijaHenkiloTunnus',
            L1: 'avustusasiaVireillepanijaHenkiloNimi',
            M1: 'avustusasiaVireillepanijaYhteisoTunnus',
            N1: 'avustusasiaVireillepanijaYhteisoNimi',
            O1: 'avustushakemusHaettuKayttotarkoitus',
            P1: 'avustushakemusHaettuAvustus',
            Q1: 'avustushakemusAlueKunnat',
            R1: 'avustushakemusAlueMaakunnat',
            S1: 'avustushakemusAlueHyvinvointialueet',
            T1: 'avustushakemusAlueValtiot',
            U1: 'avustuspaatosPvm',
            V1: 'avustuspaatosPerustelu',
            W1: 'avustuspaatosTyyppi',
            X1: 'avustuspaatosMyonnettyAvustus',
            Y1: 'avustuspaatosHyvaksyttyKayttotarkoitus',
            Z1: 'avustuspaatosKayttoaikaAlkaaPvm',
            AA1: 'avustuspaatosKayttoaikaPaattyyPvm',
            AB1: 'avustuspaatosMaksettuAvustus',
            AC1: 'piilotaKayttotarkoitus',
            AD1: 'piilotaVireillepanija',
          },
          {
            A2: 'OPH',
            B2: 'va-oph-2023-6',
            H2: `1/${hakuProps.registerNumber}`,
            I2: vireilletuloPvm,
            J2: 'fi',
          },
          {
            A3: 'OPH',
            B3: 'va-oph-2023-6',
            H3: `2/${hakuProps.registerNumber}`,
            I3: vireilletuloPvm,
            J3: 'fi',
          },
        ]
        expectToFindRowWithValuesInSheet(sheet, expectedRows)
      })
    }
  )
})

const Jotpa = JotpaTest.extend<{ hakulomake: string }>({
  hakulomake: JSON.stringify(muutoshakemusEnabledHakuLomakeJson),
  answers: ({ answers }, use) => use({ ...answers, lang: 'sv' }),
  hakuProps: ({ hakuProps }, use) =>
    use({
      ...hakuProps,
      hallinoiavustuskiaRegisterNumber: 'va-oph-2023-7',
    }),
})

test.describe('JOTPA', () => {
  Jotpa(
    'Hallinnoiavustuksia.fi Excel export',
    async ({ page, acceptedHakemus, hakuProps, avustushakuID }) => {
      expectToBeDefined(acceptedHakemus)
      const workbook = await downloadHallinnoiAvustuksiaExcel(page, avustushakuID)
      const vireilletuloPvm = moment().format('DD.MM.YYYY')
      const expectedRows: SheetRow[] = [
        {
          A2: `OPH`,
          B2: 'va-oph-2023-7',
          H2: `1/${hakuProps.registerNumber}`,
          I2: vireilletuloPvm,
          J2: 'sv',
        },
      ]
      const sheet = workbook.Sheets[SheetName]
      expectToFindRowWithValuesInSheet(sheet, expectedRows)
    }
  )
})
