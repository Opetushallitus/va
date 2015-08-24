import React from 'react'
import Translator from './../Translator.js'

export default class LocalizedString extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    const translator = new Translator(this.props.translations)
    const value = translator.translate(this.props.translationKey, this.props.lang, this.props.defaultValue, this.props.keyValues)
    return (<span hidden={this.props.hidden} className={this.props.className} onClick={this.props.onClick}>{value}</span>)
  }
}
