import React, { ChangeEvent, useEffect, useState } from "react";

import { Maksatus } from "./Maksatukset";

type PaymentsTableProps = {
  payments?: Maksatus[];
};

type SortKey =
  | "pitkaviite"
  | "paymentstatus"
  | "organization-name"
  | "project-name"
  | "payment-sum"
  | "lkp-account"
  | "takp-account"
  | "bank-iban"
  | "accounting";

type Filter = {
  [k in SortKey]?: string;
};

const paymentStatusTranslation = {
  created: "Luotu",
  waiting: "Odottaa",
  sent: "Lähetetty",
  paid: "Maksettu",
};

const filterBy = (filter: Filter) => (p: Maksatus) => {
  if (filter.pitkaviite && !p.pitkaviite.includes(filter.pitkaviite)) {
    return false;
  }
  if (
    filter.paymentstatus &&
    !paymentStatusTranslation[p["paymentstatus-id"]].includes(
      filter.paymentstatus
    )
  ) {
    return false;
  }
  if (
    filter["organization-name"] &&
    !p.hakemus?.["organization-name"].includes(filter["organization-name"])
  ) {
    return false;
  }
  if (
    filter["project-name"] &&
    !p.hakemus?.["project-name"].includes(filter["project-name"])
  ) {
    return false;
  }
  if (
    filter["payment-sum"] &&
    !p["payment-sum"].toString().includes(filter["payment-sum"])
  ) {
    return false;
  }
  if (
    filter["bank-iban"] &&
    !p.hakemus?.answers
      .find((a) => a.key === "bank-iban")
      ?.value.includes(filter["bank-iban"])
  ) {
    return false;
  }
  if (
    filter["lkp-account"] &&
    !p.hakemus?.["lkp-account"].includes(filter["lkp-account"])
  ) {
    return false;
  }
  if (
    filter["takp-account"] &&
    !p.hakemus?.["takp-account"].includes(filter["takp-account"])
  ) {
    return false;
  }
  if (
    filter["accounting"] &&
    !p["payment-sum"].toString().includes(filter.accounting)
  ) {
    return false;
  }
  return true;
};

export const MaksatuksetTable = ({ payments }: PaymentsTableProps) => {
  const [filter, setFilter] = useState<Filter>({});
  const [visiblePayments, setVisiblePayments] = useState<Maksatus[]>(
    payments ?? []
  );

  useEffect(() => {
    const filtered = payments?.filter(filterBy(filter));
    setVisiblePayments(filtered ?? []);
  }, [filter, payments]);

  const setFilterByKey =
    (key: SortKey) => (e: ChangeEvent<HTMLInputElement>) => {
      setFilter({ ...filter, [key]: e.target.value });
    };

  const groupedPayments = visiblePayments.reduce((acc, cur) => {
    const phase = `${cur.phase}`;
    if (phase) {
      return { ...acc, [phase]: [...(acc[phase] ?? []), cur] };
    }
    return acc;
  }, {} as { [k in string]: Maksatus[] });

  const renderPhase = (phase: string, payments: Maksatus[]) => {
    return (
      <React.Fragment key={`phase-${phase}`}>
        <tr>
          <td className="phase-header" colSpan={9}>
            {Number.parseInt(phase) + 1}. erä
          </td>
        </tr>
        {payments.map((p, i) => (
          <tr
            key={`maksatus-${p.id}`}
            className={i % 2 === 0 ? "white" : "gray"}
          >
            <td className="align-right semi-narrow-column">{p.pitkaviite}</td>
            <td className="narrow-column">
              {paymentStatusTranslation[p["paymentstatus-id"]]}
            </td>
            <td>{p.hakemus?.["organization-name"]}</td>
            <td>
              <a
                target="_blank"
                href={`/avustushaku/${p.hakemus?.["grant-id"]}/hakemus/${p.hakemus?.id}/arviointi`}
              >
                {p.hakemus?.["project-name"]}
              </a>
            </td>
            <td className="align-right narrow-column">{p["payment-sum"]} €</td>
            <td className="semi-narrow-column">
              {p.hakemus?.answers.find((a) => a.key === "bank-iban")?.value}
            </td>
            <td className="narrow-column">
              {p.hakemus?.["lkp-account"] ?? "LKP-tili puuttuu"}
            </td>
            <td className="narrow-column">
              {p.hakemus?.["takp-account"] ?? "TAKP-tili puuttuu"}
            </td>
            <td className="align-right narrow-column">{p["payment-sum"]} €</td>
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div>
      <table className="maksatukset_payments-table">
        <thead className="maksatukset_table-header">
          <tr>
            <th className="semi-narrow-column">
              <div>Pitkäviite</div>
              <input onChange={setFilterByKey("pitkaviite")} />
            </th>
            <th className="narrow-column">
              <div>Tila</div>
              <input onChange={setFilterByKey("paymentstatus")} />
            </th>
            <th>
              <div>Toimittajan nimi</div>
              <input onChange={setFilterByKey("organization-name")} />
            </th>
            <th>
              <div>Hanke</div>
              <input onChange={setFilterByKey("project-name")} />
            </th>
            <th className="narrow-column">
              <div>Maksuun</div>
              <input onChange={setFilterByKey("payment-sum")} />
            </th>
            <th className="semi-narrow-column">
              <div>Pankkitilin IBAN</div>
              <input onChange={setFilterByKey("bank-iban")} />
            </th>
            <th className="narrow-column">
              <div>LKP-tili</div>
              <input onChange={setFilterByKey("lkp-account")} />
            </th>
            <th className="narrow-column">
              <div>TaKp-tili</div>
              <input onChange={setFilterByKey("takp-account")} />
            </th>
            <th className="narrow-column">
              <div>Tiliöinti</div>
              <input onChange={setFilterByKey("accounting")} />
            </th>
          </tr>
        </thead>
        <tbody className="maksatukset_table-body">
          {Object.keys(groupedPayments).map((phase) =>
            renderPhase(phase, groupedPayments[phase])
          )}
        </tbody>
        {payments && payments.length > 0 && (
          <tfoot className="phase-header">
            <tr>
              <td colSpan={3}>
                {visiblePayments.length}/{payments.length} maksatusta
              </td>
              <td className="align-right">Yhteensä</td>
              <td className="align-right">
                {visiblePayments.reduce(
                  (acc, cur) => acc + cur["payment-sum"],
                  0
                )}{" "}
                €
              </td>
              <td colSpan={4} className="align-right">
                {visiblePayments.reduce(
                  (acc, cur) => acc + cur["payment-sum"],
                  0
                )}{" "}
                €
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {!payments ||
        (payments.length === 0 && (
          <div className="maksatukset_no-payments">Ei maksatuksia</div>
        ))}
    </div>
  );
};