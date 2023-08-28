import BudgetBusinessRules from '../../budgetedit/BudgetBusinessRules'

export default class SeurantaBudgetEditFormController {
  constructor(onChangeListener, customComponentFactory, avustushaku, form, hakemus) {
    this.onChangeListener = onChangeListener
    this.customComponentFactory = customComponentFactory
    this.avustushaku = avustushaku
    this.budgetBusinessRules = new BudgetBusinessRules(form.content[0], hakemus.arvio)
    this.hakemus = hakemus
    this.componentOnChangeListener = this.componentOnChangeListener.bind(this)
  }

  constructHtmlId(formContent, fieldId) {
    return 'budget-edit-' + fieldId
  }

  getCustomComponentProperties() {
    return { avustushaku: this.avustushaku, originalHakemus: this.hakemus }
  }

  componentOnChangeListener(field, newValue) {
    this.onChangeListener(this.hakemus, field, newValue)
  }

  componentDidMount() {}

  initFieldValidation() {}

  isSaveDraftAllowed() {
    return true
  }

  getCustomComponentTypeMapping() {
    return this.customComponentFactory ? this.customComponentFactory.fieldTypeMapping : {}
  }

  createCustomComponent(componentProps) {
    if (!this.customComponentFactory) {
      throw new Error('To create a custom field, supply customComponentFactory to FormController')
    }
    return this.customComponentFactory.createComponent(componentProps)
  }

  createAttachmentDownloadUrl(state, field) {
    return `/api/avustushaku/${this.avustushaku.id}/hakemus/${this.hakemus.id}/attachments/${field.id}`
  }

  createAttachmentVersionDownloadUrl(field, attachmentVersion) {
    return `/api/avustushaku/${this.avustushaku.id}/hakemus/${this.hakemus.id}/attachments/${field.id}?attachment-version=${attachmentVersion}`
  }
}
