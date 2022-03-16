import _, { DebouncedFunc } from 'lodash'
import Immutable from 'seamless-immutable'
import queryString from 'query-string'

import HttpUtil from '../HttpUtil'
import Dispatcher from '../Dispatcher'

import LocalStorage from './LocalStorage'
import InputValueStorage from './InputValueStorage'
import FormUtil from './FormUtil'
import FormRules from './FormRules'
import FormBranchGrower from './FormBranchGrower'
import {ensureFirstChildIsRequired} from './FormBranchEditableFieldGrower'
import {
  createFieldUpdate, FieldUpdate,
  triggerRelatedFieldValidationIfNeeded,
  updateStateFromFieldUpdate
} from './FieldUpdateHandler'
import JsUtil from '../JsUtil'
import Translator from './Translator'
import {FormEvents} from "soresu-form/web/form/FormController";
import {Field, Language} from "soresu-form/web/va/types";
import {StateLoopState} from "soresu-form/web/form/types/Form";

const serverOperations = {
  initialSave: 'initialSave',
  autoSave: 'autoSave',
  submit: 'submit',
  refuseApplication: 'refuseApplication',
  modifyApplicationContacts: 'modifyApplicationContacts'
} as const

type ServerOperation = typeof serverOperations[keyof typeof serverOperations]

export default class  FormStateTransitions {
  dispatcher: Dispatcher;
  events: FormEvents;
  autoSave: DebouncedFunc<() => void>;
  constructor(dispatcher: Dispatcher, events: FormEvents) {
    this.dispatcher = dispatcher
    this.events = events
    this.autoSave = _.debounce(function(){ dispatcher.push(events.save, {}) }, 3000)
    this._bind(
      'startAutoSave', 'onInitialState', 'onUpdateField', 'onFieldValidation', 'onChangeLang', 'updateOld', 'onSave',
      'onBeforeUnload', 'onInitAutoSave', 'onSaveCompleted', 'onSubmit', 'onRemoveField', 'onServerError', 'onUploadAttachment',
      'onRemoveAttachment', 'onAttachmentUploadCompleted', 'onAttachmentRemovalCompleted', 'pushSaveCompletedEvent',
      'refreshStateFromServer', 'onRefuseApplication')
  }

  _bind(...methods: any) {
    // @ts-ignore is this binding still necessary?
    methods.forEach((method: any) => this[method] = this[method].bind(this))
  }

  startAutoSave(state: StateLoopState) {
    const formOperations = state.extensionApi.formOperations
    if (formOperations.isSaveDraftAllowed(state)) {
      state.saveStatus.saveInProgress = true
      this.autoSave()
    }
    return state
  }

  onInitialState(_state: StateLoopState | {}, realInitialState: StateLoopState) {
    const onInitialStateLoaded = realInitialState.extensionApi.onInitialStateLoaded
    FormBranchGrower.addFormFieldsForGrowingFieldsInInitialRender(realInitialState.configuration.form.content, realInitialState.form.content, realInitialState.saveStatus.values, !realInitialState.configuration.preview)
    if (_.isFunction(onInitialStateLoaded)) {
      onInitialStateLoaded(realInitialState)
    }
    return realInitialState
  }

  onUpdateField(state: StateLoopState, fieldUpdate: FieldUpdate) {
    const formOperations = state.extensionApi.formOperations
    updateStateFromFieldUpdate(state, fieldUpdate)
    FormRules.applyRulesToForm(state.configuration.form, state.form, state.saveStatus.values)
    if (_.isFunction(formOperations.onFieldUpdate)) {
      formOperations.onFieldUpdate(state, fieldUpdate.field, fieldUpdate.value)
    }
    FormBranchGrower.expandGrowingFieldSetIfNeeded(state, fieldUpdate)
    triggerRelatedFieldValidationIfNeeded(state, fieldUpdate)
    const clientSideValidationPassed = state.form.validationErrors[fieldUpdate.id].length === 0
    if (clientSideValidationPassed) {
      // below function is never called? delete?
      if (_.isFunction(formOperations.onFieldValid)) {
        formOperations.onFieldValid(state, fieldUpdate.field, fieldUpdate.value)
      }
    }
    state.saveStatus.changes = true
    LocalStorage.save(formOperations.createUiStateIdentifier, state)
    this.startAutoSave(state)
    return state
  }

