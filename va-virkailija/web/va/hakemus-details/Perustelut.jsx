import Bacon from 'baconjs'
import React from 'react'
import _ from "lodash"
import rejectedReasonsByLanguage from './rejectedReasonsByLanguage.json'
import HelpTooltip from '../HelpTooltip.jsx'
export default class Perustelut extends React.Component {

  constructor(props) {
    super(props)
    this.reasonBus = new Bacon.Bus()
    this.reasonBus.debounce(1000).onValue(([hakemus, newReason]) => { this.props.controller.setArvioPerustelut(hakemus, newReason) })
    this.state = initialState(props)
  }

  reasonUpdated(newReason) {
    this.setState({perustelut: newReason})
    this.reasonBus.push([this.props.hakemus, newReason])
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState(initialState(nextProps))
    }
  }

  render() {
    const hakemus = this.props.hakemus
    const allowEditing = this.props.allowEditing
    // _.get default value parameter only works with undefined, we get nulls also here
    // and that causes the attribute to go missing from the resulting HTML tag
    // which causes nasty issues with React, unless we explicitly set this to
    // empty string here
    const controller = this.props.controller
    const helpTexts = this.props.helpTexts
    const addReason = (reason) => {
      const currentPerustelut = getPerustelut(this.props)
      const newPerustelut = currentPerustelut.length === 0 ?
            reason : currentPerustelut + " " + reason
      controller.setArvioPerustelut(hakemus, newPerustelut)
      this.setState({perustelut: newPerustelut,showReasons:false})
      setTimeout(function() {
        document.getElementById("perustelut-container").scrollIntoView({block: "start", behavior: "smooth"})
        document.getElementById("perustelut").focus()
      }, 300)
    }
    const rejected = _.get(hakemus,"arvio.status","") === "rejected"
    const languageTitle = hakemus.language === "fi" ? "suomeksi" : "ruotsiksi"
    const rejectedReasons = rejectedReasonsByLanguage[hakemus.language]
    const toggleReasons = () => this.setState({showReasons:!this.state.showReasons})

    return(
      <div>
        <div className="value-edit" id="perustelut-container">
          <label htmlFor="perustelut">Perustelut hakijalle <strong>{languageTitle}</strong></label>
          <HelpTooltip testId={"tooltip-perustelut"} content={helpTexts["hankkeen_sivu__arviointi___perustelut_hakijalle_suomeksi"]} direction={"arviointi-slim"} />
          {rejected && <a onClick={toggleReasons}>{this.state.showReasons ? "Piilota perustelut" : "Lisää vakioperustelu"}</a>}
          {
            rejected &&
              <div className="radio-container radio-container--perustelut" hidden={!this.state.showReasons}>
                {rejectedReasons.map((reason) =>
                  <div key={reason} className="radio-row">
                    <div onClick={_.partial(addReason,reason)}>{reason}</div>
                  </div>
                )}
              </div>
          }
          <textarea id="perustelut"
                    rows="5"
                    disabled={!allowEditing}
                    value={this.state.perustelut}
                    onChange={(evt) => this.reasonUpdated(evt.target.value)} />
        </div>
      </div>
    )
  }
}

function initialState(props){
  const perustelut = getPerustelut(props)
  return {perustelut: perustelut, showReasons:perustelut.length === 0}
}

function getPerustelut(props) {
  return _.get(props.hakemus, "arvio.perustelut") || ""
}
