import { Page } from '@playwright/test'

import { VIRKAILIJA_URL } from './constants'

export async function markAvustushakuAsMuutoshakukelvoton(
  page: Page,
  avustushakuId: number
): Promise<void> {
  await page.request.post(
    `${VIRKAILIJA_URL}/api/test/avustushaku/${avustushakuId}/set-muutoshakukelpoisuus`,
    { data: { muutoshakukelpoinen: false } }
  )
}

export async function addMigratedTalousarviotili(
  page: Page,
  talousarviotili: string
): Promise<void> {
  await page.request.post(`${VIRKAILIJA_URL}/api/test/add-migrated-talousarviotili`, {
    data: { talousarviotili },
  })
}
