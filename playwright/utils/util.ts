import {Page} from "playwright";
import {expect} from "@playwright/test"
import moment from "moment";

export interface VaCodeValues {
  operationalUnit: string
  project: string
  operation: string
}


export async function expectQueryParameter(page: Page, paramName: string): Promise<string> {
  const value = await page.evaluate(param => (new URLSearchParams(window.location.search)).get(param), paramName)
  if (!value) throw Error(`Expected page url '${page.url()}' to have query parameter '${paramName}'`)
  return value
}

export async function clickElementWithText(page: Page, elementType: string, text: string) {
  const selector = `${elementType}:has-text("${text}")`
  const handle = await page.waitForSelector(selector)
  await handle.click()
  return handle
}

function waitForElementWithAttribute(page: Page, attribute: string, attributeValue: string, text: string) {
  return page.waitForSelector(`[${attribute}='${attributeValue}']:has-text("${text}")`, {timeout: 5000})
  // return await page.waitForXPath(`//*[@${attribute}='${attributeValue}'][contains(., '${text}')]`, waitForSelectorOptions)
}

export function waitForDropdownElementWithText(page: Page, text: string) {
  return waitForElementWithAttribute(page, 'role', 'option', text)
}

export async function waitForClojureScriptLoadingDialogHidden(page: Page) {
  return page.waitForSelector("[data-test-id=loading-dialog]", { state: 'detached' })
}

export function expectToBeDefined<T>(val: T): asserts val is NonNullable<T> {
  expect(val).toBeDefined();
}

export async function textContent(page: Page, selector: string) {
  const handle = await page.waitForSelector(selector)
  return await handle.textContent()
}

export function log(...args: any[]) {
  console.log(moment().format('YYYY-MM-DD HH:mm:ss.SSSS'), ...args)
}

export async function getExistingBudgetTableCells(page: Page, budgetRowSelector:string) {
  await page.waitForSelector(budgetRowSelector)
  return await page.$$eval(budgetRowSelector, elements => {
    return elements.map(elem => ({
      description: elem.querySelector('.description')?.textContent ?? '',
      amount: elem.querySelector(`.existingAmount`)?.textContent ?? ''
    }))
  })
}

export async function getChangedBudgetTableCells(page: Page, budgetRowSelector: string) {
  await page.waitForSelector(budgetRowSelector)
  return await page.$$eval(budgetRowSelector, elements => {
    return elements.map(elem => ({
      description: elem.querySelector('.description')?.textContent ?? '',
      amount: elem.querySelector(`.changedAmount`)?.textContent ?? ''
    }))
  })
}
