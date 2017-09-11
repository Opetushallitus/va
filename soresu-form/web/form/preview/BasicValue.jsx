import React from 'react'
import PreviewComponent from './PreviewComponent.jsx'

export default class BasicValue extends PreviewComponent {
  render() {
    var value = "\u00a0" //&nbsp;
    if (this.props.value) {
      value = this.props.value
    }
    return super.render(<span className="soresu-value" id={this.props.htmlId}>{value}</span>)
  }
}