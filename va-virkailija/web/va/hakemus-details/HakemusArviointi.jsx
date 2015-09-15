import React, { Component } from 'react'

import HakemusStatus from "./HakemusStatus.jsx"

export default class HakemusArviointi extends Component {
  render() {
    const hakemus = this.props.hakemus
    const arvio = hakemus.arvio
    const status = arvio.status
    const statuses = []
    const statusValues = ['unhandled', 'plausible', 'rejected', 'accepted'];
    for (var i=0; i < statusValues.length; i++) {
      const htmlId = "set-status-" + statusValues[i]
      statuses.push(
        <input id={htmlId}
               type="radio"
               key={htmlId}
               name="status"
               value={statusValues[i]}
               checked={statusValues[i] === status ? true: null}
        />
      )
      statuses.push(
        <label key={htmlId + "-label"}
               htmlFor={htmlId}>
          <HakemusStatus status={statusValues[i]}/>
        </label>
      )
    }
    return (
     <div id="hakemus-arviointi">
       <h2>Tila</h2>
       {statuses}
     </div>
    )
  }
}
