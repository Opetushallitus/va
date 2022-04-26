import _ from 'lodash'
import ClassNames from 'classnames'
import React, { Component } from 'react'

import { HakemusSelvitys, Loppuselvitys, Muutoshakemus } from 'soresu-form/web/va/status'

import HakemusArviointiStatuses from '../hakemus-details/HakemusArviointiStatuses'
import {createAverageSummaryText, effectiveAverage} from '../ScoreResolver'
import { PersonFilterButton } from './PersonFilterButton'
import { PersonSelectButton } from './PersonSelectButton'
import ShouldPayIcon from './ShouldPayIcon'

import '../style/table.less'
import './hakemus-listing.less'

export default class HakemusListing extends Component {

  static _fieldGetter(fieldName, userInfo, allowHakemusScoring) {
    switch(fieldName) {
      case "name":
        return hakemus => hakemus["project-name"] + " (" + hakemus["register-number"] + ")"
      case "organization":
        return hakemus => hakemus["organization-name"]
      case "status":
        return hakemus => hakemus.arvio.status
      case "status_loppuselvitys":
        return hakemus => hakemus["status-loppuselvitys"]
      case "status_valiselvitys":
        return hakemus => hakemus["status-valiselvitys"]
      case "status_muutoshakemus":
        return hakemus => hakemus.muutoshakemukset && hakemus.muutoshakemukset[0]
          ? hakemus.muutoshakemukset[0].status
          : hakemus["status-muutoshakemus"] || 'missing'
      case "change-request":
        return hakemus => {
          if(hakemus.status === "pending_change_request") {
            return "H"
          }
          if(hakemus.status === "officer_edit") {
            return "V"
          }
          return ""
        }
      case "applied-sum":
        return hakemus => hakemus["budget-oph-share"]
      case "granted-sum":
        return hakemus => hakemus.arvio["budget-granted"]
      case "academysize":
        return hakemus => hakemus.arvio.academysize
      case "answers":
        return hakemus => hakemus.answers
      case "rahoitusalue":
        return hakemus => hakemus.arvio.rahoitusalue
      case "evaluators":
        return hakemus => hakemus.arvio.roles.evaluators
      case "presenter":
        return hakemus => hakemus.arvio["presenter-role-id"]
      case "tags":
        return hakemus => hakemus.arvio.tags.value
      case "should-pay":
        return hakemus => hakemus.arvio["should-pay"] ? "" : "!"
      case "score":
        return hakemus => {
          const score = effectiveAverage(hakemus.arvio.scoring, userInfo, allowHakemusScoring)
          return score ? score : 0
        }
    }
    throw Error("No field getter for " + fieldName)
  }

  static _filterWithArrayPredicate(fieldGetter, filter) {
    return function(hakemus) {
      return _.includes(filter, fieldGetter(hakemus))
    }
  }

  static _filterWithArrayFilterPredicate(fieldGetter, filter) {
    if(_.isUndefined(filter)) {
      return function() {return true}
    }
    return function(hakemus) {
      const fieldValue = fieldGetter(hakemus)

      return _.includes(fieldValue, filter)
    }
  }

  static _filterAnswers(fieldGetter, filters) {
    if(_.isEmpty(filters)) {
      return function() {return true}
    }
    return function(hakemus) {
      const answers = fieldGetter(hakemus)
      if(_.isEmpty(answers)) {
        return false
      }
      const filtersWithoutExcluded = filters.filter(answer => answer.id !== "rahoitusalue" && answer.id !== "tags")
      const answerMatchPredicate = filter => _.find(answers, a => a.key === filter.id && a.value === filter.answer)
      const groupedByQuestion = _.groupBy(filtersWithoutExcluded, 'id')
      const filterValuesByQuestion = _.values(groupedByQuestion)
      const questionMatches = filterValuesByQuestion.map(v => _.some(v,answerMatchPredicate))
      return _.every(questionMatches)
    }
  }

  static _filterWithStrPredicate(fieldGetter, filter) {
    if(_.isEmpty(filter)) {
      return function() {return true}
    }
    return function(hakemus) {
      if(_.isEmpty(fieldGetter(hakemus))) {
        return false
      }
      return fieldGetter(hakemus).toUpperCase().indexOf(filter.toUpperCase()) >= 0
    }
  }

