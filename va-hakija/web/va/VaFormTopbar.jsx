import React from 'react'
import _ from 'lodash'

import LocalizedString from 'soresu-form/web/form/component/LocalizedString.jsx'
import Translator from 'soresu-form/web/form/Translator.js'

import EnvironmentInfo from 'va-common/web/va/EnvironmentInfo.jsx'

import TextButton from 'soresu-form/web/form/component/TextButton.jsx'
import FormSaveStatus from 'soresu-form/web/form/component/FormSaveStatus.jsx'
import ToggleLanguageButton from 'soresu-form/web/form/component/ToggleLanguageButton.jsx'
import FormErrorSummary from 'soresu-form/web/form/component/FormErrorSummary.jsx'
import ServerError from 'soresu-form/web/form/component/ServerError.jsx'

export default class VaFormTopbar extends React.Component {
  render() {
    const {controller, state, hakemusType} = this.props
    const saveStatus = state.saveStatus
    const configuration = state.configuration
    const avustushaku = state.avustushaku
    const form = state.form
    const validationErrors = state.form.validationErrors
    const lang = configuration.lang
    const translations = configuration.translations
    const formTranslator = new Translator(translations.form)
    const preview = configuration.preview
    const formIsValidOnClientSide = _.reduce(
      validationErrors,
      (allValid, fieldErrors) => allValid && fieldErrors.length === 0,
      true)
    const formIsValidOnServerSide = state.saveStatus.savedObject && _.reduce(
      state.saveStatus.savedObject["validation-errors"],
      (allValid, fieldErrors) => allValid && fieldErrors.length === 0,
      true)
    const formOperations = state.extensionApi.formOperations
    const previewUrl = formOperations.urlCreator.existingSubmissionPreviewUrl(state,lang);
    const openPreview = function() {
      window.open(previewUrl, "preview")
    }
    const isNormalEdit = () => _.includes(["new", "draft","submitted"], _.get(saveStatus.savedObject, "status"))
    const isChangeRequestResponse = () => "pending_change_request" === _.get(saveStatus.savedObject, "status")
    const isInVirkailijaEditMode = () => "officer_edit" === _.get(saveStatus.savedObject, "status")
    const isSubmitted = () => "submitted" === _.get(saveStatus.savedObject, "status")
    const isSubmitDisabled = function() {
      return !(formIsValidOnClientSide && formIsValidOnServerSide && controller.isSaveDraftAllowed(state)) || controller.hasPendingChanges(state) || isSubmitted()
    }
    const submitTextKey = isSubmitted() ? `submitted-${hakemusType}`: "submit"
    const helpText = formTranslator.translate(`savehelp-${hakemusType}`, lang)
    const hasEnded = avustushaku.phase === "ended"
    const topicKey = `heading-${hakemusType}`
    const isHakemus = hakemusType=="hakemus"

    return(
      <section id="topbar">
        <div id="top-container">
          <img id="logo" src="img/logo-240x68@2x.png" width="240" height="68" alt="Opetushallitus / Utbildningsstyrelsen" />
          <h1 id="topic"><LocalizedString translations={translations.form} translationKey={topicKey} lang={lang}/></h1>
          <div id="form-controls" hidden={preview}>
            <FormSaveStatus saveStatus={saveStatus} translations={translations} lang={lang}/>
            <span hidden={!isNormalEdit()} className="soresu-tooltip soresu-tooltip-down">
              <TextButton htmlId="submit" onClick={controller.submit} disabled={isSubmitDisabled()} translations={translations.form} translationKey={submitTextKey} lang={lang} />
              <span>{helpText}</span>
            </span>
            <span hidden={!isChangeRequestResponse()} className="soresu-tooltip soresu-tooltip-down">
              <TextButton htmlId="change-request-response" onClick={controller.submit} disabled={isSubmitDisabled()} translations={translations.form} translationKey="change-request-response" lang={lang} />
              <span>{formTranslator.translate("change-request-response-help", lang)}</span>
            </span>
            <span hidden={!isInVirkailijaEditMode()} className="soresu-tooltip soresu-tooltip-down">
              <TextButton htmlId="virkailija-edit-submit" onClick={controller.submit} disabled={isSubmitDisabled()} translations={translations.form} translationKey="virkailija-edit-submit" lang={lang} />
              <span>{formTranslator.translate("virkailija-edit-submit-help", lang)}</span>
            </span>
            <span id="form-controls-devel" hidden={!configuration.develMode}>
              <ToggleLanguageButton id="toggle-language" controller={controller} languages={translations.languages} lang={lang}/>
              <TextButton htmlId="preview-button" onClick={openPreview} disabled={!controller.isSaveDraftAllowed(state)} translations={translations.form} translationKey="preview" lang={lang} />
            </span>
            <FormErrorSummary formContent={form.content} controller={controller} validationErrors={validationErrors} translations={translations.errors} lang={lang} />
            {isHakemus && <a className="preview-link" href={previewUrl} target="_blank"><LocalizedString translations={translations.form} translationKey="print-version" lang={lang}/></a>}
          </div>
          <div id="server-info">
            <EnvironmentInfo environment={configuration.environment}/>
            <LocalizedString translations={translations.form} translationKey="has-ended" lang={lang} hidden={!hasEnded || !isHakemus} />
            <ServerError serverError={saveStatus.serverError} translations={translations.errors} lang={lang}/>
          </div>
        </div>
        <span hidden={true} id="entity-id">{formOperations.printEntityId(state)}</span>
        <span hidden={true} id="entity-version">{formOperations.responseParser.getSavedVersion(state.saveStatus.savedObject)}</span>
        <span hidden={true} id="pending-changes">{ controller.hasPendingChanges(state) ? "true" : "false"}</span>
      </section>
    )
  }
}
