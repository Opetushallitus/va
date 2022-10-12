import React from "react";
import { KoodienhallintaRoutes } from "./types";
import { NavLink } from "react-router-dom";
import { useGetEnvironmentAndUserInfoQuery } from "./apiSlice";

const tabName = {
  "operational-unit": "Toimintayksikkö",
  project: "Projekti",
  operation: "Toiminto",
  "ta-tilit": "TA-tilit",
} as const;

interface OphTabProps {
  to: KoodienhallintaRoutes;
}

const OphTab = ({ to }: OphTabProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? "oph-tab-item oph-tab-item-is-active" : "oph-tab-item"
      }
      data-test-id={`code-value-tab-${to}`}
    >
      {tabName[to]}
    </NavLink>
  );
};

export const Tabs = () => {
  const { data } = useGetEnvironmentAndUserInfoQuery();
  return (
    <div className="oph-tabs oph-typography">
      <OphTab to="operational-unit" />
      <OphTab to="project" />
      <OphTab to="operation" />
      {data?.environment?.["ta-tilit"]?.["enabled?"] && (
        <OphTab to="ta-tilit" />
      )}
    </div>
  );
};