  static _filterWithNumberPredicate(fieldGetter, filter) {
    if(!_.isNumber(filter)) {
      return function() {return true}
    }
    return function(hakemus) {
      if(!_.isNumber(fieldGetter(hakemus))) {
        return false
      }
      return fieldGetter(hakemus) === filter
    }
  }

  static _filterRahoitusaluePredicate(fieldGetter, filters) {
    const rahoitusAlueetFilter = filters.filter(i => i.id === "rahoitusalue")
    if(_.isEmpty(rahoitusAlueetFilter)) {
      return function() {return true}
    }
    return function(hakemus) {
      const fieldValue = fieldGetter(hakemus)
      if(_.isUndefined(fieldValue) || _.isNull(fieldValue)) {
        return _.some(rahoitusAlueetFilter, i => i.answer === "Ei rahoitusaluetta")
      }
      return _.includes(rahoitusAlueetFilter.map(i => i.answer),fieldValue)
    }
  }

  static _filterTagsPredicate(fieldGetter, filters) {
    const tagsFilter = filters.filter(i => i.id === "tags")
    if(_.isEmpty(tagsFilter)) {
      return function() {return true}
    }
    return function(hakemus) {
      const fieldValue = fieldGetter(hakemus)
      const answers = tagsFilter.map(i => i.answer)
      return _.some(fieldValue, i => _.includes(answers, i))
    }
  }

