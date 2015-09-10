import React from 'react'
import Translator from 'va-common/web/form/Translator'
import BasicFieldComponent from 'va-common/web/form/component/BasicFieldComponent.jsx'

export default class RadioButton extends BasicFieldComponent {
  render() {
    const props = this.props;
    const radiobuttons = [];

    if (props.options) {
      for (var i=0; i < props.options.length; i++) {
        const label = new Translator(props.options[i]).translate("label", props.lang, props.options[i].value)
        radiobuttons.push(<input type="radio" id={props.htmlId + ".radio." + i}
                                 key={props.htmlId + "." + props.options[i].value}
                                 name={props.htmlId}
                                 disabled={props.disabled}
                                 value={props.options[i].value}
                                 onChange={props.onChange}
                                 checked={props.options[i].value === props.value ? true: null} />)
        radiobuttons.push(
          <label key={props.htmlId + "." + props.options[i].value + ".label"}
                 htmlFor={props.htmlId + ".radio." + i}>
            {label}
          </label>
        )
      }
    }
    return (<div className="soresu-radio">
      {this.label()}
      {radiobuttons}
    </div>)
  }
}
