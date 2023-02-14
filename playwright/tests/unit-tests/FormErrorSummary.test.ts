import _ from "lodash";

import JsUtil from "../../../soresu-form/web/JsUtil";
import FormErrorSummary from "../../../soresu-form/web/form/component/FormErrorSummary.jsx";
import TestUtil from "./TestUtil";
import { test, expect } from "@playwright/test";
test.describe("Form full of errors", function () {
  const formContent = TestUtil.testFormJson();
  let validationErrors: any = {};

  test.beforeEach(function () {
    validationErrors = _(
      JsUtil.flatFilter(
        formContent,
        (x: any) => !_.isUndefined(x.id) && x.fieldClass === "formField"
      )
    )
      .map((field: any) => {
        return { id: field.id, errors: [{ error: "required" }] };
      })
      .keyBy("id")
      .mapValues("errors")
      .value();
  });

  test("gets its summary calculated", function () {
    const fieldsErrorsAndClosestParents =
      FormErrorSummary.resolveFieldsErrorsAndClosestParents(
        validationErrors,
        formContent
      );
    expect(fieldsErrorsAndClosestParents).toHaveLength(54);
    const privateFinancingIncomeEntry = JsUtil.flatFilter(
      fieldsErrorsAndClosestParents,
      (n: any) => {
        return (
          n && n.field && n.field.id === "private-financing-income-row.amount"
        );
      }
    )[0];
    expect(privateFinancingIncomeEntry.closestParent.id).toEqual(
      "private-financing-income-row"
    );
    expect(privateFinancingIncomeEntry.errors[0].error).toEqual("required");
  });
});
