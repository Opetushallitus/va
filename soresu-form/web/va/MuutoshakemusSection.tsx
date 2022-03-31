import * as React from "react";
import ClassNames from 'classnames'

import './MuutoshakemusSection.less'

interface Props {
  blueMiddleComponent?: JSX.Element
  bottomComponent?: JSX.Element
  datepickerFix?: boolean
}

export const MuutoshakemusSection: React.FC<Props> = ({blueMiddleComponent, bottomComponent, datepickerFix, children}) => (
  <section className={ClassNames("muutoshakemus-form-section",  {'muutoshakemus-form-section_date-picker-fix': datepickerFix})}>
    <div className="muutoshakemus-form-section_content">
      {children}
    </div>
    {blueMiddleComponent && (
      <div className="muutoshakemus-form-section_cta">
        {blueMiddleComponent}
      </div>
    )}
    {bottomComponent && (
      <div className="muutoshakemus-form-section_content">
        {bottomComponent}
      </div>
    )}
  </section>
)
