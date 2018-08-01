(function() {
  var loginPage = LoginPage()

  beforeEach(function () {
    window.localStorage.clear()
  })

  afterEach(function () {
    if (this.currentTest.state === 'failed') {
      takeScreenshot()
    }
    expect(window.uiError || null).to.be.null
  })

  describe('Laatukehityksen sisäänkirjautumissivulla, kun haku on auki', function() {
    before(
      loginPage.setSystemTime("2015-09-30T16:14:59.999+03"),
      loginPage.openLoginPage()
    )

    after(
      loginPage.resetSystemTime()
    )

    describe('alkutilassa', function() {
      it("näkyy haun nimi", function() {
        expect(loginPage.applicationName()).to.deep.equal('Ammatillinen koulutus - Ammatillisen peruskoulutuksen laadun kehittäminen')
      })

      it("hakemuksen luonti on disabloitu", function() {
        expect(loginPage.submitButton().isEnabled()).to.equal(false)
      })
    })

    describe('mikäli syöttää jotain muuta kuin sähköpostiosoitteenn', function() {
      before(
        loginPage.setInputValue("primary-email", "notanemailaddress")
      )
      it("näkyy virhe", function() {
        expect(loginPage.classAttributeOf("primary-email")).to.include('error')
        expect(loginPage.submitButton().isEnabled()).to.equal(false)
      })
    })

    describe('mikäli syöttää oikean sähköpostiosoitteen', function() {
      before(
        loginPage.setInputValue("primary-email", "yhteyshenkilo@example.com")
      )
      describe('syötön jälkeen', function() {
        it("lähetä nappi enabloitunut", function() {
          expect(loginPage.submitButton().isEnabled()).to.equal(true)
        })
      })

      describe("kun luo hakemuksen", function() {
        before(
          mockAjax.init,
          function() { mockAjax.respondOnce("PUT", "/api/avustushaku/1/hakemus", 200,
            {
              "submission": {
                "answers": {
                  "value":[{"value":"yhteyshenkilo@example.com","key":"primary-email"},{"value":"fi","key":"language"}]},
                  "version_closed":null,"version":0,"form":1,"created_at":"2015-08-11T11:23:40Z","id":91
              },
              "verified_at":null,"created_at":"2015-08-11T11:23:40Z","status":"draft","id":""
            })
          },
          loginPage.waitUntilSubmitIsEnabled,
          loginPage.submitButton().click
        )

        it("Näkyy viesti", function() {
          expect(loginPage.message().text()).to.equal("Sähköpostiin on lähetetty linkki hakulomakkeelle. Tämän sivun voi sulkea.")
        })

      })
    })
  })

  describe('Laatukehityksen sisäänkirjautumissivulla, kun haku ei ole vielä alkanut', function() {
    before(
      loginPage.setSystemTime("2015-08-19T07:59:59.999+03"),
      loginPage.openLoginPage()
    )

    after(
        loginPage.resetSystemTime()
    )

    it("on sähköpostikenttä disabloitu", function() {
      expect(loginPage.getInput("primary-email").isEnabled()).to.equal(false)
    })
  })

  describe('Laatukehityksen sisäänkirjautumissivulla, kun haku on mennyt kiinni', function() {
    before(
      loginPage.setSystemTime("2015-09-30T16:15:00.000+03"),
      loginPage.openLoginPage()
    )

    after(
      loginPage.resetSystemTime()
    )

    it("on sähköpostikenttä disabloitu", function() {
      expect(loginPage.getInput("primary-email").isEnabled()).to.equal(false)
    })
  })

  describe('Laatukehityksen ruotsinkielisellä sisäänkirjautumissivulla', function() {
    before(
      loginPage.openLoginPage('sv')
    )

    it("näkyy haun nimi ruotsiksi", function() {
      expect(loginPage.applicationName()).to.deep.equal('Stöd för genomförande av kvalitetsstrategin')
    })
  })
})()
