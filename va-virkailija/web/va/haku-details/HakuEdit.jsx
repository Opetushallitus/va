import React, { Component } from 'react'

import HakuStatus from "../avustushaku/HakuStatus.jsx"
import { BasicInfoComponent }from 'va-common/web/form/component/InfoElement.jsx'

export default class HakuEdit extends Component {
  render() {
    const controller = this.props.controller
    const avustushaku = this.props.avustushaku
    const environment = this.props.environment
    const previewUrlFi = environment["hakija-server"].url.fi + "avustushaku/" + avustushaku.id + "/nayta?lang=fi"
    const previewUrlSv = environment["hakija-server"].url.sv + "avustushaku/" + avustushaku.id + "/nayta?lang=sv"

    const onChange = e => {
      controller.onChangeListener(avustushaku, e.target, e.target.value)
    }

    return (
      <div id="haku-edit">
        <h2>Muokkaa avustushakua</h2>
        <table id="name">
          <thead><tr><th>Haun nimi</th><th>Haun nimi ruotsiksi</th></tr></thead>
          <tbody><tr>
            <td><textarea onChange={onChange} rows="2" maxLength="200" id="haku-name-fi" value={avustushaku.content.name.fi}/></td>
            <td><textarea onChange={onChange} rows="2" maxLength="200" id="haku-name-sv" value={avustushaku.content.name.sv}/></td>
          </tr></tbody>
        </table>
        <div>
          <h3>{avustushaku.content.duration.label.fi}</h3>
          <DateField id="hakuaika-start" onChange={onChange} value={avustushaku.content.duration.start} disabled={avustushaku.status === "published"} />
          <span className="dateDivider" />
          <DateField id="hakuaika-end" onChange={onChange} value={avustushaku.content.duration.end} disabled={avustushaku.status === "published"} />
        </div>
        <div>
          <h3>Hakulomakkeen esikatselu</h3>
          <a target="haku-preview-fi" href={previewUrlFi}>Suomeksi</a><span className="linkDivider"/><a target="haku-preview-sv" href={previewUrlSv}>Ruotsiksi</a>
        </div>
        <SetStatus currentStatus={avustushaku.status} onChange={onChange} />
        <SelectionCriteria controller={controller} avustushaku={avustushaku} onChange={onChange} />
        <div><h3>Hakijan omarahoitusvaatimus</h3><input className="percentage" required="true" maxLength="2" min="0" max="99" id="haku-self-financing-percentage" onChange={onChange} disabled={avustushaku.status === "published"} type="number" value={avustushaku.content["self-financing-percentage"]} /><span>%</span></div>
      </div>
    )
  }
}

class DateField extends React.Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
    const dateStr = BasicInfoComponent.asDateString(this.props.value) + " " + BasicInfoComponent.asTimeString(this.props.value)
    this.state = {value: dateStr}
  }

  componentWillReceiveProps(nextProps) {
    if(this.props.value !== nextProps.value) {
      const dateStr = BasicInfoComponent.asDateString(nextProps.value) + " " + BasicInfoComponent.asTimeString(nextProps.value)
      this.setState({value: dateStr})
    }
  }

  handleChange(event) {
    this.setState({value: event.target.value})
  }

  render() {
    const id = this.props.id
    const onChange = this.props.onChange
    const disabled = this.props.disabled
    const value = this.state.value
    return <input className="date" maxLength="16" size="16" type="text" id={id} onChange={this.handleChange} onBlur={onChange} value={value} disabled={disabled}/>
  }
}

class SelectionCriteria extends React.Component {
  render() {
    const avustushaku = this.props.avustushaku
    const selectionCriteria = avustushaku.content['selection-criteria']
    const controller = this.props.controller
    const onChange = this.props.onChange
    const criteriaItems = []
    for (var index=0; index < selectionCriteria.items.length; index++) {
      const htmlId = "selection-criteria-" + index + "-"
      criteriaItems.push(
        <tr key={index}>
          <td><textarea onChange={onChange} rows="2" id={htmlId + "fi"} value={selectionCriteria.items[index].fi}/></td>
          <td><textarea onChange={onChange} rows="2" id={htmlId + "sv"} value={selectionCriteria.items[index].sv}/></td>
          <td><button className="remove" onClick={controller.deleteSelectionCriteria(avustushaku, index)} alt="Poista" title="Poista" tabIndex="-1" disabled={avustushaku.status === "published"} /></td>
        </tr>
      )
    }

    return (
      <table id="selection-criteria">
        <thead><tr><th>{selectionCriteria.label.fi}</th><th>{selectionCriteria.label.sv}</th></tr></thead>
        <tbody>
        {criteriaItems}
        </tbody>
        <tfoot><tr><td><button disabled={avustushaku.status === "published"} onClick={controller.addSelectionCriteria(avustushaku)}>Lisää uusi valintaperuste</button></td></tr></tfoot>
      </table>
    )
  }
}

class SetStatus extends React.Component {
  render() {
    const currentStatus = this.props.currentStatus
    const onChange = this.props.onChange
    const statuses = []
    const statusValues = ['deleted', 'draft', 'published'];
    for (var i=0; i < statusValues.length; i++) {
      const status = statusValues[i]
      const htmlId = "set-status-" + status
      statuses.push(
        <input id={htmlId}
               type="radio"
               key={htmlId}
               name="status"
               value={status}
               onChange={onChange}
               checked={status === currentStatus ? true: null}
               disabled={status === 'deleted' && currentStatus === 'published'}
            />
      )
      statuses.push(
        <label key={htmlId + "-label"}
               htmlFor={htmlId}>
          <HakuStatus status={statusValues[i]}/>
        </label>
      )
    }

    return (
      <div>
        <h3>Tila</h3>
        {statuses}
      </div>
    )
  }
}
