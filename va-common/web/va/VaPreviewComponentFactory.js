import _ from 'lodash'
import React from 'react'
import ClassNames from 'classnames'

import InputValueStorage from 'soresu-form/web/form/InputValueStorage'
import Translator from 'soresu-form/web/form/Translator'
import ComponentFactory from 'soresu-form/web/form/ComponentFactory.js'
import LocalizedString from 'soresu-form/web/form/component/LocalizedString.jsx'
import BasicFieldComponent from 'soresu-form/web/form/component/BasicFieldComponent.jsx'
import BasicValue from 'soresu-form/web/form/preview/BasicValue.jsx'
import MoneyValue from 'soresu-form/web/form/preview/MoneyValue.jsx'
import MultipleOptionValue from 'soresu-form/web/form/preview/MultipleOptionValue.jsx'
import {FieldOnChangePropertyMapper} from 'soresu-form/web/form/component/PropertyMapper'

import VaBudgetElement, {
  SummingBudgetElement,
  BudgetItemElement,
  BudgetSummaryElement
} from './VaBudgetComponents.jsx'

import {
  VaFocusAreasPropertyMapper,
  BudgetSummaryPropertyMapper,
  SelfFinancingPropertyMapper
} from './VaPropertyMapper'

import VaTraineeDayCalculator from './VaTraineeDayCalculator.jsx'

export default class VaPreviewComponentFactory extends ComponentFactory {
  constructor() {
    super({
      fieldTypeMapping: {
        vaBudget: VaPreviewBudgetElement,
        vaSummingBudgetElement: SummingBudgetElement,
        vaBudgetItemElement: VaPreviewBudgetItemElement,
        vaBudgetSummaryElement: BudgetSummaryElement,
        vaProjectDescription: VaProjectDescriptionPreview,
        vaSelfFinancingField: MoneyValue,
        vaFocusAreas: MultipleOptionValue,
        vaEmailNotification: BasicValue,
        vaTraineeDayCalculator: VaPreviewTraineeDayCalculator
      },
      fieldPropertyMapperMapping: {
        vaFocusAreas: VaFocusAreasPropertyMapper,
        vaBudgetSummaryElement: BudgetSummaryPropertyMapper,
        vaSelfFinancingField: SelfFinancingPropertyMapper,
        vaTraineeDayCalculator: FieldOnChangePropertyMapper
      }
    })
  }
}

class VaPreviewBudgetItemElement extends React.Component {
  render() {
    const field = this.props.field
    const children = this.props.children
    const htmlId = this.props.htmlId
    const descriptionComponent = children[0]
    const amountComponent = children[1]
    return (
      <tr id={htmlId} className="budget-item">
        <td className="label-column">
          <LocalizedString translations={field} translationKey="label" lang={this.props.lang} />
        </td>
        <td>{descriptionComponent}</td>
        <td className="amount-column">{amountComponent}</td>
      </tr>
    )
  }
}

class VaPreviewBudgetElement extends VaBudgetElement {
  html(htmlId, children) {
    return (<div className="va-budget" id={htmlId}>
             {children}
            </div>)
  }}

class VaProjectDescriptionPreview extends React.Component {
  render() {
    const children = this.props.children
    const htmlId = this.props.htmlId
    const classNames = ClassNames("va-big-fieldset", {hidden: this.isHidden()})
    return (
      <li className={classNames} id={htmlId}>
        <div className="fieldset-elements">
          {children}
        </div>
      </li>
    )
  }

  isHidden() {
    return this.props.renderingParameters && this.props.renderingParameters.valueIsEmpty === true;
  }
}

class VaPreviewTraineeDayCalculator extends BasicFieldComponent {

  constructor(props) {
    super(props)
    this.translator = new Translator(props.translations.form["trainee-day-calculator"])
  }

  render() {
    const props = this.props
    const htmlId = props.htmlId
    const field = props.field
    const lang = props.lang

    if (!_.isArray(props.value)) {
      return null
    }

    const valueHolder = {value: props.value}

    return (
        <div id={htmlId} className="va-trainee-day-calculator">
          <table>
            <thead><tr>
              <th>{this.translator.translate("scope-type", lang)}</th>
              <th>{this.translator.translate("scope", lang)}</th>
              <th>{this.translator.translate("person-count", lang)}</th>
            </tr></thead>
            <tbody><tr>
              <td>{this.translator.translate(VaTraineeDayCalculator.readSubValue(valueHolder, field.id, "scope-type"), lang)}</td>
              <td>{VaTraineeDayCalculator.readSubValue(valueHolder, field.id, "scope")}</td>
              <td>{VaTraineeDayCalculator.readSubValue(valueHolder, field.id, "person-count")}</td>
            </tr></tbody>
            <tfoot>
            <tr><td colSpan="3">{this.label("total")}: {VaTraineeDayCalculator.readSubValue(valueHolder, field.id, "total")}</td></tr>
            </tfoot>
          </table>
        </div>
    )
  }
}
