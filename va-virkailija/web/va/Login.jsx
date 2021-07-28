import "soresu-form/web/polyfills"

import React from 'react'
import ReactDOM from 'react-dom'
import * as Bacon from 'baconjs'
import queryString from 'query-string'

import HttpUtil from 'soresu-form/web/HttpUtil'

import './style/virkailija.less'
import './style/topbar.less'
import './style/login.less'

import TopBar from './TopBar.tsx'

export default class Login extends React.Component {
  render() {
    const model = this.props.model
    const environment =  model.environment
    const opintopolku =  environment.opintopolku
    const query = queryString.parse(location.search)
    const errorMessage = (<div className="error">Sisäänkirjautuminen epäonnistui.</div>)
    const notPermittedMessage = (<div className="error">Sinulla ei ole oikeuksia valtionavustusjärjestelmään.</div>)
    const error = query.error === "true" ? errorMessage : undefined
    const notPermitted = query["not-permitted"] === "true" ? notPermittedMessage : undefined
    return (
      <div>
        <TopBar environment={environment}/>
        <section id="container">
          <div className="row">{notPermitted}</div>
          <div className="row">{error}</div>
          <div hidden={notPermitted} className="row"><a href="/">Kirjaudu sisään</a></div>
          <div hidden={!notPermitted} className="row">
            <a href={opintopolku.url + opintopolku["permission-request"]}>Ano lisää oikeuksia</a> tai <a href="/login/logout">kirjaudu ulos</a> opintopolusta
          </div>
        </section>
      </div>
    )
  }
}

const environmentP = Bacon.fromPromise(HttpUtil.get("/environment"))

const initialStateTemplate = {
  environment: environmentP
}

const initialState = Bacon.combineTemplate(initialStateTemplate)

initialState.onValue(function(state) {
  const properties = { model: state }
  ReactDOM.render(React.createElement(Login, properties), document.getElementById('app'))
})
