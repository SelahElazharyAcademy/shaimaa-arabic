/*
 * كاشف أدوات المطوّر — منطقة الطالب.
 *
 * ملف ساكن عمدًا لا جزء من حزمة Next: المُصغِّر يحذف كلمة `debugger`
 * من الكود، وهي هنا كل الآلية.
 *
 * `debugger` لا يفعل شيئًا والأدوات مغلقة. ومتى فُتحت (ملتصقة أو في نافذة
 * مستقلّة، من الاختصار أو من قائمة المتصفّح) يتوقّف التنفيذ عندها كل ثانية:
 *   1. فتصير الأدوات نفسها مزعجة لا تُستعمل.
 *   2. ويُقاس زمن التوقّف؛ ما زاد على عُشر ثانية يعني أن الأدوات مفتوحة،
 *      فيُطلق حدث `najah:devtools` ويُغلق المشغّل ويُزال من الصفحة.
 *
 * لا يعتمد على مقاس النافذة: التكبير والأشرطة الجانبية يُخطئان فيه فيُغلق
 * الفيديو على طالب لم يفعل شيئًا.
 */
(function () {
  var detected = false
  function report() {
    if (detected) return
    detected = true
    document.documentElement.classList.add('devtools-open')
    window.dispatchEvent(new CustomEvent('najah:devtools'))
  }
  window.__najahDevtools = function () {
    return detected
  }
  setInterval(function () {
    var t = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    if (performance.now() - t > 100) report()
  }, 1000)
})()
