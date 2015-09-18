import React, { Component } from 'react'

import { BasicInfoComponent }from 'va-common/web/form/component/InfoElement.jsx'

export default class HakuListing extends Component {
  render() {
    const hakuList = this.props.hakuList
    const selectedHaku = this.props.selectedHaku
    const controller = this.props.controller
    const hakuElements = _.map(hakuList, haku => {
      return <HakuRow haku={haku} key={haku.id} selectedHaku={selectedHaku} controller={controller}/> })
    return (
      <table key="hakuListing" className="haku-list overview-list">
        <thead><tr>
          <th className="name-column">Avustushaku</th>
          <th className="start-column">Alkaa</th>
          <th className="end-column">Loppuu</th>
        </tr></thead>
        <tbody>
          {hakuElements}
        </tbody>
      </table>
    )
  }
}

class HakuRow extends Component {

  toDateStr(dateTime) {
    return BasicInfoComponent.asDateString(dateTime) + ' ' + BasicInfoComponent.asTimeString(dateTime)
  }

  render() {
    const haku = this.props.haku
    const htmlId = "haku-" + haku.id
    const thisIsSelected = haku === this.props.selectedHaku
    const rowClass = thisIsSelected ? "selected overview-row" : "unselected overview-row"
    const controller = this.props.controller
    return <tr id={htmlId} className={rowClass} onClick={controller.selectHaku(haku)}>
      <td className="name-column">{haku.content.name.fi}</td>
      <td className="start-column">{this.toDateStr(haku.content.duration.start)}</td>
      <td className="end-column">{this.toDateStr(haku.content.duration.end)}</td>
    </tr>
  }
}