  onUploadAttachment(state: StateLoopState, uploadEvent: { field: Field, files: any }) {
    const { files, field } = uploadEvent
    const formOperations = state.extensionApi.formOperations
    if (formOperations.isSaveDraftAllowed(state)) {
      const url = formOperations.urlCreator.attachmentBaseUrl(state, field)
      const dispatcher = this.dispatcher
      const events = this.events
      const translations = state.configuration.translations
      const lang = state.configuration.lang
      const attachment = files[0]
      if (files.length > 1) {
        console.log('Warning: Only uploading first of ', files)
      }
      state.saveStatus.attachmentUploadsInProgress[field.id] = true
      HttpUtil.putFile(url, attachment)
        .then(function(response) {
          console.log("Uploaded file to server. Response=", JSON.stringify(response))
          dispatcher.push(events.attachmentUploadCompleted, response)
          return null
        })
        .catch(function(error) {
          if (error.response &&
              error.response.status === 400 &&
              error.response.data &&
              error.response.data["detected-content-type"]) {
            FormStateTransitions.handleAttachmentSaveError(
              "attachment-has-illegal-content-type-error",
              error,
              translations,
              lang,
              {"illegal-content-type": error.response.data["detected-content-type"]})
          } else {
            FormStateTransitions.handleAttachmentSaveError("attachment-save-error", error, translations, lang)
          }
        })
    }
    return state
  }

  static updateFieldValueInState(fieldId: string, newValue: any, state: StateLoopState) {
    const field = FormUtil.findField(state.form.content, fieldId)
    if (!field) {
      console.log('Warning: field "' + fieldId + '" not found in state to update it with new value ', newValue ,
        ' - was it removed maybe? State is', state)
      return
    }
    const fieldUpdate = createFieldUpdate(field, newValue, state.extensionApi.customFieldSyntaxValidator)
    updateStateFromFieldUpdate(state, fieldUpdate)
    FormBranchGrower.expandGrowingFieldSetIfNeeded(state, fieldUpdate)
  }

  onAttachmentUploadCompleted(state: StateLoopState, responseFromServer: any) {
    const formOperations = state.extensionApi.formOperations
    const fieldId = responseFromServer["field-id"]
    state.saveStatus.attachments[fieldId] = responseFromServer
    const placeHolderValue = responseFromServer.filename
    FormStateTransitions.updateFieldValueInState(fieldId, placeHolderValue, state)
    LocalStorage.save(formOperations.createUiStateIdentifier, state)

    state.saveStatus.attachmentUploadsInProgress[fieldId] = false
    this.refreshStateFromServer(this, state)
    return state
  }

  refreshStateFromServer(self: FormStateTransitions, state: StateLoopState) {
    const query = queryString.parse(location.search)
    const urlContent = {parsedQuery: query, location: location}
    const formOperations = state.extensionApi.formOperations
    HttpUtil.get(formOperations.urlCreator.loadEntityApiUrl(urlContent)).then(response => {
      self.pushSaveCompletedEvent(state, response, undefined)
    })
  }

  onRemoveAttachment(state: StateLoopState, fieldOfFile: Field) {
    const formOperations = state.extensionApi.formOperations
    if (formOperations.isSaveDraftAllowed(state)) {
      const url = formOperations.urlCreator.attachmentDeleteUrl(state, fieldOfFile)
      const dispatcher = this.dispatcher
      const events = this.events
      const translations = state.configuration.translations
      const lang = state.configuration.lang
      state.saveStatus.attachmentUploadsInProgress[fieldOfFile.id] = true
      HttpUtil.delete(url)
        .then(function() {
          console.log("Deleted attachment: " + fieldOfFile.id)
          dispatcher.push(events.attachmentRemovalCompleted, fieldOfFile)
          return null
        })
        .catch(function(error) {
          FormStateTransitions.handleAttachmentSaveError("attachment-remove-error", error, translations, lang)
        })
    }
    return state
  }

  onAttachmentRemovalCompleted(state: StateLoopState, fieldOfRemovedFile: Field) {
    const formOperations = state.extensionApi.formOperations
    const fieldId = fieldOfRemovedFile.id
    state.saveStatus.attachments[fieldId] = undefined
    FormStateTransitions.updateFieldValueInState(fieldId, "", state)
    state.saveStatus.attachmentUploadsInProgress[fieldId] = false
    LocalStorage.save(formOperations.createUiStateIdentifier, state)
    this.refreshStateFromServer(this, state)
    return state
  }

  onFieldValidation(state: StateLoopState, validation: any) {
    if (state.extensionApi.formOperations.isNotFirstEdit(state)) {
      state.form.validationErrors = state.form.validationErrors.merge({[validation.id]: validation.validationErrors})
    }
    return state
  }

