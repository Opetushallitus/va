import React from 'react'
import _ from 'lodash'
import Bacon from 'baconjs'
import HelpTooltip from '../HelpTooltip.jsx'

export default class PresenterComment extends React.Component {

  constructor(props) {
    super(props)
    this.state = initialState(props)
    this.changeBus = new Bacon.Bus()
    this.changeBus.debounce(1000).onValue(([hakemus, value]) => { this.props.controller.setPresenterComment(hakemus, value) })
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState(initialState(nextProps))
    }
  }

  render() {
    const onChange = (e)=> {
      const value = e.target.value
      this.setState({value: value})
      this.changeBus.push([this.props.hakemus, value])
    }
    return (
      <div className="value-edit">
        <label>Valmistelijan huomiot <HelpTooltip content={this.props.helpTexts["hankkeen_sivu__arviointi___valmistelijan_huomiot"]} direction={"valmistelijan-huomiot"} /> </label>
        <textarea rows="5" value={this.state.value} onChange={onChange}></textarea>
      </div>
    )
  }
}


function initialState(props){
  const value = _.get(props.hakemus, "arvio.presentercomment") || ""
  return {value: value}
}
