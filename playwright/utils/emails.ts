import axios from "axios";
import * as yup from "yup";
import { VIRKAILIJA_URL } from "./constants";
import { log, expectToBeDefined } from "./util";

export interface Email {
  formatted: string;
  "to-address": string[];
  bcc: string | null;
  subject?: string;
}

export const emailSchema = yup
  .array()
  .of(
    yup
      .object()
      .shape<Email>({
        formatted: yup.string().required(),
        "to-address": yup.array().of(yup.string().required()).defined(),
        bcc: yup.string().defined().nullable(),
        subject: yup.string().optional(),
      })
      .required()
  )
  .defined();

export const getAllEmails = (emailType: string): Promise<Email[]> =>
  axios
    .get(`${VIRKAILIJA_URL}/api/test/email/${emailType}`)
    .then((r) => emailSchema.validate(r.data));

export const getLastEmail = (emailType: string): Promise<Email> =>
  getAllEmails(emailType).then(lastOrFail);

const getEmails =
  (emailType: string) =>
  (hakemusID: number): Promise<Email[]> =>
    axios
      .get(`${VIRKAILIJA_URL}/api/test/hakemus/${hakemusID}/email/${emailType}`)
      .then((r) => {
        console.log(`getEmails(${emailType})`, r.data);
        return r;
      })
      .then((r) => emailSchema.validate(r.data));

const getEmailsWithAvustushaku =
  (emailType: string) =>
  (avustushakuID: number): Promise<Email[]> =>
    axios
      .get(
        `${VIRKAILIJA_URL}/api/test/avustushaku/${avustushakuID}/email/${emailType}`
      )
      .then((r) => {
        console.log(`getEmails(${emailType})`, r.data);
        return r;
      })
      .then((r) => emailSchema.validate(r.data));