  onChangeLang(state: StateLoopState, lang: Language) {
    state.configuration.lang = lang
    return state
  }

  static handleAttachmentSaveError(msgKey: string, error: any, translations: any, lang: Language, msgKeyValues?: Record<string, any>) {
    console.warn(`Handle attachment ${msgKey}`, error)
    const translator = new Translator(translations.errors)
    alert(translator.translate(msgKey, lang, undefined, msgKeyValues))
  }

  static handleUnexpectedServerError(dispatcher: Dispatcher, events: FormEvents, method: any, url: string, error: any, serverOperation: ServerOperation) {
    console.error(`Error in ${serverOperation}, ${method} ${url}`, error)
    if (serverOperation === serverOperations.submit) {
      dispatcher.push(events.serverError, {error: "unexpected-submit-error"})
    } else if (serverOperation === serverOperations.initialSave) {
      dispatcher.push(events.serverError, {error: "unexpected-save-error"})
    } else if (serverOperation === serverOperations.autoSave) {
      dispatcher.push(events.serverError, {error: "unexpected-save-error"})
      dispatcher.push(events.initAutoSave, {})
    } else if (serverOperation === serverOperations.refuseApplication) {
      dispatcher.push(events.serverError, {error: "unexpected-save-error"})
    }
  }

  static handleServerError(dispatcher: Dispatcher, events: FormEvents, error: any, method: any, url: string, serverOperation: ServerOperation) {
    if (error.response) {
      const res = error.response

      console.warn(`Handle ${serverOperation} error for ${method} ${url}, responding with status ${res.status}: ${JSON.stringify(res.data)}`, error)

      if (res.status === 400) {
        dispatcher.push(events.serverError, {error: "submit-validation-errors", validationErrors: res.data})
        return
      } else if (res.status === 405) {
        dispatcher.push(events.serverError, {error: "save-not-allowed"})
        return
      } else if (res.status === 409) {
        // TODO: Resolve updates from server.
        // At the moment just tell that something has changes
        dispatcher.push(events.serverError, {error: "conflict-save-error"})
        return
      }
    }

    FormStateTransitions.handleUnexpectedServerError(dispatcher, events, method, url, error, serverOperation)
  }

  updateOld(state: StateLoopState, serverOperation: ServerOperation, onSuccessCallback?: (state: StateLoopState) => void) {
    const formOperations = state.extensionApi.formOperations
    const url = serverOperation === serverOperations.submit ? formOperations.urlCreator.submitEntityApiUrl(state) : formOperations.urlCreator.editEntityApiUrl(state)
    const dispatcher = this.dispatcher
    const events = this.events
    const self = this
    state.saveStatus.saveInProgress = true
    const params = new URLSearchParams(window.location.search)
    const officerToken = params.get('officerToken') || undefined
    HttpUtil.post(url, state.saveStatus.values, officerToken)
      .then(function(response) {
        self.pushSaveCompletedEvent(state, response, onSuccessCallback)
      })
      .catch(function(error) {
        FormStateTransitions.handleServerError(
          dispatcher,
          events,
          error,
          "POST",
          url,
          serverOperation)
      })
    return state
  }

  pushSaveCompletedEvent(state: StateLoopState, response: any, onSuccessCallback?: (state: StateLoopState) => void) {
    const formOperations = state.extensionApi.formOperations
    const updatedState = _.cloneDeep(state)
    updatedState.saveStatus.savedObject = response
    updatedState.saveStatus.values = formOperations.responseParser.getFormAnswers(response)
    updatedState.form.validationErrors = Immutable(updatedState.form.validationErrors)
    if (onSuccessCallback) {
      onSuccessCallback(updatedState)
    }
    this.dispatcher.push(this.events.saveCompleted, updatedState)
  }

  onSave(state: StateLoopState, params: any) {
    const onSuccessCallback = params ? params.onSuccessCallback : undefined
    const formOperations = state.extensionApi.formOperations
    if (formOperations.isSaveDraftAllowed(state) && state.saveStatus.changes) {
      return this.updateOld(state, serverOperations.autoSave, onSuccessCallback)
    }
    return state
  }

  onBeforeUnload(state: StateLoopState) {
    const formOperations = state.extensionApi.formOperations
    if (formOperations.isSaveDraftAllowed(state) && state.saveStatus.changes) {
      return this.updateOld(state, serverOperations.autoSave)
    }
    return
  }

  onInitAutoSave(state: StateLoopState) {
    this.startAutoSave(state)
    return state
  }