  static _filter(list, filter) {
    return _.filter(list, HakemusListing._filterWithStrPredicate(HakemusListing._fieldGetter("name"), filter.name))
            .filter(HakemusListing._filterWithStrPredicate(HakemusListing._fieldGetter("organization"), filter.organization))
            .filter(HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter("status"), filter.status))
            .filter(HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter("status_loppuselvitys"), filter.status_loppuselvitys))
            .filter(HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter("status_valiselvitys"), filter.status_valiselvitys))
            .filter(HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter("status_muutoshakemus"), filter.status_muutoshakemus))
            .filter(HakemusListing._filterAnswers(HakemusListing._fieldGetter("answers"), filter.answers))
            .filter(HakemusListing._filterWithArrayFilterPredicate(HakemusListing._fieldGetter("evaluators"), filter.evaluator))
            .filter(HakemusListing._filterWithNumberPredicate(HakemusListing._fieldGetter("presenter"), filter.presenter))
            .filter(HakemusListing._filterRahoitusaluePredicate(HakemusListing._fieldGetter("rahoitusalue"), filter.answers))
            .filter(HakemusListing._filterTagsPredicate(HakemusListing._fieldGetter("tags"), filter.answers))
  }

  static _sortByArray(fieldGetter, array, order, userInfo, allowHakemusScoring) {
    return function(hakemus) {
      const sortValue = array.indexOf(fieldGetter(hakemus, userInfo, allowHakemusScoring))
      return order === 'asc' ? sortValue: -sortValue
    }
  }

  static _sortBy(userInfo, allowHakemusScoring) {
    return function(list, sorter) {
      switch (sorter.field) {
        case "status":
          return _.sortBy(list, HakemusListing._sortByArray(hakemus => hakemus.arvio.status, HakemusArviointiStatuses.statuses, sorter.order, userInfo, allowHakemusScoring))
      }
      return _.orderBy(list, HakemusListing._fieldGetter(sorter.field, userInfo, allowHakemusScoring), sorter.order)
    }
  }

  static _sort(list, sorterList, userInfo, allowHakemusScoring) {
    return _.reduce(sorterList, HakemusListing._sortBy(userInfo, allowHakemusScoring), list)

  }

  render() {
    const {controller, userInfo, state, hasSelected, selectedHakemus, previouslySelectedHakemus, hakemusList, privileges, avustushaku, environment, toggleSplitView} = this.props
    const avustushakuStatus = avustushaku.status
    const isResolved = avustushakuStatus === "resolved"
    const isAcademysize = avustushaku.is_academysize
    const filter = this.props.hakemusFilter
    const sorter = this.props.hakemusSorter
    const allowHakemusScoring = privileges["score-hakemus"]
    const allowChangeHakemusState = privileges["change-hakemus-state"]
    const filteredHakemusList = HakemusListing._sort(HakemusListing._filter(hakemusList, filter), sorter, userInfo, allowHakemusScoring)

    const notPayable = hakemusList.filter(
      h => h.arvio["should-pay"] === false || h.refused === true)
    const includesShouldNotPay = notPayable.length > 0
    const notPayCount = notPayable.length
    const notPayTitle = "Yhteensä: " + notPayCount + " kpl hakemuksia merkattu ei maksettavaksi."
    const notPayValue = "(" + notPayCount + ")"

    const anyPostModified = hakemusList.find(
      h => h["submitted-version"] && h["submitted-version"] !== h.version
    ) !== null

    const ophShareSum = HakemusListing.formatNumber(_.sum(filteredHakemusList.map(x => x["budget-oph-share"])))
    const hakemusElements = _.map(filteredHakemusList, hakemus => {
      return <HakemusRow
        key={hakemus.id}
        environment={environment}
        hakemus={hakemus}
        selectedHakemus={selectedHakemus}
        previouslySelectedHakemus={previouslySelectedHakemus}
        userInfo={userInfo}
        allowHakemusScoring={allowHakemusScoring}
        allowChangeHakemusState={allowChangeHakemusState}
        controller={controller}
        isResolved={isResolved}
        isAcademysize={isAcademysize}
        state={state}
        toggleSplitView={toggleSplitView}
        anyPostModified={anyPostModified}
        includesShouldNotPay={includesShouldNotPay}/> })
    const budgetGrantedSum = HakemusListing.formatNumber(_.sum(filteredHakemusList.map(x => x.arvio["budget-granted"])))

    const onFilterChange = function(filterId) {
      return function(e) {
        controller.setFilter(filterId, e.target.value)
      }
    }


    const hakemusListingClass = ClassNames('hakemus-list',{
      'hakemus-list--academysize': !isResolved && isAcademysize,
      'hakemus-list--resolved': isResolved
    })

    return (
      <div className="listing-table-container">
        <div id="hakemus-listing" className="listing-table hakemus-list-container">
          <table key="hakemusListing" className={hakemusListingClass}>
            <thead>
            <tr>
              <th className="organization-column">
                <input className="text-filter" placeholder="Hakijaorganisaatio" onChange={onFilterChange("organization")} value={filter.organization}></input>
                <HakemusSorter field="organization" sorter={sorter} controller={controller}/>
              </th>
              <th className="project-name-column">
                <input className="text-filter" placeholder="Asianumero tai hanke" onChange={onFilterChange("name")} value={filter.name}></input>
                <HakemusSorter field="name" sorter={sorter} controller={controller}/>
              </th>
              {!isResolved && <th className="score-column">Arvio <HakemusSorter field="score" sorter={sorter} controller={controller}/></th>}
              <th className="status-column">
                <StatusFilter controller={controller}
                              hakemusList={hakemusList}
                              filter={filter}
                              label="Tila"
                              statusValues={HakemusArviointiStatuses.statuses}
                              statusToFi={HakemusArviointiStatuses.statusToFI}
                              filterField="status"/>
                <HakemusSorter field="status" sorter={sorter} controller={controller}/>
              </th>
              <th className="muutoshakemus-column">
                <StatusFilter controller={controller}
                              hakemusList={hakemusList}
                              filter={filter}
                              label="Muutosh."
                              statusValues={Muutoshakemus.statuses}
                              statusToFi={Muutoshakemus.statusToFI}
                              filterField="status_muutoshakemus"/>
                <HakemusSorter field="status_muutoshakemus" sorter={sorter} controller={controller}/>
              </th>
              {!isResolved && <ChangeRequestHeader field="change-request" sorter={sorter} controller={controller} hakemusList={filteredHakemusList} />}
              {!isResolved && isAcademysize && <th className="academysize-column">Koko<HakemusSorter field="academysize" sorter={sorter} controller={controller}/></th>}
              {includesShouldNotPay && (
                <th className="should-pay-notification-column" title={notPayTitle}>
                  {notPayValue}
                </th>
              )}
              <th className="post-submit-notification-column"></th>
              {!isResolved && <th className="applied-sum-column">Haettu <HakemusSorter field="applied-sum" sorter={sorter} controller={controller}/></th>}
              {isResolved && <th className="selvitys-column">
                <StatusFilter controller={controller}
                              hakemusList={hakemusList}
                              filter={filter}
                              label="Välis."
                              statusValues={HakemusSelvitys.statuses}
                              statusToFi={HakemusSelvitys.statusToFI}
                              filterField="status_valiselvitys"/>
                <HakemusSorter field="status_valiselvitys" sorter={sorter} controller={controller}/>
              </th>}
              {isResolved && <th className="selvitys-column">
                <StatusFilter controller={controller}
                              hakemusList={hakemusList}
                              filter={filter}
                              label="Loppus."
                              statusValues={Loppuselvitys.statuses}
                              statusToFi={Loppuselvitys.statusToFI}
                              filterField="status_loppuselvitys"/>
                <HakemusSorter field="status_loppuselvitys" sorter={sorter} controller={controller}/>
              </th>}
              <th className="granted-sum-column">Myönnetty <HakemusSorter field="granted-sum" sorter={sorter} controller={controller}/></th>
              <th className="person-filter-column"><PersonFilterButton controller={controller} state={state}/></th>
            </tr>
            </thead>
            <tbody data-test-id="hakemus-list" className={hasSelected ? "has-selected" : ""}>
            {hakemusElements}
            </tbody>
          </table>
          <div className="listing-footer">
            <div className="total-applications-column">
              <ApplicationSummaryLink filteredHakemusList={filteredHakemusList} hakemusList={hakemusList} controller={controller} />
            </div>
            <div className="right-side">
              <div className="applied-sum-column">{!isResolved && <span className="money">{ophShareSum}</span>}</div>
              <div className="granted-sum-column"><span className="money">{budgetGrantedSum}</span></div>
              <div className="person-filter-column"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  static formatNumber (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ")
  }
}

class ApplicationSummaryLink extends Component {
  render() {
    const {filteredHakemusList, hakemusList, controller} = this.props
    const disabled = _.isEmpty(filteredHakemusList)
    const linkText = filteredHakemusList.length + "/" + hakemusList.length + " hakemusta"
    return disabled ? <span>{linkText}</span> : <a className="summary-link" href="/yhteenveto/" target="_blank" onClick={onClick}>{linkText}</a>

    function onClick() {
      controller.gotoSavedSearch(filteredHakemusList)
    }
  }
}

class HakemusSorter extends Component {

  constructor(props) {
    super(props)
    this.isSortedByField = this.isSortedByField.bind(this)
    this.onSorterClick = this.onSorterClick.bind(this)
    this.render = this.render.bind(this)
  }

  isSortedByField() {
    return !_.isEmpty(_.find(this.props.sorter, sorter => sorter.field === this.props.field))
  }

  onSorterClick() {
    const field = this.props.field
    const sorter = _.find(this.props.sorter, sorter => sorter.field === field)
    let currentOrder = _.get(sorter, "order", "")
    const controller = this.props.controller

    if (this.props.sorter.length > 1) {
      currentOrder = "desc"
    } else if (currentOrder === "desc") {
      currentOrder = "asc"
    } else {
      currentOrder = "desc"
    }
    controller.setSorter([{field: field, order: currentOrder}])
  }

  render() {
    const field = this.props.field
    const sorter = _.find(this.props.sorter, sorter => sorter.field === field)
    const sort = _.get(sorter, "order", "")
    let sortedClass = "sort sort-none"
    if (this.isSortedByField()) {
      if (sort === "") {
        sortedClass = "sort sort-desc"
      } else {
        sortedClass = sort === "asc" ? "sort sort-asc" : "sort sort-desc"
      }
    }

    return (
      <div className="sorter">
        <a onClick={this.onSorterClick} className={sortedClass}/>
      </div>
    )
  }
}

class ChangeRequestHeader extends HakemusSorter {
  constructor(props) {
    super(props)
  }

  onSorterClick() {
    super.onSorterClick()
  }

  render(){
    const hakemusList = this.props.hakemusList
    const kplChangeRequest = _.filter(hakemusList, HakemusListing._filterWithArrayPredicate(hakemus => hakemus.status, ["pending_change_request"])).length
    const kplOfficerEdit = _.filter(hakemusList, HakemusListing._filterWithArrayPredicate(hakemus => hakemus.status, ["officer_edit"])).length
    const total = kplChangeRequest + kplOfficerEdit
    const value = total > 0 ? `(${total})` : ""
    const title = total > 0 ? `${total} odottaa täydennystä (hakijalta:${kplChangeRequest}, virkailijalta:${kplOfficerEdit})` : "Ei avoimia täydennyspyyntöjä"
    return (
      <th className="change-request-column" onClick={this.onSorterClick} title={title} >{value}</th>
    )
  }
}

class StatusFilter extends Component {
  constructor(props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
    this.render = this.render.bind(this)
    this.state = { open: false }
  }

  handleClick() {
    this.setState({
      open: !this.state.open
    })
  }

  render() {
    const {controller, hakemusList, label,statusValues,statusToFi,filterField} = this.props
    const statusFilter = this.props.filter[filterField]
    const statuses = []
    const onCheckboxChange = function(status) {
      return function() {
        if (_.includes(statusFilter, status)) {
          controller.setFilter(filterField,  _.without(statusFilter, status))
        } else {
          controller.setFilter(filterField, _.union(statusFilter, [status]))
        }
      }
    }

    const self = this
    const onDelete = function() {
      self.setState({
        open: false
      })
      controller.setFilter(filterField, statusValues)
    }
    const hasFilters = statusFilter.length !== statusValues.length

    for (let i = 0; i < statusValues.length; i++) {
      const status = statusValues[i]
      const checked = _.includes(statusFilter, status)
      const htmlId = `filter-by-${filterField}-${status}`
      const kpl = _.filter(hakemusList, HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter(filterField), [status])).length
      statuses.push(
        <div key={status}>
          <input id={htmlId} type="checkbox" checked={checked} onChange={onCheckboxChange(status)} value={statusValues[status]}/>
          <label htmlFor={htmlId}>{statusToFi(status)} ({kpl})</label>
        </div>
      )
    }
    return (
      <div className="status-filter">
        <a onClick={this.handleClick}>{label}</a>
        <button type="button" hidden={!hasFilters} onClick={onDelete} className="filter-remove" alt="Poista tilojen rajaukset" title="Poista tilojen rajaukset" tabIndex="-1" />
        <div className="status-filter-popup popup-box-shadow" hidden={!this.state.open}>
          {statuses}
        </div>
      </div>
    )
  }
}

