import React from 'react'
import PreviewComponent from './PreviewComponent.jsx'

export default class IntegerValue extends PreviewComponent {
  render() {
    let value = "\u00a0" //&nbsp;
    if (this.props.value) {
      value = this.props.value
    }
    return super.render(<span className="soresu-integer" id={this.props.htmlId}>{value}</span>)
  }
}
