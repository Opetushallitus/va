import React from "react";

import styles from "./Switch.module.less";

interface Props {
  onChange: () => void;
  checked: boolean;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className={styles.switch}>
      <span>{label}</span>
      <input type="checkbox" id={label} onChange={onChange} checked={checked} />
      <i />
    </label>
  );
}
