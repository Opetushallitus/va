import React from 'react'
import _ from 'lodash'

import './style/main.less'

import FormComponent from './component/FormComponent.jsx'
import InfoElement from './component/InfoElement.jsx'
import WrapperComponent from './component/wrapper/WrapperComponent.jsx'
import InputValueStorage from './InputValueStorage.js'

export default class Form extends React.Component {
  render() {
    const infoElementValues = this.props.infoElementValues.content
    const controller = this.props.controller
    const state = this.props.state
    const standardizedFormValues = state.standardizedFormValues
    const fields = state.form.content
    const validationErrors = state.form.validationErrors
    const values = state.saveStatus.values
    const modifyApplication = this.props.modifyApplication
    const environment = this.props.environment
    const standardizedFormFieldsEnabled = this.props.standardizedFormFieldsEnabled

    const renderField = function(field, renderingParameters) {
      const htmlId = controller.constructHtmlId(fields, field.id)
      const fieldProperties = {
        controller: controller,
        fieldType: field.fieldType,
        lang: state.configuration.lang,
        key: htmlId,
        htmlId: htmlId,
        field: field,
        translations: state.configuration.translations,
        customProps: controller.getCustomComponentProperties(state)
      }

      if (field.fieldClass === "infoElement") {
        return createInfoElement(fieldProperties)
      } else {
        const formOperations = state.extensionApi.formOperations
        const saved = controller.isSaveDraftAllowed(state)
        const applicantFields = [
          "applicant-name",
          "primary-email",
          "organization",
          "organization-email",
          "business-id",
          "organization-postal-address"
        ]
        const isOpened = () => "applicant_edit" === _.get(state.saveStatus.savedObject, "status")

        let fieldDisabled
        if (modifyApplication) {
          fieldDisabled =  (isOpened() && !applicantFields.includes(field.id)) || (!isOpened())
        } else {
        fieldDisabled =  !formOperations.isFieldEnabled(saved, field.id) || field.forceDisabled === true
        }

        const extendedProperties = _.extend(fieldProperties, {
          disabled: fieldDisabled,
          renderingParameters: renderingParameters,
          allAttachments: state.saveStatus.attachments,
          attachmentUploadsInProgress: state.saveStatus.attachmentUploadsInProgress
        })

        if (field.fieldClass === "formField" || field.fieldClass === "button") {
          return createFormComponent(field, extendedProperties)
        } else if (field.fieldClass === "wrapperElement") {
          return createWrapperElement(field, extendedProperties, renderingParameters)
        }
      }
    }

    const enableStandardizedFormFields =
      (environment["muutospaatosprosessi"] &&
        environment["muutospaatosprosessi"]["enabled?"]) && standardizedFormFieldsEnabled
    return ( 
      enableStandardizedFormFields
      ? <form className="soresu-form">
          {renderField(fields[0])}
          {renderField(fields[1])}
          <p className="soresu-info-element" data-test-id={`standardized-help-text-${state.configuration.lang}`}>{standardizedFormValues["help-text-" + state.configuration.lang]}</p>
          { _.map(fields.slice(3), f => renderField(f))}
          
        </form>
      : <form className="soresu-form">
      { _.map(fields, f => renderField(f))}
        </form>)

    function createInfoElement(fieldProperties) {
      return <InfoElement {...fieldProperties} values={infoElementValues} answersObject={values}/>
    }

    function createFormComponent(field, extendedProperties) {
      const existingInputValue = InputValueStorage.readValue(fields, values, field.id)
      const value = _.isUndefined(existingInputValue)
        ? ""
        : existingInputValue
      const fieldErrors = _.get(validationErrors, field.id, [])
      return <FormComponent {...extendedProperties} validationErrors={fieldErrors} value={value} onChange={controller.componentOnChangeListener} attachment={extendedProperties.allAttachments[field.id]} attachmentDownloadUrl={controller.createAttachmentDownloadUrl(state, field)}/>
    }

    function createWrapperElement(field, fieldProperties, renderingParameters) {
      function resolveChildRenderingParameters(childIndex) {
        const result = _.isObject(renderingParameters)
          ? _.cloneDeep(renderingParameters)
          : {}
        result.childIndex = childIndex
        result.removeMe = function() {
          controller.removeField(field.children[childIndex])
        }
        const isFirstChild = childIndex === 0
        if (field.params && field.params.showOnlyFirstLabels === true && !isFirstChild) {
          result.hideLabels = true
        }
        const isSecondToLastChild = childIndex === field.children.length - 2
        if (isSecondToLastChild) {
          const nextChild = field.children[childIndex + 1]
          const nextChildIsDisabled = _.isObject(nextChild)
            ? nextChild.forceDisabled
            : false
          if (nextChildIsDisabled) {
            result.rowMustNotBeRemoved = true
          }
        }
        return result
      }

      const children = []
      for (let i = 0; i < field.children.length; i++) {
        children.push(renderField(field.children[i], resolveChildRenderingParameters(i)))
      }

      return <WrapperComponent {...fieldProperties} answersObject={values}>{children}</WrapperComponent>
    }
  }
}
