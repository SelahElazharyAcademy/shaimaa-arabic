;(function () {
  var detected = false
  var maxLog = 0
  var rows = []
  for (var i = 0; i < 50; i++) {
    var o = {}
    for (var j = 0; j < 300; j++) o[j] = j
    rows.push(o)
  }

  function report() {
    if (detected) return
    detected = true
    var frames = document.querySelectorAll('iframe')
    for (var k = 0; k < frames.length; k++) frames[k].remove()
    document.documentElement.classList.add('devtools-open')
    window.dispatchEvent(new CustomEvent('najah:devtools'))
  }

  function consoleOpen() {
    var a = performance.now()
    console.table(rows)
    var table = performance.now() - a
    var b = performance.now()
    console.log(rows)
    var log = performance.now() - b
    maxLog = Math.max(maxLog, log)
    console.clear()
    return table > 0 && maxLog > 0 && table > maxLog * 10
  }

  window.__najahDevtools = function () {
    return detected
  }

  var hits = 0
  function tick() {
    if (!detected) {
      hits = consoleOpen() ? hits + 1 : 0
      if (hits >= 2) {
        report()
        return
      }
      if (hits === 1) {
        setTimeout(tick, 150)
        return
      }
    }
    var t = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    if (performance.now() - t > 100) report()
  }

  tick()
  setInterval(tick, 1000)
})()
