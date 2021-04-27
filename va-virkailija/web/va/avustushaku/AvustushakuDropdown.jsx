import React, { Component } from 'react'
import _ from 'lodash'

import DropdownList from 'react-widgets/lib/DropdownList';
import moment from 'moment-timezone'

import './avustushaku-dropdown.less'

export default class AvustushakuDropdown extends Component {
  render() {
    const avustushaku = this.props.avustushaku
    const avustushakuList = this.props.avustushakuList
    const avustushakuToText = (avustushaku) => {
      const name = _.get(avustushaku, 'content.name.fi', "")
      const date = moment(_.get(avustushaku, 'content.duration.start', "")).tz('Europe/Helsinki').format('D.M.YYYY')
      return name + " (" + date + ")"
    }
    const onChange = (value) => {
      location.path = "/avustushaku/" + value.id
      window.location.href = "/avustushaku/" + value.id + "/" + location.search
    }
    const messages = {
      filterPlaceholder: '',
      emptyList: 'Ei avustushakuja',
      emptyFilter: 'Ei tuloksia'
    }
    const scrollListToTopForIE = opening => {
      if (opening) {
        setTimeout(() => {
          document.getElementById('rw_1__listbox').scrollTop = 0
        }, 100)
      }
    }
    return <div id="avustushaku-dropdown">
             <DropdownList valueField="id"
                           textField={avustushakuToText}
                           data={avustushakuList}
                           defaultValue={avustushaku}
                           valueComponent={AvustushakuEntry}
                           caseSensitive={false}
                           minLength={3}
                           filter='contains'
                           duration={0}
                           onChange={onChange}
                           messages={messages}
                           onToggle={scrollListToTopForIE}/>
           </div>
  }
}

class AvustushakuEntry extends React.Component {
  render() {
    const name = this.props.item.content.name.fi
    const date = moment(this.props.item.content.duration.start).tz('Europe/Helsinki').format('D.M.YYYY')
    return <span>
             {name}&nbsp;({date})
           </span>
  }
}
