import React, { Component } from 'react'
import _ from 'lodash'
import ClassNames from 'classnames'

import {
  scoreToFI,
  createAverageSummaryText,
  myScoringIsComplete,
  scoringByOid,
  othersScorings
} from '../ScoreResolver'
import HelpTooltip from '../HelpTooltip'

export default class HakemusScoring extends Component {
  render() {
    const controller = this.props.controller
    const hakemus = this.props.hakemus
    const allowHakemusScoring = this.props.allowHakemusScoring
    const allScoresOfHakemus = hakemus.scores
    const scoringOfHakemus = hakemus.arvio ? hakemus.arvio.scoring : undefined
    const myUserInfo = this.props.userInfo
    const allowSeeingOthersScores = scoringOfHakemus && myScoringIsComplete(scoringOfHakemus, myUserInfo) || !allowHakemusScoring
    const showOthersScores = this.props.showOthersScores && allowSeeingOthersScores

    const avustushaku = this.props.avustushaku
    const helpTexts = this.props.helpTexts
    const valintaperusteet = _.get(avustushaku, "content.selection-criteria.items")
    const myOwnValintaPerusteRows = HakemusScoring.createValintaPerusteRows(allScoresOfHakemus,
      valintaperusteet, myUserInfo["person-oid"], allowHakemusScoring, controller)
    const othersScoreDisplays = showOthersScores ?
      HakemusScoring.createOthersScoreDisplays(allScoresOfHakemus, scoringOfHakemus, valintaperusteet, myUserInfo) : undefined
    return valintaperusteet && valintaperusteet.length > 0
      ? (
          <div key="hakemus-scoring-container" id="hakemus-scoring-container" className="hakemus-arviointi-section">
            <label>Valintaperusteet:</label>
            <HelpTooltip testId={"tooltip-valintaperusteet"} content={helpTexts["hankkeen_sivu__arviointi___valintaperusteet"]} direction={"arviointi"} />
           <table className="valintaperuste-list">
              <tbody>
              {myOwnValintaPerusteRows}
              </tbody>
            </table>
            <SeeOthersScores showOthersScores={showOthersScores}
                             scoring={scoringOfHakemus}
                             userInfo={myUserInfo}
                             allowSeeingOthersScores={allowSeeingOthersScores}
                             controller={controller} />
            {othersScoreDisplays}
          </div>
        )
      : null
  }

  static createValintaPerusteRows(allScoresOfHakemus, valintaperusteet, personOid, allowHakemusScoring, controller) {
    let perusteIndex = 0
    return _.map(valintaperusteet, peruste => { return <ValintaPerusteRow valintaperuste={peruste}
                                                                          scores={findScores(perusteIndex)}
                                                                          selectionCriteriaIndex={perusteIndex}
                                                                          personOid={personOid}
                                                                          key={personOid + perusteIndex++}
                                                                          allowHakemusScoring={allowHakemusScoring}
                                                                          controller={controller} /> })

    function findScores(perusteIndex) {
      return _.filter(allScoresOfHakemus, s => { return s["selection-criteria-index"] === perusteIndex })
    }
  }

  static createOthersScoreDisplays(allScoresOfHakemus, scoringOfHakemus, valintaperusteet, myUserInfo) {
    const othersPersonOids = _.map(othersScorings(scoringOfHakemus, myUserInfo), s => { return s["person-oid"]})
    return _.map(othersPersonOids, oid => {
      const userScoring = scoringByOid(scoringOfHakemus, oid)
      const userLabel = userScoring["first-name"] + " " + userScoring["last-name"]
      return (
        <table key={"peruste-list-of" + oid} className="valintaperuste-list">
          <thead>
            <tr>
              <th className="valintaperuste-scoring-user">{userLabel}</th>
            </tr>
          </thead>
          <tbody>
            {HakemusScoring.createValintaPerusteRows(allScoresOfHakemus, valintaperusteet, oid, false, null)}
          </tbody>
        </table>
      )
    })
  }
}

