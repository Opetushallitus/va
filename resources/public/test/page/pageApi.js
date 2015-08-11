function Page(mainElement) {
  var api = {
    getInput: function(name) {
      return Input(function () {
        return mainElement().find("[name='" + name + "']")
      })
    },
    getRadioLabel: function(name) {
      return Input(function () {
        return mainElement().find("[for='" + name + "']")
      })
    },
    setInputValue: function(name, value) {
      return function() {
        var input = api.getInput(name)
        var isRadio = input.attr("type") === "radio"
        var visibleElement = isRadio ? api.getRadioLabel(name) : input
        return wait.until(visibleElement.isVisible)()
          .then(input.setValue(value))
      }
    },
    createClickable: function(el) {
      return Clickable(el)
    },
    elementText: function(id) {
      return api.elementTextBySelector("#" + escapeSelector(id))
    },
    elementTextBySelector: function(selector) {
      var found = mainElement().find(selector).first()
      if (found.prop("tagName") === "TEXTAREA" ||
        found.prop("tagName") === "INPUT" ||
        found.prop("tagName") === "SELECT") {
        throw new Error("Use Input.value() to read inputs from form elements")
      }
      return found.text().trim()
    },
    classAttributeOf: function(htmlId) {
      return mainElement().find("#" + escapeSelector(htmlId)).first().attr("class")
    }
  }
  return api

  function Input(el) {
    return {
      element: function() {
        return el()
      },
      value: function() {
        return el().val()
      },
      attr: function(name) {
        return el().attr(name)
      },
      isVisible: function() {
        return el().is(":visible")
      },
      isEnabled: function () {
        return el().is(":enabled")
      },
      setValue: function(value) {
        var input = el()
        switch (inputType(input)) {
          case "EMAIL":
          case "TEXT":
          case "TEXTAREA":
            input.val(value)
            triggerEvent(input, "input")
            break;
          case "RADIO":
            var radioOption = _(input).find(function(item) { return $(item).prop("value") == value })
            S(radioOption).click()
            triggerEvent(S(radioOption), "click")
            break;
          case "SELECT":
            var option = _(input.children()).find(function(item) { return $(item).prop("value") == value })
            input.val($(option).attr("value"))
            triggerEvent(input, "change")
            break;
        }
      }
    }

    function inputType(el) {
      if (el.prop("tagName") == "SELECT" || el.prop("tagName") == "TEXTAREA")
        return el.prop("tagName")
      else
        return el.prop("type").toUpperCase()
    }
  }

  function Clickable(el) {
    return {
      element: function() {
        return el()
      },
      isEnabled: function () {
        return el().is(":enabled")
      },
      isVisible: function() {
        return el().is(":visible")
      },
      text: function() {
        return el().text()
      },
      click: function () {
        triggerEvent(el().first(), "click")
      }
    }
  }

  function escapeSelector(s){
    return s.replace( /(:|\.|\[|\])/g, "\\$1" )
  }
}