import jsdom from 'mocha-jsdom'
import { expect } from 'chai'
import translations from '../../resources/public/translations.json'
require("babel/register")({
  only: /(va-hakija\/web|va-common\/web|soresu-form\/web)/
});

describe('Localized string', function() {
  jsdom()

  it('has test', function() {
    var React = require('react/addons')
    var TestUtils = React.addons.TestUtils
    var LocalizedString = require('soresu-form/web/form/component/LocalizedString')

    var string = TestUtils.renderIntoDocument(
      <LocalizedString translations={translations.form} translationKey="lengthleft" lang="fi" />
    )
    var text = TestUtils.findRenderedDOMComponentWithTag(string, 'span');
    expect(text.getDOMNode().textContent).to.equal("merkkiä jäljellä")
  })
})
