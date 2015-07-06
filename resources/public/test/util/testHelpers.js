var expect = chai.expect
chai.should()
chai.config.truncateThreshold = 0; // disable truncating

function S(selector) {
  try {
    if (!testFrame() || !testFrame().jQuery) {
      return $([])
    }
    return testFrame().jQuery(selector)
  } catch (e) {
    console.log("Premature access to testFrame.jQuery, printing stack trace.")
    console.log(new Error().stack);
    throw e;
  }
}

wait = {
  waitIntervalMs: 10,
  until: function(condition, maxWaitMs) {
    return function() {
      if (maxWaitMs == undefined) maxWaitMs = testTimeoutDefault;
      var deferred = Q.defer()
      var count = Math.floor(maxWaitMs / wait.waitIntervalMs);

      (function waitLoop(remaining) {
        if (condition()) {
          deferred.resolve()
        } else if (remaining === 0) {
          deferred.reject("timeout of " + maxWaitMs + " ms in wait.until for condition:\n" + condition)
        } else {
          setTimeout(function() {
            waitLoop(remaining-1)
          }, wait.waitIntervalMs)
        }
      })(count)
      return deferred.promise
    }
  },
  untilFalse: function(condition) {
    return wait.until(function() { return !condition()})
  },
  forMilliseconds: function(ms) {
    return function() {
      var deferred = Q.defer()
      setTimeout(function() {
        deferred.resolve()
      }, ms)
      return deferred.promise
    }
  }
}

function getJson(url) {
  return Q($.ajax({url: url, dataType: "json" }))
}

function testFrame() {
  return $("#testframe").get(0).contentWindow
}

function triggerEvent(element, eventName) {
  const evt = testFrame().document.createEvent('HTMLEvents');
  evt.initEvent(eventName, true, true);
  element[0].dispatchEvent(evt);
}

function openPage(pathGetter, predicate) {
  if (!predicate) {
    predicate = function() { return testFrame().jQuery }
  }
  return function() {
    var newTestFrame = $('<iframe>').attr({src: pathGetter(), width: 1024, height: 800, id: "testframe"}).load(function() {
      var jquery = document.createElement("script")
      jquery.type = "text/javascript"
      jquery.src = "//code.jquery.com/jquery-1.11.1.min.js"
      $(this).contents().find("head")[0].appendChild(jquery)
    })
    $("#testframe").replaceWith(newTestFrame)
    return wait.until(
        function() {
          return predicate()
        },
        testTimeoutPageLoad
    )().then(function() {
        window.uiError = null
        testFrame().onerror = function(err) { window.uiError = err; } // Hack: force mocha to fail on unhandled exceptions
    })
  }
}

function takeScreenshot() {
  if (window.callPhantom) {
    var date = new Date()
    var filename = "target/screenshots/" + date.getTime()
    console.log("Taking screenshot " + filename)
    callPhantom({'screenshot': filename})
  }
}


(function improveMocha() {
  var origBefore = before
  before = function() {
    Array.prototype.slice.call(arguments).forEach(function(arg) {
      if (typeof arg !== "function") {
        throw ("not a function: " + arg)
      }
      origBefore(arg)
    })
  }
})()