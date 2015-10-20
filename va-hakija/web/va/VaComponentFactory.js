import React from 'react'

import ComponentFactory from 'soresu-form/web/form/ComponentFactory.js'
import CheckboxButton from 'soresu-form/web/form/component/CheckboxButton.jsx'

import {VaBudgetElement, SummingBudgetElement, BudgetItemElement, BudgetSummaryElement} from 'va-common/web/va/VaBudgetComponents.jsx'
import {VaFocusAreasPropertyMapper} from 'va-common/web/va/VaPropertyMapper.js'
import VaProjectDescription from './VaProjectDescription.jsx'

export default class VaComponentFactory extends ComponentFactory {
  constructor() {
    const fieldTypeMapping = {
      "vaBudget": VaBudgetElement,
      "vaSummingBudgetElement": SummingBudgetElement,
      "vaBudgetItemElement": BudgetItemElement,
      "vaBudgetSummaryElement": BudgetSummaryElement,
      "vaProjectDescription": VaProjectDescription,
      "vaFocusAreas": CheckboxButton
    }
    super({ fieldTypeMapping: fieldTypeMapping,
            fieldPropertyMapperMapping: {
              "vaFocusAreas": VaFocusAreasPropertyMapper }})
  }

  getCustomComponentProperties(state) {
    return { "avustushaku": state.avustushaku }
  }
}
