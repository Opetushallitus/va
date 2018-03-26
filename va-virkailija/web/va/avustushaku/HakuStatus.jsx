import React, { Component } from 'react'

export default class HakuStatus extends Component {
  render() {
    const status = this.props.status
    let value = status
    switch(status) {
      case "new":
        value = "Uusi"
        break
      case "draft":
        value = "Luonnos"
        break
      case "published":
        value = "Julkaistu"
        break
      case "resolved":
        value = "Ratkaistu"
        break
      case "deleted":
        value = "Poistettu"
        break
    }
    return (
      <span className={status}>{value}</span>
    )
  }
}
