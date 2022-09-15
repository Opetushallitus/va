import React from "react";
import { VaCodeValue } from "../types";
import AutoCompleteCodeValue from "./AutoCompleteCodeValue";

export interface ProjectSelectorProps {
  updateValue: (option: VaCodeValue | null) => void;
  codeOptions: VaCodeValue[];
  selectedValue: VaCodeValue | "";
  disabled: boolean;
  addRow?: () => void;
  removeRow?: () => void;
}

export default function ProjectSelector({
  codeOptions,
  disabled,
  selectedValue,
  updateValue,
  addRow,
  removeRow,
}: ProjectSelectorProps) {
  return (
    <div
      data-test-id={`projekti-valitsin-${
        selectedValue ? selectedValue.code : "initial"
      }`}
      className="projekti-valitsin"
    >
      <AutoCompleteCodeValue
        codeType="project-id"
        codeOptions={codeOptions.filter((k) => k["value-type"] === "project")}
        selectedValue={selectedValue}
        disabled={disabled}
        updateValue={updateValue}
      />
      {addRow && (
        <button
          disabled={disabled}
          data-test-id={`lisaa-projekti-${
            selectedValue ? selectedValue.code : "initial"
          }`}
          className="lisaa-projekti projekti-nappula"
          onClick={addRow}
        >
          <AddProjectButtonIcon />
        </button>
      )}
      {removeRow && (
        <button
          disabled={disabled}
          className="poista-projekti projekti-nappula"
          onClick={removeRow}
        >
          <RemoveProjectButtonIcon />
        </button>
      )}
    </div>
  );
}

const AddProjectButtonIcon = () => (
  <svg
    width="20"
    height="21"
    viewBox="0 0 20 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 0.5C4.45312 0.5 0 4.99219 0 10.5C0 16.0469 4.45312 20.5 10 20.5C15.5078 20.5 20 16.0469 20 10.5C20 4.99219 15.5078 0.5 10 0.5ZM13.75 11.4375H10.9375V14.25C10.9375 14.7969 10.5078 15.1875 10 15.1875C9.45312 15.1875 9.0625 14.7969 9.0625 14.25V11.4375H6.25C5.70312 11.4375 5.3125 11.0469 5.3125 10.5C5.3125 9.99219 5.70312 9.5625 6.25 9.5625H9.0625V6.75C9.0625 6.24219 9.45312 5.8125 10 5.8125C10.5078 5.8125 10.9375 6.24219 10.9375 6.75V9.5625H13.75C14.2578 9.5625 14.6875 9.99219 14.6875 10.5C14.6875 11.0469 14.2578 11.4375 13.75 11.4375Z"
      fill="#499CC7"
    />
  </svg>
);

const RemoveProjectButtonIcon = () => (
  <svg
    width="20"
    height="21"
    viewBox="0 0 20 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 0.5C4.45312 0.5 0 4.99219 0 10.5C0 16.0469 4.45312 20.5 10 20.5C15.5078 20.5 20 16.0469 20 10.5C20 4.99219 15.5078 0.5 10 0.5ZM13.75 11.4375H6.25C5.70312 11.4375 5.3125 11.0469 5.3125 10.5C5.3125 9.99219 5.70312 9.5625 6.25 9.5625H13.75C14.2578 9.5625 14.6875 9.99219 14.6875 10.5C14.6875 11.0469 14.2578 11.4375 13.75 11.4375Z"
      fill="#BA3E35"
    />
  </svg>
);