class HakemusRow extends Component {
  shouldComponentUpdate() {
    return this.props.hakemus === this.props.selectedHakemus || this.props.hakemus === this.props.previouslySelectedHakemus
  }
  render() {
    const {
      allowChangeHakemusState,
      allowHakemusScoring,
      anyPostModified,
      controller,
      environment,
      hakemus,
      includesShouldNotPay,
      isAcademysize,
      isResolved,
      previouslySelectedHakemus,
      selectedHakemus,
      state,
      userInfo,
      toggleSplitView
    } = this.props
    const htmlId = "hakemus-" + hakemus.id
    const thisIsSelected = hakemus === selectedHakemus || hakemus === previouslySelectedHakemus
    const rowClass = thisIsSelected ? "selected overview-row" : "unselected overview-row"
    const statusFI = HakemusArviointiStatuses.statusToFI(hakemus.arvio.status)
    const statusLoppuselvitys = Loppuselvitys.statusToFI(hakemus["status-loppuselvitys"])
    const statusValiselvitys = HakemusSelvitys.statusToFI(hakemus["status-valiselvitys"])
    const muutoshakemusStatus = HakemusListing._fieldGetter("status_muutoshakemus")(hakemus)
    const decoratedMuutoshakemusStatus = `${muutoshakemusStatus === 'new' ? '&#9734; ' : ''}${Muutoshakemus.statusToFI(muutoshakemusStatus)}`
    const changeRequest = HakemusListing._fieldGetter("change-request")(hakemus)
    const statusComment = hakemus["status-comment"] ? ":\n" + hakemus["status-comment"] : ""
    const changeRequestTitle = changeRequest ? "Odottaa täydennystä" + statusComment : ""
    const postSubmitModified = hakemus["submitted-version"]
          && hakemus["submitted-version"] !== hakemus.version
    let hakemusName = ""

    if (_.isEmpty(hakemus["project-name"])) {
      hakemusName = hakemus["register-number"]
    } else {
      hakemusName = hakemus["project-name"] + " (" + hakemus["register-number"] + ")"
    }
    const showNotPayIcon = "should-pay" in hakemus.arvio && hakemus.arvio["should-pay"] !== null && !hakemus.arvio["should-pay"]

    return <tr id={htmlId} className={rowClass} onClick={() => controller.selectHakemus(hakemus.id)}>
      <td className="organization-column" title={hakemus["organization-name"]}>
        {hakemus["organization-name"]}
      </td>
      <td className="project-name-column" title={hakemusName}>
        {hakemusName}
      </td>
      {!isResolved && (
        <td className="score-column">
          <Scoring scoring={hakemus.arvio.scoring} userInfo={userInfo} allowHakemusScoring={allowHakemusScoring}/>
        </td>
      )}
      <td className="status-column">
        {statusFI}
      </td>
      <td
        className={`muutoshakemus-values ${muutoshakemusStatus}`}
        dangerouslySetInnerHTML={{ __html: decoratedMuutoshakemusStatus }}
        data-test-id={`muutoshakemus-status-${hakemus.id}`}
      />
      {!isResolved && (
        <td className="change-request-column" title={changeRequestTitle}>
          {changeRequest}
        </td>
      )}
      {includesShouldNotPay && (
        <td className="should-pay-notification-column">
          <ShouldPayIcon controller={controller} hakemus={hakemus} state={state} show={showNotPayIcon}/>
          {hakemus.refused && <span title={hakemus["refused-comment"]}>H</span>}
        </td>
      )}
      {anyPostModified && (
        <td className="post-submit-notification-column">
          {postSubmitModified ?
            <span title="Hakija on muokannut hakemusta lähettämisen jälkeen.">
              H
            </span> : null}
        </td>
      )}
      {!isResolved && isAcademysize && (
        <td className="academysize-column">
          {hakemus.arvio.academysize}
        </td>
      )}
      {!isResolved && (
        <td className="applied-sum-column">
          <span className="money">{HakemusListing.formatNumber(hakemus["budget-oph-share"])}</span>
        </td>
      )}
      {isResolved && <td data-test-id="väliselvitys-column" className="selvitys-column selvitys-value">{statusValiselvitys}</td>}
      {isResolved && <td data-test-id="loppuselvitys-column" className="selvitys-column selvitys-value">{statusLoppuselvitys}</td>}
      <td className="granted-sum-column">
        <span className="money">{HakemusListing.formatNumber(hakemus.arvio["budget-granted"])}</span>
      </td>
      <td className="person-filter-column">
        {allowChangeHakemusState
          ? <PersonSelectButton controller={controller} hakemus={hakemus} state={state} toggleSplitView={toggleSplitView}/>
          : <span />
        }
      </td>
    </tr>
  }
}