class ValintaPerusteRow extends Component {
  render() {
    const valintaperuste = this.props.valintaperuste
    const selectionCriteriaIndex = this.props.selectionCriteriaIndex
    const allScoresOfThisPeruste = this.props.scores
    const allowHakemusScoring = this.props.allowHakemusScoring
    const personOid = this.props.personOid
    const controller = this.props.controller
    const scoreOfUser = _.find(allScoresOfThisPeruste, s => { return s["person-oid"] === personOid })
    const scoreOfUserFi = scoreToFI(scoreOfUser ? scoreOfUser.score : null)
    const starElements = _.map(_.range(4), i => <StarElement key={i}
                                                             index={i}
                                                             scoreOfUser={scoreOfUser}
                                                             selectionCriteriaIndex={selectionCriteriaIndex}
                                                             allowHakemusScoring={allowHakemusScoring}
                                                             controller={controller} />)

    const textInFinnish = valintaperuste.fi
    const textInSwedish = valintaperuste.sv

    return (
      <tr className="single-valintaperuste">
        <td className="valintaperuste-text" title={textInFinnish + " / " + textInSwedish}>{textInFinnish}</td>
        <td className="score-row">
          {starElements}
          <div className="score-text">{scoreOfUserFi}</div>
        </td>
      </tr>
    )
  }
}

class StarElement extends Component {

  createOnClickHandler(index, score) {
    const {controller, scoreOfUser} = this.props
    return () => {
      if (scoreOfUser && score === scoreOfUser.score) {
        controller.removeScore(index)
      } else {
        controller.setScore(index, score)
      }
    }
  }

  render() {
    const indexOfStar = this.props.index
    const starTitle = scoreToFI(indexOfStar)
    const scoreOfUser = this.props.scoreOfUser
    const allowHakemusScoring = this.props.allowHakemusScoring
    const selectionCriteriaIndex = this.props.selectionCriteriaIndex
    const starVisible = scoreOfUser && scoreOfUser.score >= indexOfStar
    const starImage = starVisible ? "/virkailija/img/star_on.png" : "/virkailija/img/star_off.png"

    const controller = this.props.controller
    const enableEditing = allowHakemusScoring && !_.isUndefined(controller)
    const classNames = ClassNames("single-score", {editable: enableEditing})
    const onClick = enableEditing ?
          this.createOnClickHandler(selectionCriteriaIndex, indexOfStar) :
          undefined
    const showHover = enableEditing && !starVisible ? event => { event.target.setAttribute("src", "/virkailija/img/star_hover.png") } : undefined
    const hideHover = enableEditing && !starVisible ? event => { event.target.setAttribute("src", starImage)} : undefined
    return <img className={classNames}
                src={starImage}
                title={starTitle}
                onClick={onClick}
                onMouseOver={showHover}
                onMouseOut={hideHover}/>
  }
}

class SeeOthersScores extends Component {
  render() {
    const controller = this.props.controller
    const scoring = this.props.scoring
    const userInfo = this.props.userInfo
    const allowSeeingOthersScores = this.props.allowSeeingOthersScores
    const showOthersScores = this.props.showOthersScores
    const othersScoringsCount = allowSeeingOthersScores && scoring ? othersScorings(scoring, userInfo).length : 0
    const classNames = ClassNames("see-others-scoring", {disabled: !allowSeeingOthersScores || othersScoringsCount === 0})

    const labelText = resolveLabelText()
    const titleText = allowSeeingOthersScores ? createAverageSummaryText(scoring, userInfo) : undefined

    const onClick = e => {
      e.preventDefault()
      if (othersScoringsCount > 0) {
        controller.toggleOthersScoresDisplay()
      }
    }

    return <div className={classNames}>
      <a title={titleText} onClick={onClick}>{labelText}</a>
    </div>

    function resolveLabelText() {
      if (!allowSeeingOthersScores) {
        return ""
      }
      if (othersScoringsCount === 0) {
        return "Ei arvioita muilta"
      }
      return showOthersScores ? "Piilota muiden arviot" : "Katso muiden arviot (" + othersScoringsCount + ")"
    }
  }
}
