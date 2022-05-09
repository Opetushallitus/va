import React from "react";
import _ from "lodash";

import ModalDialog from "./ModalDialog.jsx";
import FormUtil from "../FormUtil";
import LocalizedString from "./LocalizedString.tsx";
import Translator from "../Translator";
import HttpUtil from "../../HttpUtil";
import SyntaxValidator from "../SyntaxValidator";

const organizationToFormFieldIds = {
  name: "organization",
  email: "organization-email",
  "organisation-id": "business-id",
  contact: "organization-postal-address",
};

const findFieldAnswerValue = (answers, fieldId) => {
  const value = _.find(answers, (x) => x.key === fieldId);
  return value !== undefined ? value.value : undefined;
};

const findBusinessIdRelatedFieldIdWithEmptyValue = (
  formContent,
  savedAnswers
) =>
  _.find(
    _.values(organizationToFormFieldIds),
    (fieldId) =>
      FormUtil.findField(formContent, fieldId) &&
      _.isEmpty(findFieldAnswerValue(savedAnswers, fieldId))
  );

const shouldShowBusinessIdSearch = (state) =>
  !state.configuration.preview &&
  state.saveStatus.savedObject !== null &&
  findBusinessIdRelatedFieldIdWithEmptyValue(
    state.form.content,
    state.saveStatus.values.value
  );

const validateBusinessId = (str) =>
  SyntaxValidator.validateBusinessId(str) === undefined
    ? { isDisabled: false, error: "" }
    : { isDisabled: true, error: "error" };

export default class BusinessIdSearch extends React.Component {
  constructor(props) {
    super(props);
    this.fetchOrganizationData = this.fetchOrganizationData.bind(this);
    this.changeFieldValue = this.changeFieldValue.bind(this);
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleOnSubmit = this.handleOnSubmit.bind(this);
    this.state = {
      modalIsOpen: shouldShowBusinessIdSearch(this.props.state),
      isDisabled: true,
      error: "error",
      incorrectBusinessId: false,
      otherErrorOnBusinessId: false,
      businessId: "",
    };
    this.lang = this.props.state.configuration.lang;
    this.translations = this.props.state.configuration.translations.misc;
    this.translator = new Translator(
      this.props.state.configuration.translations.misc
    );
    this.formContent = this.props.state.form.content;
  }

  openModal() {
    this.setState({ modalIsOpen: true });
  }

  closeModal() {
    this.setState({ modalIsOpen: false });
  }

  changeFieldValue(data, fieldId, organizationFieldName) {
    const field = FormUtil.findField(this.formContent, fieldId);

    if (!field) {
      return; // nothing to change
    }

    const fieldValue =
      organizationFieldName === "contact"
        ? _.trim(
            `${data.contact.address || ""} ${
              data.contact["postal-number"] || ""
            } ${data.contact.city || ""}`
          )
        : data[organizationFieldName];

    if (!_.isEmpty(fieldValue)) {
      this.props.controller.componentOnChangeListener(field, fieldValue);
    }
  }

  // events from inputting the organisational id (y-tunnus)
  handleOnSubmit(event) {
    event.preventDefault();

    this.setState((state) => {
      this.fetchOrganizationData(state.businessId);
      return { modalIsOpen: false };
    });
  }

  handleOnChange(event) {
    const inputted = event.target.value;
    this.setState(
      Object.assign({ businessId: inputted }, validateBusinessId(inputted))
    );
  }

  // actions that happen after user has submitted their organisation-id, calls backend organisaton api
  fetchOrganizationData(id) {
    const language = this.props.state.configuration.lang;
    const url = this.props.controller.createOrganisationInfoUrl(
      this.props.state
    );

    HttpUtil.get(url + id + "&lang=" + language)
      .then((response) => {
        _.each(
          organizationToFormFieldIds,
          (formFieldId, organizationFieldName) => {
            if (!_.isEmpty(response[organizationFieldName])) {
              this.changeFieldValue(
                response,
                formFieldId,
                organizationFieldName
              );
            }
          }
        );
      })
      .catch((error) => {
        if (error.response.status === 404) {
          this.setState({ incorrectBusinessId: true });
          this.openModal();
        } else {
          this.setState({
            otherErrorOnBusinessId: true,
            incorrectBusinessId: false,
          });
          this.openModal();
        }
      });
  }

  render() {
    return (
      <div>
        <ModalDialog
          isOpen={this.state.modalIsOpen}
          className="modal"
          overlayClassName="overlay"
        >
          <div>
            <h1>
              <LocalizedString
                translations={this.translations}
                translationKey="give-businessid"
                lang={this.lang}
              />
            </h1>
            <p>
              <LocalizedString
                translations={this.translations}
                translationKey="organisation-info"
                lang={this.lang}
              />
            </p>
            <p id="not-found-business-id">
              {this.state.incorrectBusinessId && (
                <LocalizedString
                  translations={this.translations}
                  translationKey="not-found-business-id"
                  lang={this.lang}
                />
              )}
            </p>
            <p id="other-error-business-id">
              {this.state.otherErrorOnBusinessId && (
                <LocalizedString
                  translations={this.translations}
                  translationKey="error-with-business-id"
                  lang={this.lang}
                />
              )}
            </p>
            <form onSubmit={this.handleOnSubmit}>
              <label className="modal-label">
                <LocalizedString
                  translations={this.translations}
                  translationKey="business-id"
                  lang={this.lang}
                />{" "}
                :
                <input
                  id="finnish-business-id"
                  className={this.state.error}
                  type="text"
                  value={this.state.businessId}
                  onChange={this.handleOnChange}
                  autoFocus
                />
              </label>
              <input
                className={"get-business-id" + " " + "soresu-text-button"}
                type="submit"
                value={this.translator.translate("get", this.lang)}
                disabled={this.state.isDisabled}
              />
            </form>
            <p>
              <a onClick={this.closeModal}>
                <LocalizedString
                  translations={this.translations}
                  translationKey="cancel"
                  lang={this.lang}
                />
              </a>
            </p>
          </div>
        </ModalDialog>
      </div>
    );
  }
}
