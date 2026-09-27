/* Math check with the spec's default values.
 * Browser: open test.html.  Node: `node test.js`. */
(function () {
  var RW = typeof module !== 'undefined' && module.exports ? require('./app.js') : window.RealWage;
  var r = RW.calculate(RW.DEFAULTS);
  var results = [];
  function check(name, actual, expected, tolerance) {
    var ok = Math.abs(actual - expected) <= (tolerance || 0);
    results.push({ name: name, actual: actual, expected: expected, ok: ok });
  }
  function checkEq(name, actual, expected) {
    results.push({ name: name, actual: actual, expected: expected, ok: actual === expected });
  }

  check('contract hours = 168', r.contractHoursMonth, 168);
  check('paid hours = 178', r.paidHoursMonth, 178);
  check('commute hours = 21', r.commuteHoursMonth, 21);
  check('prep hours = 10.5', r.prepHoursMonth, 10.5);
  check('real hours = 214.5', r.realHoursMonth, 214.5);
  check('work costs = 7,000', r.workCostsMonth, 7000);
  check('real income = 193,000', r.realIncomeMonth, 193000);
  check('advertised hourly ≈ 1488', Math.round(r.advertisedHourly), 1488);
  check('real hourly ≈ 900', Math.round(r.realHourly), 900);
  check('difference ≈ 40%', Math.round(r.differencePercent), 40);
  check('commute days / year = 10.5', r.commuteDaysPerYear, 10.5);
  check('work costs / year = 84,000', r.workCostsYear, 84000);
  checkEq('format ¥1,488', RW.fmtMoney(r.advertisedHourly, 'JPY', true), '¥1,488');
  checkEq('format ¥900', RW.fmtMoney(r.realHourly, 'JPY', true), '¥900');
  checkEq('format $899.77 (2 decimals)', RW.fmtMoney(r.realHourly, 'USD', true), '$899.77');
  checkEq('format ₹900 (whole)', RW.fmtMoney(r.realHourly, 'INR', true), '₹900');

  // Edge cases: no NaN / Infinity leaks, friendly problem keys instead
  var zeroHours = Object.assign({}, RW.DEFAULTS, { workDays: 0 });
  checkEq('0 work days -> needHours', RW.problemFor(zeroHours, RW.calculate(zeroHours)), 'needHours');
  var zeroPay = Object.assign({}, RW.DEFAULTS, { takeHome: 0 });
  checkEq('0 take-home -> needTakeHome', RW.problemFor(zeroPay, RW.calculate(zeroPay)), 'needTakeHome');
  var zeroGross = Object.assign({}, RW.DEFAULTS, { gross: 0 });
  checkEq('0 gross -> needGross', RW.problemFor(zeroGross, RW.calculate(zeroGross)), 'needGross');
  checkEq('defaults -> no problem', RW.problemFor(RW.DEFAULTS, r), null);

  var failed = results.filter(function (x) { return !x.ok; });
  if (typeof document !== 'undefined') {
    var out = document.getElementById('out');
    out.innerHTML = results.map(function (x) {
      return '<li class="' + (x.ok ? 'ok' : 'fail') + '">' + (x.ok ? '✅ ' : '❌ ') + x.name +
        ' <small>(got ' + x.actual + ', expected ' + x.expected + ')</small></li>';
    }).join('');
    document.getElementById('summary').textContent = failed.length ? failed.length + ' failed' : 'All ' + results.length + ' checks passed';
  } else {
    results.forEach(function (x) { console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + '  (got ' + x.actual + ')'); });
    console.log(failed.length ? '\n' + failed.length + ' failed' : '\nAll ' + results.length + ' checks passed');
    if (failed.length) process.exit(1);
  }
})();