export const getValmistelijaEmails = getEmails(
  "notify-valmistelija-of-new-muutoshakemus"
);
export const getMuutoshakemusPaatosEmails = getEmails("muutoshakemus-paatos");
export const getMuutoshakemusEmails = getEmails("paatos-refuse");
export const getAcceptedPäätösEmails = getMuutoshakemusEmails;
export const getValiselvitysEmails = getEmails("valiselvitys-notification");
export const getValiselvitysSubmittedNotificationEmails = getEmails(
  "valiselvitys-submitted-notification"
);
export const getLoppuselvitysSubmittedNotificationEmails = getEmails(
  "loppuselvitys-submitted-notification"
);
export const getLoppuselvitysEmails = getEmails("loppuselvitys-notification");
export const getLoppuselvitysPalauttamattaEmails = getEmails(
  "loppuselvitys-palauttamatta"
);
export const getLahetaValiselvityspyynnotEmails = getEmailsWithAvustushaku(
  "laheta-valiselvityspyynnot"
);
export const getLahetaLoppuselvityspyynnotEmails = getEmailsWithAvustushaku(
  "laheta-loppuselvityspyynnot"
);
export const getValiselvitysPalauttamattaEmails = getEmails(
  "valiselvitys-palauttamatta"
);
export const getYhteystiedotMuutettuEmails = getEmails(
  "hakemus-edited-after-applicant-edit"
);
export const getPaatoksetLahetettyEmails = getEmailsWithAvustushaku(
  "paatokset-lahetetty"
);
export const getMuutoshakemuksetKasittelemattaEmails = async (
  ukotettuEmailAddress: string
) => {
  const emails = await getAllEmails("muutoshakemuksia-kasittelematta");
  return emails.filter((e) => e["to-address"].includes(ukotettuEmailAddress));
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitUntilMinEmails(
  f: (hakemusId: number) => Promise<Email[]>,
  minEmails: number,
  hakemusId: number
) {
  let emails: Email[] = await f(hakemusId);

  while (emails.length < minEmails) {
    await sleep(1000);
    emails = await f(hakemusId);
  }
  return emails;
}

export async function getLastAvustushakuEmail(
  avustushakuID: number,
  emailType: string
): Promise<Email> {
  return await getAvustushakuEmails(avustushakuID, emailType).then(lastOrFail);
}

export async function getNewHakemusEmails(
  avustushakuID: number
): Promise<Email[]> {
  return await getAvustushakuEmails(avustushakuID, "new-hakemus");
}

export async function getAvustushakuEmails(
  avustushakuID: number,
  emailType: string
): Promise<Email[]> {
  return await axios
    .get(
      `${VIRKAILIJA_URL}/api/test/avustushaku/${avustushakuID}/email/${emailType}`
    )
    .then((r) => emailSchema.validate(r.data));
}

export async function pollUntilNewHakemusEmailArrives(
  avustushakuID: number,
  hakijaEmailAddress: string
): Promise<Email[]> {
  while (true) {
    try {
      const emails = await getNewHakemusEmails(avustushakuID);
      log(`Received emails`, JSON.stringify(emails, null, 2));
      const hakijaEmails = emails.filter((email) =>
        email["to-address"].some((address) => address === hakijaEmailAddress)
      );
      if (hakijaEmails.length > 0) {
        log(`Received hakija emails`, JSON.stringify(hakijaEmails, null, 2));
        return hakijaEmails;
      } else {
        log("No emails received");
        await sleep(1000);
      }
    } catch (e) {
      console.log(`Failed to get hakemus emails: ${e}`);
    }
  }
}

export function getHakemusUrlFromEmail(email: Email) {
  return (
    email.formatted.match(/https?:\/\/.*\/avustushaku.*/)?.[0] ||
    email.formatted.match(/https?:\/\/.*\/statsunderstod.*/)?.[0]
  );
}

const linkToRefuseRegex = /https?:\/\/.*refuse-grant=true.*/;
export function getRefuseUrlFromEmail(email: Email): string {
  const url = email.formatted.match(linkToRefuseRegex)?.[0];
  if (!url) {
    throw new Error("No refuse URL in email");
  }
  return url;
}

export const linkToMuutoshakemusRegex = /https?:\/\/.*\/muutoshakemus\?.*/;
export async function getLinkToMuutoshakemusFromSentEmails(hakemusID: number) {
  const emails = await waitUntilMinEmails(getMuutoshakemusEmails, 1, hakemusID);

  const linkToMuutoshakemus = emails[0]?.formatted.match(
    linkToMuutoshakemusRegex
  )?.[0];
  expectToBeDefined(linkToMuutoshakemus);
  return linkToMuutoshakemus;
}

export async function getLinkToHakemusFromSentEmails(hakemusID: number) {
  const emails = await waitUntilMinEmails(getValmistelijaEmails, 1, hakemusID);

  const linkToHakemusRegex = /https?:\/\/.*\/avustushaku.*/;
  const linkToHakemus = emails[0]?.formatted.match(linkToHakemusRegex)?.[0];
  expectToBeDefined(linkToHakemus);
  return linkToHakemus;
}

export interface MailWithLinks extends Email {
  title: string | undefined;
  linkToMuutoshakemusPaatos: string | undefined;
  linkToMuutoshakemus: string | undefined;
}

export async function parseMuutoshakemusPaatosFromEmails(
  hakemusID: number
): Promise<MailWithLinks> {
  const emails = await waitUntilMinEmails(
    getMuutoshakemusPaatosEmails,
    1,
    hakemusID
  );
  const title = emails[0]?.formatted.match(/Hanke:.*/)?.[0];
  const linkToMuutoshakemusPaatosRegex =
    /https?:\/\/.*\/muutoshakemus\/paatos.*/;
  const linkToMuutoshakemusPaatos = emails[0]?.formatted.match(
    linkToMuutoshakemusPaatosRegex
  )?.[0];
  const linkToMuutoshakemus = emails[0]?.formatted.match(
    linkToMuutoshakemusRegex
  )?.[0];

  return {
    title,
    linkToMuutoshakemusPaatos,
    linkToMuutoshakemus,
    ...emails[0],
  };
}

export async function getLinkToPaatosFromEmails(hakemusID: number) {
  const emails = await waitUntilMinEmails(
    getAcceptedPäätösEmails,
    1,
    hakemusID
  );
  const linkToPaatos = emails[0]?.formatted.match(
    /https?:\/\/.*\/paatos\/.*/
  )?.[0];
  if (!linkToPaatos) {
    throw new Error("did not find link to päätös");
  }
  return linkToPaatos;
}

interface HakemusTokenAndRegisterNumber {
  token: string;
  "register-number": string;
}

export async function getHakemusTokenAndRegisterNumber(
  hakemusId: number
): Promise<HakemusTokenAndRegisterNumber> {
  const applicationGeneratedValuesSchema = yup
    .object()
    .required()
    .shape<HakemusTokenAndRegisterNumber>({
      token: yup.string().required(),
      "register-number": yup.string().required(),
    });

  return await axios
    .get(
      `${VIRKAILIJA_URL}/api/test/hakemus/${hakemusId}/token-and-register-number`
    )
    .then((r) => applicationGeneratedValuesSchema.validate(r.data));
}

export function lastOrFail<T>(xs: ReadonlyArray<T>): T {
  if (xs.length === 0) throw Error("Can't get last element of empty list");
  return xs[xs.length - 1];
}
