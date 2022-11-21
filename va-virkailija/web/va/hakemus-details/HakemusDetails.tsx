import React from "react";

import HakemusPreview from "./HakemusPreview";

import "./hakemusDetails.less";
import {
  useHakemustenArviointiDispatch,
  useHakemustenArviointiSelector,
} from "../hakemustenArviointi/arviointiStore";
import {
  getLoadedState,
  setSelectedHakuId,
} from "../hakemustenArviointi/arviointiReducer";
import { Outlet, useSearchParams } from "react-router-dom";
import { NavLinkWithQuery } from "../NavLinkWithQuery";

export const HakemusDetails = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const splitView = searchParams.get("splitView") === "true";
  const dispatch = useHakemustenArviointiDispatch();
  const selectedHakemusId = useHakemustenArviointiSelector(
    (state) => state.arviointi.selectedHakuId
  );
  const hakuData = useHakemustenArviointiSelector(
    (state) => getLoadedState(state.arviointi).hakuData
  );
  const { avustushaku, hakemukset } = hakuData;

  const onClose = () => {
    searchParams.set("splitView", "false");
    setSearchParams(searchParams);
    dispatch(setSelectedHakuId(undefined));
  };

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextToggle = !splitView;
    searchParams.set("splitView", String(nextToggle));
    setSearchParams(searchParams);
    if (nextToggle) {
      const container = document.querySelector(
        ".hakemus-list tbody.has-selected"
      );
      const selected = document.querySelector<HTMLTableRowElement>(
        "#list-container tbody.has-selected .overview-row.selected"
      );
      if (container && selected?.offsetTop) {
        container.scrollTop = selected.offsetTop - 100;
      }
    }
    return false;
  };

  const MuutoshakemuksetLabel = () => (
    <span className="muutoshakemus-tab">
      Muutoshakemukset
      <span
        className={
          muutoshakemukset?.some((m) => m.status === "new")
            ? "muutoshakemukset-warning"
            : ""
        }
        data-test-id="number-of-pending-muutoshakemukset"
      >
        ({muutoshakemukset ? muutoshakemukset.length : 0})
      </span>
    </span>
  );
  const hakemus = hakemukset.find((h) => h.id === selectedHakemusId);
  if (hakemus === undefined) {
    return null;
  }
  const { muutoshakemukset } = hakemus;
  const isLinkActive = ({ isActive }: { isActive: boolean }) =>
    isActive ? "selected" : "";
  return (
    <div id="hakemus-details">
      <button id="close-hakemus-button" onClick={onClose}>
        &times;
      </button>
      <button id="toggle-hakemus-list-button" onClick={onToggle}>
        ↕
      </button>
      <HakemusPreview
        hakemus={hakemus}
        avustushaku={avustushaku}
        hakuData={hakuData}
      />
      <div className="arviointi-container">
        <div
          id="editor-subtab-selector"
          className="fixed-tabs section-container"
        >
          <NavLinkWithQuery to="arviointi" className={isLinkActive}>
            Arviointi
          </NavLinkWithQuery>
          <NavLinkWithQuery to="valiselvitys" className={isLinkActive}>
            Väliselvitys
          </NavLinkWithQuery>
          <NavLinkWithQuery to="loppuselvitys" className={isLinkActive}>
            Loppuselvitys
          </NavLinkWithQuery>
          <NavLinkWithQuery to="muutoshakemukset" className={isLinkActive}>
            <MuutoshakemuksetLabel />
          </NavLinkWithQuery>
          <NavLinkWithQuery
            to="seuranta"
            className={isLinkActive}
            data-test-id="tab-seuranta"
          >
            Seuranta
          </NavLinkWithQuery>
        </div>
        <div id="hakemus-arviointi" className="fixed-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default HakemusDetails;
