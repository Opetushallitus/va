import moment from "moment";
import React, {
  MouseEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { HelpTexts } from "soresu-form/web/va/types";
import HttpUtil from "soresu-form/web/HttpUtil";

import HakujenHallintaController, {
  SelectedAvustushaku,
} from "../HakujenHallintaController";
import HelpTooltip from "../HelpTooltip";
import { UserInfo, VaUserSearch } from "../types";
import { DateInput } from "./DateInput";
import { Maksatus } from "./Maksatukset";
import { MaksatuksetTable } from "./MaksatuksetTable";
import { useVaUserSearch } from "../VaUserSearch";

type LahtevatMaksatuksetProps = {
  avustushaku: SelectedAvustushaku;
  controller: HakujenHallintaController;
  helpTexts: HelpTexts;
  payments: Maksatus[];
  refreshPayments: () => Promise<void>;
  userInfo: UserInfo;
};

type Document = {
  "acceptor-email": string;
  "document-id": string;
  phase: number;
  "presenter-email": string;
};

const now = moment();
const hasDocumentsForAllPhases = (phases: number[], documents: Document[]) => {
  for (const p of phases) {
    if (!documents.find((d) => d.phase === p)) {
      return false;
    }
  }
  return true;
};

export const LahtevatMaksatukset = ({
  avustushaku,
  controller,
  helpTexts,
  payments,
  refreshPayments,
  userInfo,
}: LahtevatMaksatuksetProps) => {
  const [laskunPvm, setLaskunPvm] = useState<Date>(now.toDate());
  const [erapaiva, setErapaiva] = useState(now.add(1, "w").toDate());
  const [tositePvm, setTositePvm] = useState<Date>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const phases = [...new Set(payments.map((p) => p.phase))];
  console.log(avustushaku);

  useEffect(() => {
    const newErrors = [
      !avustushaku["operational-unit-id"]
        ? "Avustushaun toimintayksikkö puuttuu"
        : undefined,
      !avustushaku["operation-id"] ? "Avustushaun toiminto puuttuu" : undefined,
      !avustushaku["project-id"] ? "Avustushaun projekti puuttuu" : undefined,
      !avustushaku.content["document-type"]
        ? "Abustushaun tositelaji puuttuu"
        : undefined,
      payments.filter((p) => !p.hakemus?.["lkp-account"]).length
        ? "LKP-tili puuttuu joltain hakemukselta"
        : undefined,
      payments.filter((p) => !p.hakemus?.["takp-account"]).length
        ? "TaKP-tili puuttuu joltain hakemukselta"
        : undefined,
      !laskunPvm ? "Laskun päivämäärä puuttuu" : undefined,
      !erapaiva ? "Eräpäivä puuttuu" : undefined,
      !tositePvm ? "Tositepäivämäärä puuttuu" : undefined,
      !hasDocumentsForAllPhases(phases, documents)
        ? "Kaikille vaiheille ei ole lisätty asiakirjaa"
        : undefined,
    ].filter((e) => e !== undefined) as string[];
    setErrors(newErrors);
  }, [avustushaku, payments, laskunPvm, erapaiva, tositePvm, documents]);

  const createPaymentBatches = async () => {
    const body = {
      currency: "EUR",
      "due-date": moment(erapaiva).format("YYYY-MM-DD"),
      "invoice-date": moment(laskunPvm).format("YYYY-MM-DD"),
      "receipt-date": moment(tositePvm).format("YYYY-MM-DD"),
      "grant-id": avustushaku.id,
      partner: "",
    };
    const { id } = await HttpUtil.post(`/api/v2/payment-batches/`, body);
    for (const d of documents) {
      await HttpUtil.post(`/api/v2/payment-batches/${id}/documents/`, d);
    }
    return id;
  };

  const onLähetäMaksatukset = async () => {
    controller.startSave();
    const id = await createPaymentBatches();
    await HttpUtil.post(`/api/v2/payment-batches/${id}/payments/`);
    try {
      await HttpUtil.post(`/api/v2/payment-batches/${id}/payments-email/`);
    } catch (e: unknown) {
      window.alert(
        "Kaikki maksatukset lähetetty, mutta vahvistussähköpostin lähetyksessä tapahtui virhe"
      );
    }
    await refreshPayments();
    controller.completeSave();
  };

  const onAsetaMaksetuksi = async () => {
    controller.startSave();
    const id = await createPaymentBatches();
    await HttpUtil.put(`/api/v2/payment-batches/${id}/payments/`, {
      "paymentstatus-id": "paid",
    });
    await refreshPayments();
    controller.completeSave();
  };

  return (
    <>
      {!!payments.length && (
        <>
          {!!errors.length && (
            <div className="maksatukset_errors">
              <h2>Seuraavat puutteet estävät maksatusten lähetyksen</h2>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="maksatukset_paivamaarat">
            <div>
              <h3 className="required">
                Laskun päivämäärä
                <HelpTooltip
                  content={
                    helpTexts["hakujen_hallinta__maksatus___laskun_päivämäärä"]
                  }
                  direction="left"
                />
              </h3>
              <DateInput
                id="laskun-pvm"
                defaultValue={laskunPvm}
                onChange={(_id, date) => setLaskunPvm(date.toDate())}
                allowEmpty={false}
              />
            </div>
            <div>
              <h3 className="required">
                Eräpäivä
                <HelpTooltip
                  content={helpTexts["hakujen_hallinta__maksatus___eräpäivä"]}
                  direction="left"
                />
              </h3>
              <DateInput
                id="erapaiva"
                defaultValue={erapaiva}
                onChange={(_id, date) => setErapaiva(date.toDate())}
                allowEmpty={false}
              />
            </div>
            <div>
              <h3 className="required">
                Tositepäivämäärä
                <HelpTooltip
                  content={
                    helpTexts["hakujen_hallinta__maksatus___tositepäivämäärä"]
                  }
                  direction="left"
                />
              </h3>
              <DateInput
                id="tosite-pvm"
                defaultValue={tositePvm}
                onChange={(_id, date) => setTositePvm(date.toDate())}
                allowEmpty={false}
              />
            </div>
          </div>
          <div className="maksatukset_documents">
            {phases.map((p) => (
              <DocumentEditor
                avustushaku={avustushaku}
                documents={documents}
                helpTexts={helpTexts}
                phase={p}
                setDocuments={setDocuments}
              />
            ))}
          </div>
          <button onClick={onLähetäMaksatukset} disabled={!!errors.length}>
            Lähetä maksatukset
          </button>
          {userInfo.privileges.includes("va-admin") && (
            <>
              &nbsp;
              <button onClick={onAsetaMaksetuksi} disabled={!!errors.length}>
                Aseta maksetuksi
              </button>
            </>
          )}
          <div className="spacer" />
        </>
      )}
      <MaksatuksetTable payments={payments} />
    </>
  );
};

type DocumentEditorProps = {
  avustushaku: SelectedAvustushaku;
  documents: Document[];
  helpTexts: HelpTexts;
  phase: number;
  setDocuments: (d: Document[]) => void;
};

const DocumentEditor = ({
  avustushaku,
  documents,
  helpTexts,
  phase,
  setDocuments,
}: DocumentEditorProps) => {
  const currentDocument = documents.find((d) => d.phase === phase);
  const [ashaTunniste, setAshaTunniste] = useState(
    currentDocument?.["document-id"]
  );
  const [esittelija, setEsittelija] = useState(
    currentDocument?.["presenter-email"]
  );
  const [_esittelijaSearch, setEsittelijaSearch, esittelijat] =
    useVaUserSearch();
  const esittelijaRef = useRef<HTMLInputElement>(null);
  const [hyvaksyja, setHyvaksyja] = useState(
    currentDocument?.["acceptor-email"]
  );
  const hyvaksyjaRef = useRef<HTMLInputElement>(null);
  const [_hyvaksyjaSearch, setHyvaksyjaSearch, hyvaksyjat] = useVaUserSearch();

  const onDocumentEdit = () => {
    if (currentDocument) {
      setDocuments(documents.filter((d) => d.phase !== phase));
    } else if (hyvaksyja && ashaTunniste && esittelija) {
      setDocuments([
        ...documents,
        {
          "acceptor-email": hyvaksyja,
          "document-id": ashaTunniste,
          phase,
          "presenter-email": esittelija,
        },
      ]);
    }
  };

  return (
    <div
      key={`document-${avustushaku.id}-${phase}`}
      className="maksatukset_document"
    >
      <div>
        <h3>Vaihe</h3>
        <div className="maksatukset_document-phase">{phase + 1}. erä</div>
      </div>
      <div>
        <h3 className="required">
          ASHA-tunniste
          <HelpTooltip
            content={helpTexts["hakujen_hallinta__maksatus___asha-tunniste"]}
            direction="left"
          />
        </h3>
        <input
          defaultValue={ashaTunniste}
          onChange={(e) => setAshaTunniste(e.target.value)}
          disabled={!!currentDocument}
        />
      </div>
      <div className="maksatukset_email-field">
        <h3 className="required">
          Esittelijän sähköpostiosoite
          <HelpTooltip
            content={
              helpTexts[
                "hakujen_hallinta__maksatus___esittelijän_sähköpostiosoite"
              ]
            }
            direction="left"
          />
        </h3>
        <input
          ref={esittelijaRef}
          defaultValue={esittelija}
          onChange={(e) => {
            setEsittelija(e.target.value);
            setEsittelijaSearch(e.target.value);
          }}
          disabled={!!currentDocument}
        />
        {!!esittelijat.result.results.length && (
          <SelectEmail
            userSearch={esittelijat}
            setSearch={setEsittelijaSearch}
            setEmail={setEsittelija}
            inputRef={esittelijaRef}
          />
        )}
      </div>
      <div className="maksatukset_email-field">
        <h3 className="required">
          Hyväksyjän sähköpostiosoite
          <HelpTooltip
            content={
              helpTexts[
                "hakujen_hallinta__maksatus___hyväksyjän_sähköpostiosoite"
              ]
            }
            direction="left"
          />
        </h3>
        <input
          ref={hyvaksyjaRef}
          defaultValue={hyvaksyja}
          onChange={(e) => {
            setHyvaksyja(e.target.value);
            setHyvaksyjaSearch(e.target.value);
          }}
          disabled={!!currentDocument}
        />
        {!!hyvaksyjat.result.results.length && (
          <SelectEmail
            userSearch={hyvaksyjat}
            setSearch={setHyvaksyjaSearch}
            setEmail={setHyvaksyja}
            inputRef={hyvaksyjaRef}
          />
        )}
      </div>
      <div>
        <button
          onClick={onDocumentEdit}
          disabled={
            !currentDocument && (!ashaTunniste || !esittelija || !hyvaksyja)
          }
        >
          {!!currentDocument ? "Poista asiakirja" : "Lisää asiakirja"}
        </button>
      </div>
    </div>
  );
};

type SelectEmailProps = {
  userSearch: VaUserSearch;
  setSearch: (s: string) => void;
  setEmail: (s: string) => void;
  inputRef: RefObject<HTMLInputElement>;
};

const SelectEmail = ({
  userSearch,
  setSearch,
  setEmail,
  inputRef,
}: SelectEmailProps) => {
  const onClick = (email: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.value = email;
    }
    setEmail(email);
    setSearch("");
  };

  const results = userSearch.result.results.filter((r) => !!r.email);

  return (
    <div className="maksatukset_email-selector">
      {results.map((r) => (
        <div key={r.email}>
          <a
            onClick={onClick(r.email ?? "")}
          >{`${r["first-name"]} ${r.surname} <${r.email}>`}</a>
        </div>
      ))}
    </div>
  );
};