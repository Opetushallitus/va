import { expect, test } from "@playwright/test";
import VaTraineeDayUtil from "../../../soresu-form/web/va/VaTraineeDayUtil";

test.describe.parallel("VA trainee day utilities", () => {
  test.describe("composing total values", function () {
    test("returns total for koulutettavapäivä scope type", function () {
      expect(VaTraineeDayUtil.composeTotal("1,5", "3", "kp")).toEqual("4,5");
    });

    test("returns total for opintopiste scope type", function () {
      expect(VaTraineeDayUtil.composeTotal("1,5", "3", "op")).toEqual("20,3");
    });

    test("returns zero when scope is invalid", function () {
      expect(VaTraineeDayUtil.composeTotal("", "2", "op")).toEqual("0");
    });
  });

  test("finds subfield by id", function () {
    const subfield = {
      key: "koulutusosiot.koulutusosio-2.koulutettavapaivat.scope-type",
      value: "kp",
      fieldType: "radioButton",
    };

    const field = {
      key: "koulutusosiot.koulutusosio-2.koulutettavapaivat",
      value: [
        {
          key: "koulutusosiot.koulutusosio-2.koulutettavapaivat.person-count",
          value: "20",
          fieldType: "textField",
        },
        {
          key: "koulutusosiot.koulutusosio-2.koulutettavapaivat.scope",
          value: "5",
          fieldType: "textField",
        },
        subfield,
        {
          key: "koulutusosiot.koulutusosio-2.koulutettavapaivat.total",
          value: "100,0",
          fieldType: "textField",
        },
      ],
      fieldType: "vaTraineeDayCalculator",
    };

    const found = VaTraineeDayUtil.findSubfieldById(
      field.value,
      "koulutusosiot.koulutusosio-2.koulutettavapaivat",
      "scope-type"
    );

    expect(found).toEqual(subfield);
  });

  test.describe("summing subfield values", function () {
    const answers = [
      {
        key: "koulutusosiot.koulutusosio-1.koulutettavapaivat",
        value: [
          {
            key: "koulutusosiot.koulutusosio-1.koulutettavapaivat.person-count",
            value: "36",
            fieldType: "textField",
          },
          {
            key: "koulutusosiot.koulutusosio-1.koulutettavapaivat.scope",
            value: "4",
            fieldType: "textField",
          },
          {
            key: "koulutusosiot.koulutusosio-1.koulutettavapaivat.scope-type",
            value: "kp",
            fieldType: "radioButton",
          },
          {
            key: "koulutusosiot.koulutusosio-1.koulutettavapaivat.total",
            value: "144,0",
            fieldType: "textField",
          },
        ],
        fieldType: "vaTraineeDayCalculator",
      },
      {
        key: "koulutusosiot.koulutusosio-4.koulutettavapaivat",
        value: [
          {
            key: "koulutusosiot.koulutusosio-4.koulutettavapaivat.person-count",
            value: "37",
            fieldType: "textField",
          },
          {
            key: "koulutusosiot.koulutusosio-4.koulutettavapaivat.scope",
            value: "3",
            fieldType: "textField",
          },
          {
            key: "koulutusosiot.koulutusosio-4.koulutettavapaivat.scope-type",
            value: "op",
            fieldType: "radioButton",
          },
          {
            key: "koulutusosiot.koulutusosio-4.koulutettavapaivat.total",
            value: "499,5",
            fieldType: "textField",
          },
        ],
        fieldType: "vaTraineeDayCalculator",
      },
    ];

    test("sums subfields by subfield type", function () {
      expect(
        VaTraineeDayUtil.sumSubfieldValues(answers, "person-count")
      ).toEqual(73);
      expect(VaTraineeDayUtil.sumSubfieldValues(answers, "total")).toEqual(
        643.5
      );
    });

    test("treats non-number as zero", function () {
      expect(VaTraineeDayUtil.sumSubfieldValues(answers, "scope-type")).toEqual(
        0
      );
    });
  });

  test.describe("collecting calculator specifications", function () {
    const makeFormSpec = (calcSpecs: Record<string, string>[]) =>
      calcSpecs.map(
        ({
          growingFieldsetId,
          growingFieldsetChildId,
          calcFieldId,
          fiLabel,
        }) => {
          return {
            id: growingFieldsetId,
            children: [
              {
                id: growingFieldsetChildId,
                children: [
                  {
                    id: calcFieldId,
                    label: {
                      fi: fiLabel,
                    },
                    fieldType: "vaTraineeDayCalculator",
                    fieldClass: "formField",
                  },
                ],
                fieldType: "growingFieldsetChild",
                fieldClass: "wrapperElement",
              },
            ],
            fieldType: "growingFieldset",
            fieldClass: "wrapperElement",
          };
        }
      );

    const makeAnswers = (keyIds: string[]) => {
      return {
        value: keyIds.map((keyId) => {
          return {
            key: keyId,
            value: [
              {
                key: keyId + ".person-count",
                value: "20",
                fieldType: "textField",
              },
              {
                key: keyId + ".scope",
                value: "5",
                fieldType: "textField",
              },
              {
                key: keyId + ".scope-type",
                value: "kp",
                fieldType: "radioButton",
              },
              {
                key: keyId + ".total",
                value: "100,0",
                fieldType: "textField",
              },
            ],
            fieldType: "vaTraineeDayCalculator",
          };
        }),
      };
    };

    test("copies calculator specification from first growing fieldset for each answer key", function () {
      const formSpec = makeFormSpec([
        {
          growingFieldsetId: "koulutusosiot",
          growingFieldsetChildId: "koulutusosio-1",
          calcFieldId: "koulutusosiot.koulutusosio-1.koulutettavapaivat",
          fiLabel: "Koulutusosio",
        },
      ]);

      const answers = makeAnswers([
        "koulutusosiot.koulutusosio-1.koulutettavapaivat",
        "koulutusosiot.koulutusosio-2.koulutettavapaivat",
      ]);

      const specs = VaTraineeDayUtil.collectCalculatorSpecifications(
        formSpec,
        answers
      );

      expect(specs).toEqual([
        {
          id: "koulutusosiot.koulutusosio-1.koulutettavapaivat",
          label: {
            fi: "Koulutusosio",
          },
          fieldType: "vaTraineeDayCalculator",
          fieldClass: "formField",
        },
        {
          id: "koulutusosiot.koulutusosio-2.koulutettavapaivat",
          label: {
            fi: "Koulutusosio",
          },
          fieldType: "vaTraineeDayCalculator",
          fieldClass: "formField",
        },
      ]);
    });

    test("collects calculator specifications from different growing fieldsets", function () {
      const formSpec = makeFormSpec([
        {
          growingFieldsetId: "alphakoulutusosiot",
          growingFieldsetChildId: "alphakoulutusosio-1",
          calcFieldId:
            "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat",
          fiLabel: "Koulutusosio Alpha",
        },
        {
          growingFieldsetId: "betakoulutusosiot",
          growingFieldsetChildId: "betakoulutusosio-1",
          calcFieldId:
            "betakoulutusosiot.betakoulutusosio-1.koulutettavapaivat",
          fiLabel: "Koulutusosio Beta",
        },
      ]);

      const answers = makeAnswers([
        "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat",
        "betakoulutusosiot.betakoulutusosio-1.koulutettavapaivat",
        "betakoulutusosiot.betakoulutusosio-2.koulutettavapaivat",
      ]);

      const specs = VaTraineeDayUtil.collectCalculatorSpecifications(
        formSpec,
        answers
      );

      expect(specs).toEqual([
        {
          id: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat",
          label: {
            fi: "Koulutusosio Alpha",
          },
          fieldType: "vaTraineeDayCalculator",
          fieldClass: "formField",
        },
        {
          id: "betakoulutusosiot.betakoulutusosio-1.koulutettavapaivat",
          label: {
            fi: "Koulutusosio Beta",
          },
          fieldType: "vaTraineeDayCalculator",
          fieldClass: "formField",
        },
        {
          id: "betakoulutusosiot.betakoulutusosio-2.koulutettavapaivat",
          label: {
            fi: "Koulutusosio Beta",
          },
          fieldType: "vaTraineeDayCalculator",
          fieldClass: "formField",
        },
      ]);
    });
  });

  test("finds growing fieldset child by nested calculator id", function () {
    const growingFieldsetChild = {
      key: "alphakoulutusosio-1",
      value: [
        {
          key: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat",
          value: [
            {
              key: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat.person-count",
              value: "51",
              fieldType: "textField",
            },
            {
              key: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat.scope",
              value: "11",
              fieldType: "textField",
            },
            {
              key: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat.scope-type",
              value: "kp",
              fieldType: "radioButton",
            },
            {
              key: "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat.total",
              value: "561,0",
              fieldType: "textField",
            },
          ],
          fieldType: "vaTraineeDayCalculator",
        },
      ],
      fieldType: "growingFieldsetChild",
    };

    const answers = [
      {
        key: "type-of-organization",
        value: "kansanopisto",
        fieldType: "radioButton",
      },
      {
        key: "alphakoulutusosiot",
        value: [growingFieldsetChild],
        fieldType: "growingFieldset",
      },
    ];

    const found = VaTraineeDayUtil.findGrowingFieldsetChildByCalculatorId(
      answers,
      "alphakoulutusosiot.alphakoulutusosio-1.koulutettavapaivat"
    );

    expect(found).toEqual(growingFieldsetChild);
  });
});