class Scoring extends Component {
  render() {
    const { userInfo, allowHakemusScoring, scoring } = this.props
    const meanScore = effectiveAverage(scoring, userInfo, allowHakemusScoring)
    const normalizedMeanScore = meanScore + 1
    const starElements = _.map(_.range(4), indexOfStar => {
      const isVisible = Math.ceil(meanScore) >= indexOfStar
      const starImage = isVisible ? "/virkailija/img/star_on.png" : "/virkailija/img/star_off.png"

      let className = "single-score"

      const needsScaling = normalizedMeanScore > indexOfStar && normalizedMeanScore < indexOfStar + 1
      if (needsScaling) {
        const delta = normalizedMeanScore - indexOfStar
        if (delta <= 0.25) {
          className = "single-score-0"
        } else if (delta <= 0.5) {
          className = "single-score-25"
        } else if (delta <= 0.75) {
          className = "single-score-50"
        } else {
          className = "single-score-75"
        }
      }
      return (<img key={indexOfStar} className={className} src={starImage} />)
    })

    const titleText = _.isUndefined(meanScore) ?
      (allowHakemusScoring ? "Pisteytä hakemus jokaisen valintaperusteen mukaan nähdäksesi kaikkien arvioiden keskiarvon" : null ) :
      createAverageSummaryText(scoring, userInfo)

    return (
      <div className="list-score-row" title={titleText}>
        {starElements}
      </div>
    )
  }
}