  onSaveCompleted(stateFromUiLoop: any, stateWithServerChanges: any) {
    const formOperations = stateFromUiLoop.extensionApi.formOperations
    const locallyStoredValues = LocalStorage.load(formOperations.createUiStateIdentifier, stateWithServerChanges)
    stateFromUiLoop.saveStatus.changes = !_.isEqual(stateFromUiLoop.saveStatus.values, stateWithServerChanges.saveStatus.values)
    stateFromUiLoop.saveStatus.saveInProgress = false
    stateFromUiLoop.saveStatus.serverError = ""
    stateFromUiLoop.saveStatus.savedObject = stateWithServerChanges.saveStatus.savedObject
    if (!locallyStoredValues) {
      stateFromUiLoop.saveStatus.values = stateWithServerChanges.saveStatus.values
      stateFromUiLoop.form.validationErrors = stateWithServerChanges.form.validationErrors
      LocalStorage.save(formOperations.createUiStateIdentifier, stateFromUiLoop)
    }
    if (_.isFunction(formOperations.onSaveCompletedCallback)) {
      formOperations.onSaveCompletedCallback(stateFromUiLoop, stateWithServerChanges)
    }
    if (stateFromUiLoop.saveStatus.changes) {
      this.startAutoSave(stateFromUiLoop)
    }
    return stateFromUiLoop
  }

  onSubmit(state: StateLoopState) {
    const newState = this.updateOld(state, serverOperations.submit)
    const containerElem = document.getElementById('container')
    if (!containerElem) {
      throw Error('Container not found')
    }
    FormUtil.scrollTo(containerElem, 1500)
    return newState
  }

  onRemoveField(state: StateLoopState, fieldToRemove: Field) {
    const deleteAttachmentF = (field: Field) => this.dispatcher.push(this.events.startAttachmentRemoval, field)
    const growingParent = FormUtil.findGrowingParent(state.form.content, fieldToRemove.id)
    if (!growingParent) {
      throw Error(`Growing parent not found for ${fieldToRemove.id}`)
    }
    const answersObject = state.saveStatus.values
    JsUtil.traverseMatching<Field>(fieldToRemove, n => { return n.fieldType === "namedAttachment"}, attachmentField => {
      deleteAttachmentF(attachmentField)
    })
    InputValueStorage.deleteValue(growingParent, answersObject, fieldToRemove.id)
    FormRules.removeField(state.form, growingParent, fieldToRemove)
    ensureFirstChildIsRequired(state, growingParent)
    state.saveStatus.changes = true
    this.startAutoSave(state)
    return state
  }

  onServerError(state: StateLoopState, serverErrors: any) {
    if(serverErrors.error === "save-not-allowed") {
      window.location.href = state.extensionApi.formOperations.urlCreator.existingSubmissionPreviewUrl(
        state.avustushaku.id,
        state.saveStatus.hakemusId,
        state.configuration.lang
      )
      return state
    }
    state.saveStatus.saveInProgress = false
    state.saveStatus.serverError = serverErrors.error
    if(serverErrors.validationErrors) {
      state.form.validationErrors = state.form.validationErrors.merge(serverErrors.validationErrors)
    }
    return state
  }

  onRefuseApplication(state: StateLoopState, comment: string) {
    const formOperations = state.extensionApi.formOperations
    const url = formOperations.urlCreator.refuseApplicationApiUrl(state)
    const dispatcher = this.dispatcher
    const events = this.events
    const self = this
    state.saveStatus.saveInProgress = true
    HttpUtil.put(url, {comment: comment})
      .then(function(response) {
        self.pushSaveCompletedEvent(state, response)
      })
      .catch(function(error) {
        FormStateTransitions.handleServerError(
          dispatcher,
          events,
          error,
          "PUT",
          url,
          serverOperations.refuseApplication)
      })
    return state
  }

  onApplicationRefused(state: StateLoopState) {
    state.saveStatus.savedObject!.refused = true
    return state
  }


onModifyApplicationContacts(state: StateLoopState, onSuccessCallback: any){
  const formOperations = state.extensionApi.formOperations
  const url = formOperations.urlCreator.modifyContactsApiUrl(state)
  const dispatcher = this.dispatcher
  const events = this.events
  const self = this
  state.saveStatus.saveInProgress = true
  HttpUtil.put(url)
    .then(function(response) {
      self.pushSaveCompletedEvent(state, response, onSuccessCallback)
    })
    .catch(function(error) {
      FormStateTransitions.handleServerError(
        dispatcher,
        events,
        error,
        "PUT",
        url,
        serverOperations.modifyApplicationContacts)
    })
  return state
}



}
