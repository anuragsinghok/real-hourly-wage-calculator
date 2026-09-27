/* Real Hourly Wage Calculator (RealWage)
 * Plain JavaScript, no dependencies. Everything runs in the browser; nothing is sent anywhere.
 * The pure calculation (calculate) is also exported for Node so test.js can run it.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------
  var SITE_URL = 'https://anuragsinghok.github.io/real-hourly-wage-calculator/';
  var STORAGE_KEY = 'realwage:v1';

  var CURRENCIES = {
    JPY: { symbol: '¥', decimals: 0 },
    INR: { symbol: '₹', decimals: 0 },
    USD: { symbol: '$', decimals: 2 },
    EUR: { symbol: '€', decimals: 2 },
    GBP: { symbol: '£', decimals: 2 }
  };

  // One schema drives both forms (current job + job offer) and both languages.
  var SECTIONS = [
    { id: 'pay', fields: [
      { id: 'gross', def: 250000, step: 1000, money: true, help: true },
      { id: 'takeHome', def: 200000, step: 1000, money: true, help: true }
    ] },
    { id: 'time', fields: [
      { id: 'workDays', def: 21, step: 1, max: 31 },
      { id: 'contractHours', def: 8, step: 0.5, max: 24, help: true },
      { id: 'paidOvertime', def: 10, step: 1, max: 744 },
      { id: 'unpaidOvertime', def: 5, step: 1, max: 744, help: true },
      { id: 'commuteMin', def: 60, step: 5, max: 1440 },
      { id: 'prepMin', def: 30, step: 5, max: 1440, help: true }
    ] },
    { id: 'costs', fields: [
      { id: 'commuteCost', def: 0, step: 500, money: true, help: true },
      { id: 'food', def: 5000, step: 500, money: true, help: true },
      { id: 'clothes', def: 2000, step: 500, money: true },
      { id: 'other', def: 0, step: 500, money: true, help: true }
    ] }
  ];

  var FIELDS = [];
  SECTIONS.forEach(function (s) { s.fields.forEach(function (f) { FIELDS.push(f); }); });

  var DEFAULTS = {};
  FIELDS.forEach(function (f) { DEFAULTS[f.id] = f.def; });

  // ---------------------------------------------------------------------------
  // Calculation (pure: exact formulas from the spec)
  // ---------------------------------------------------------------------------
  function calculate(v) {
    var contractHoursMonth = v.workDays * v.contractHours;
    var paidHoursMonth = contractHoursMonth + v.paidOvertime;

    var commuteHoursMonth = (v.commuteMin * v.workDays) / 60;
    var prepHoursMonth = (v.prepMin * v.workDays) / 60;
    var realHoursMonth = paidHoursMonth + v.unpaidOvertime + commuteHoursMonth + prepHoursMonth;

    var workCostsMonth = v.commuteCost + v.food + v.clothes + v.other;
    var realIncomeMonth = v.takeHome - workCostsMonth;

    var advertisedHourly = contractHoursMonth > 0 ? v.gross / contractHoursMonth : NaN;
    var realHourly = realHoursMonth > 0 ? realIncomeMonth / realHoursMonth : NaN;
    var differencePercent = advertisedHourly > 0 ? (1 - realHourly / advertisedHourly) * 100 : NaN;

    return {
      contractHoursMonth: contractHoursMonth,
      paidHoursMonth: paidHoursMonth,
      commuteHoursMonth: commuteHoursMonth,
      prepHoursMonth: prepHoursMonth,
      realHoursMonth: realHoursMonth,
      hiddenHoursMonth: realHoursMonth - paidHoursMonth,
      workCostsMonth: workCostsMonth,
      workCostsYear: workCostsMonth * 12,
      realIncomeMonth: realIncomeMonth,
      advertisedHourly: advertisedHourly,
      realHourly: realHourly,
      differencePercent: differencePercent,
      commuteDaysPerYear: (commuteHoursMonth * 12) / 24
    };
  }

  // Returns a message key when the result can't be shown sensibly, otherwise null.
  function problemFor(v, r) {
    if (!(r.contractHoursMonth > 0)) return 'needHours';
    if (!(v.gross > 0)) return 'needGross';
    if (!(v.takeHome > 0)) return 'needTakeHome';
    if (!isFinite(r.realHourly) || !isFinite(r.advertisedHourly)) return 'needHours';
    return null;
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------
  function fmtNumber(n, maxDecimals, minDecimals) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: minDecimals || 0,
      maximumFractionDigits: maxDecimals
    }).format(n);
  }

  function fmtMoney(n, currency, hourly) {
    var c = CURRENCIES[currency] || CURRENCIES.JPY;
    var d = hourly ? c.decimals : (c.decimals ? 2 : 0);
    var neg = n < 0;
    var s = c.symbol + fmtNumber(Math.abs(n), d, hourly ? d : 0);
    return neg ? '-' + s : s;
  }

  function fmtHours(n) { return fmtNumber(n, 1); }
  function fmtDays(n) { return fmtNumber(n, 1); }
  function fmtPercent(n) { return fmtNumber(Math.abs(Math.round(n)), 0); }

  // Node export for test.js
  var api = { calculate: calculate, problemFor: problemFor, fmtMoney: fmtMoney, DEFAULTS: DEFAULTS, CURRENCIES: CURRENCIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RealWage = api;
  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------------------
  // Translations
  // ---------------------------------------------------------------------------
  var I18N = {
    en: {
      skip: 'Skip to calculator',
      title: 'What do you <span class="accent">REALLY</span> earn per hour?',
      subtitle: 'Your salary lies. Count the commute, overtime and costs.',
      currency: 'Currency',
      sec_pay: 'Your pay',
      sec_time: 'Your time',
      sec_costs: 'Your work costs',
      sec_costs_note: 'Per month, only what your company does NOT pay back.',
      gross: 'Monthly gross salary',
      gross_help: "Before tax. Used to show your 'official' hourly wage.",
      takeHome: 'Monthly take-home pay',
      takeHome_help: 'What actually arrives in your bank account (手取り).',
      workDays: 'Work days per month',
      contractHours: 'Contract hours per day',
      contractHours_help: 'Paid hours in your contract.',
      paidOvertime: 'Paid overtime hours per month',
      unpaidOvertime: 'Unpaid overtime hours per month',
      unpaidOvertime_help: 'Staying late, answering messages at home, etc.',
      commuteMin: 'Commute time per day (round trip, minutes)',
      prepMin: 'Getting ready for work per day (minutes)',
      prepMin_help: 'Uniform, dressing, prep only because of work.',
      commuteCost: 'Commute costs',
      commuteCost_help: 'Train, fuel, parking not reimbursed.',
      food: 'Extra food costs',
      food_help: "Lunch/coffee costs above what you'd spend at home.",
      clothes: 'Clothes & equipment',
      other: 'Other work costs',
      other_help: 'Phone, childcare during work, etc.',
      unit_min: 'min', unit_h: 'h', unit_days: 'days',
      reset: 'Reset',
      calculate: 'Calculate',
      resultHeading: 'Your result',
      thinkLabel: 'You think you earn',
      realLabel: 'You <strong>REALLY</strong> earn',
      perHour: '/ hour',
      perHourShort: '/h',
      diffLess: '↓ {p}% less than you think',
      diffMore: '↑ {p}% more than you think',
      diffSame: 'Exactly what you think',
      factHours: 'You work <b>{real}</b> hours a month, but get paid for <b>{paid}</b>.',
      factCommute: 'You spend <b>{days}</b> full days a year just commuting.',
      factCosts: 'Work costs you <b>{cost}</b> a year.',
      factNoCosts: 'Work costs you nothing extra. Nice.',
      monthly: 'Monthly',
      yearly: 'Yearly',
      st_real: 'Real hours worked',
      st_paid: 'Paid hours',
      st_hidden: 'Hidden unpaid hours',
      st_costs: 'Money lost to work costs',
      st_income: 'Real income after costs',
      per_month: '/ month', per_year: '/ year',
      shareX: 'Share on X',
      copy: 'Copy result',
      copied: 'Copied!',
      copyFail: 'Copy failed',
      download: 'Download image',
      needHours: 'Enter your work days and contract hours per day to see your result.',
      needGross: 'Enter your monthly gross salary to see what you think you earn.',
      needTakeHome: 'Enter your monthly take-home pay to see what you really earn.',
      fixFields: 'Fix the highlighted fields to see your result.',
      negIncome: "Your work costs are higher than your take-home pay. You're paying to go to work.",
      errNegative: 'Please enter 0 or a positive number.',
      errMax: 'Must be {max} or less.',
      shareText: 'My salary says {adv}/hour.\nMy REAL hourly wage is {real}. ({p}% less 😐)\n\nCheck yours 👇',
      shareTextMore: 'My salary says {adv}/hour.\nMy REAL hourly wage is {real}. ({p}% more 😮)\n\nCheck yours 👇',
      copyTitle: 'My real hourly wage',
      copySays: 'Salary says: {adv}/hour',
      copyReal: 'REAL hourly wage: {real}/hour ({diff})',
      copyHours: 'I work {real} hours a month, but get paid for {paid}.',
      copyCommute: 'I spend {days} full days a year just commuting.',
      copyCosts: 'Work costs me {cost} a year.',
      copyCheck: 'Check yours: {url}',
      diffLessShort: '{p}% less', diffMoreShort: '{p}% more',
      howTitle: 'How is this calculated?',
      howText:
        '<ol>' +
        '<li><b>Paid hours</b> = work days × contract hours per day + paid overtime.</li>' +
        '<li><b>Real hours</b> = paid hours + unpaid overtime + commute time + getting-ready time. Commute and prep are per work day, so they are multiplied by your work days.</li>' +
        '<li><b>Real income</b> = take-home pay - work costs your company does not pay back.</li>' +
        '<li><b>What you think you earn</b> = gross salary ÷ contract hours. This is the number on your contract.</li>' +
        '<li><b>What you REALLY earn</b> = real income ÷ real hours.</li>' +
        '<li><b>Difference</b> = how much lower the real number is, in %.</li>' +
        '</ol>' +
        '<p class="muted">We use take-home pay (after tax) so no country-specific tax rules are needed. Currency only changes the symbol; nothing is converted.</p>',
      howYours: 'With your numbers',
      b_contract: 'Contract hours / month',
      b_paid: 'Paid hours / month',
      b_commute: 'Commute hours / month',
      b_prep: 'Getting-ready hours / month',
      b_unpaid: 'Unpaid overtime / month',
      b_realHours: 'Real hours / month',
      b_costs: 'Work costs / month',
      b_income: 'Real income / month',
      b_adv: 'Gross ÷ contract hours',
      b_real: 'Real income ÷ real hours',
      privacy: 'Nothing is sent anywhere. All calculation happens in your browser.',
      builtBy: 'Built by Anurag in rural Japan 🇯🇵 · Day 1 of building in public',
      followX: 'Follow on X',
      github: 'Code on GitHub',
      stickyLabel: 'Your real hourly wage',
      compareTitle: 'Compare with a job offer',
      compareIntro: 'Got an offer with a higher salary but a longer commute? See which one really pays more per hour.',
      compareOpen: 'Compare',
      compareClose: 'Hide',
      offerCopy: 'Copy my current numbers',
      offerPrefix: 'Offer: ',
      colCurrent: 'Current job',
      colOffer: 'Job offer',
      c_adv: 'Salary says',
      c_real: 'Real hourly wage',
      c_hours: 'Real hours / month',
      c_income: 'Real income / month',
      c_commute: 'Commute days / year',
      c_gap: 'Gap',
      offerBetter: 'The offer really pays <b>{diff}</b> more per hour (<b>+{p}%</b>).',
      offerWorse: 'The offer really pays <b>{diff}</b> less per hour (<b>-{p}%</b>), even if the salary looks different.',
      offerSame: 'Both jobs really pay the same per hour.',
      offerNeedData: 'Fill in both jobs to compare.',
      imgHeadline: 'What do you REALLY earn per hour?',
      imgSays: 'My salary says',
      imgReal: 'My REAL hourly wage',
      imgCta: 'Check yours →'
    },
    ja: {
      skip: '計算機へスキップ',
      title: 'あなたの<span class="accent">本当の</span>時給はいくら？',
      subtitle: '給料の数字はウソをつく。通勤・残業・出費まで数えよう。',
      currency: '通貨',
      sec_pay: 'あなたの給料',
      sec_time: 'あなたの時間',
      sec_costs: '仕事にかかる出費',
      sec_costs_note: '月額。会社が払ってくれない分だけ。',
      gross: '月の額面給与（総支給額）',
      gross_help: '税引き前。「公式な」時給の計算に使います。',
      takeHome: '月の手取り額',
      takeHome_help: '実際に銀行口座に振り込まれる金額（手取り）。',
      workDays: '月の出勤日数',
      contractHours: '1日の所定労働時間',
      contractHours_help: '契約上の、給料が出る労働時間。',
      paidOvertime: '月の残業時間（残業代あり）',
      unpaidOvertime: '月のサービス残業時間（残業代なし）',
      unpaidOvertime_help: '居残り、家での仕事の連絡対応など。',
      commuteMin: '1日の通勤時間（往復・分）',
      prepMin: '1日の出勤準備の時間（分）',
      prepMin_help: '制服・着替えなど、仕事のためだけの準備。',
      commuteCost: '通勤費',
      commuteCost_help: '会社が負担しない電車代・ガソリン代・駐車場代。',
      food: '余分な食費',
      food_help: '家で食べるより多くかかる昼食代・コーヒー代。',
      clothes: '服・道具代',
      other: 'その他の仕事の出費',
      other_help: 'スマホ代、勤務中の保育料など。',
      unit_min: '分', unit_h: '時間', unit_days: '日',
      reset: 'リセット',
      calculate: '計算する',
      resultHeading: '結果',
      thinkLabel: 'あなたが思っている時給',
      realLabel: 'あなたの<strong>本当の</strong>時給',
      perHour: '/ 時間',
      perHourShort: '/時',
      diffLess: '↓ 思っているより {p}% 少ない',
      diffMore: '↑ 思っているより {p}% 多い',
      diffSame: '思っている通りです',
      factHours: '月に <b>{real}</b> 時間働いているのに、給料が出るのは <b>{paid}</b> 時間分だけ。',
      factCommute: '通勤だけで年に丸 <b>{days}</b> 日を使っています。',
      factCosts: '仕事の出費は年に <b>{cost}</b>。',
      factNoCosts: '仕事の余分な出費はゼロ。いいですね。',
      monthly: '月',
      yearly: '年',
      st_real: '本当の労働時間',
      st_paid: '給料が出る時間',
      st_hidden: '隠れたタダ働きの時間',
      st_costs: '仕事の出費',
      st_income: '出費を引いた本当の収入',
      per_month: '/ 月', per_year: '/ 年',
      shareX: 'Xでシェア',
      copy: '結果をコピー',
      copied: 'コピーしました！',
      copyFail: 'コピーできませんでした',
      download: '画像を保存',
      needHours: '結果を見るには、出勤日数と1日の所定労働時間を入力してください。',
      needGross: '額面給与を入力すると「思っている時給」が表示されます。',
      needTakeHome: '手取り額を入力すると「本当の時給」が表示されます。',
      fixFields: '赤く表示された項目を直すと結果が表示されます。',
      negIncome: '仕事の出費が手取りを上回っています。お金を払って働いている状態です。',
      errNegative: '0以上の数字を入力してください。',
      errMax: '{max}以下にしてください。',
      shareText: '給料上の時給は{adv}。\n本当の時給は{real}。（{p}%少ない 😐）\n\nあなたも計算してみて 👇',
      shareTextMore: '給料上の時給は{adv}。\n本当の時給は{real}。（{p}%多い 😮）\n\nあなたも計算してみて 👇',
      copyTitle: '私の本当の時給',
      copySays: '給料上の時給：{adv}',
      copyReal: '本当の時給：{real}（{diff}）',
      copyHours: '月に{real}時間働いているのに、給料が出るのは{paid}時間分だけ。',
      copyCommute: '通勤だけで年に丸{days}日を使っています。',
      copyCosts: '仕事の出費は年に{cost}。',
      copyCheck: 'あなたも計算してみて：{url}',
      diffLessShort: '{p}%少ない', diffMoreShort: '{p}%多い',
      howTitle: 'どうやって計算しているの？',
      howText:
        '<ol>' +
        '<li><b>給料が出る時間</b> = 出勤日数 × 1日の所定労働時間 + 残業代ありの残業。</li>' +
        '<li><b>本当の労働時間</b> = 給料が出る時間 + サービス残業 + 通勤時間 + 出勤準備の時間。通勤と準備は1日あたりなので、出勤日数を掛けます。</li>' +
        '<li><b>本当の収入</b> = 手取り - 会社が払わない仕事の出費。</li>' +
        '<li><b>思っている時給</b> = 額面給与 ÷ 所定労働時間。契約書の上の数字です。</li>' +
        '<li><b>本当の時給</b> = 本当の収入 ÷ 本当の労働時間。</li>' +
        '<li><b>差</b> = 本当の時給が何%低いか。</li>' +
        '</ol>' +
        '<p class="muted">手取り（税引き後）を使うので、国ごとの税金計算は不要です。通貨は記号が変わるだけで、換算はしません。</p>',
      howYours: 'あなたの数字で計算すると',
      b_contract: '月の所定労働時間',
      b_paid: '月の給料が出る時間',
      b_commute: '月の通勤時間',
      b_prep: '月の出勤準備時間',
      b_unpaid: '月のサービス残業',
      b_realHours: '月の本当の労働時間',
      b_costs: '月の仕事の出費',
      b_income: '月の本当の収入',
      b_adv: '額面 ÷ 所定労働時間',
      b_real: '本当の収入 ÷ 本当の労働時間',
      privacy: 'データはどこにも送信されません。計算はすべてブラウザの中で行われます。',
      builtBy: '日本の田舎で Anurag が制作 🇯🇵 · 公開開発 1日目',
      followX: 'Xでフォロー',
      github: 'GitHubのコード',
      stickyLabel: 'あなたの本当の時給',
      compareTitle: '転職のオファーと比べる',
      compareIntro: '給料は高いけど通勤が長いオファー？本当の時給で比べてみよう。',
      compareOpen: '比べる',
      compareClose: '閉じる',
      offerCopy: '今の数字をコピー',
      offerPrefix: 'オファー：',
      colCurrent: '今の仕事',
      colOffer: 'オファー',
      c_adv: '給料上の時給',
      c_real: '本当の時給',
      c_hours: '月の本当の労働時間',
      c_income: '月の本当の収入',
      c_commute: '年間の通勤日数',
      c_gap: '差',
      offerBetter: 'オファーの方が本当の時給が <b>{diff}</b> 高い（<b>+{p}%</b>）。',
      offerWorse: 'オファーの方が本当の時給が <b>{diff}</b> 低い（<b>-{p}%</b>）。給料の見た目にだまされないで。',
      offerSame: 'どちらも本当の時給は同じです。',
      offerNeedData: '比べるには両方の仕事を入力してください。',
      imgHeadline: 'あなたの本当の時給はいくら？',
      imgSays: '給料上の時給',
      imgReal: '私の本当の時給',
      imgCta: 'あなたも計算 →'
    }
  };

  // ---------------------------------------------------------------------------
  // Storage (every call wrapped: the app must work when storage is blocked)
  // ---------------------------------------------------------------------------
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  function sanitizeValues(obj) {
    var out = {};
    FIELDS.forEach(function (f) {
      var v = obj && obj[f.id];
      out[f.id] = (typeof v === 'string' || typeof v === 'number') ? String(v) : String(f.def);
    });
    return out;
  }

  var saved = loadState() || {};
  var browserLang = (navigator.language || 'en').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  var state = {
    inputs: sanitizeValues(saved.inputs),
    offer: sanitizeValues(saved.offer || saved.inputs),
    currency: CURRENCIES[saved.currency] ? saved.currency : 'JPY',
    lang: I18N[saved.lang] ? saved.lang : browserLang,
    period: saved.period === 'year' ? 'year' : 'month',
    compare: !!saved.compare
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function t(key, vars) {
    var s = (I18N[state.lang] && I18N[state.lang][key]);
    if (s == null) s = I18N.en[key];
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shareUrl() {
    var l = window.location;
    if (l.protocol === 'http:' || l.protocol === 'https:') {
      if (l.hostname === 'localhost' || l.hostname === '127.0.0.1') return SITE_URL;
      return l.origin + l.pathname;
    }
    return SITE_URL;
  }
  function money(n, hourly) { return fmtMoney(n, state.currency, hourly); }

  // Parse raw input strings. Empty counts as 0. Returns { values, errors }.
  function parseValues(raw) {
    var values = {}, errors = {};
    FIELDS.forEach(function (f) {
      var s = String(raw[f.id] == null ? '' : raw[f.id]).trim().replace(/,/g, '');
      var n = s === '' ? 0 : Number(s);
      if (!isFinite(n) || n < 0) { errors[f.id] = t('errNegative'); n = 0; }
      else if (f.max != null && n > f.max) { errors[f.id] = t('errMax', { max: fmtNumber(f.max, 0) }); }
      values[f.id] = n;
    });
    return { values: values, errors: errors };
  }

  // ---------------------------------------------------------------------------
  // Form rendering
  // ---------------------------------------------------------------------------
  function renderFields(container, prefix, values) {
    var html = '';
    SECTIONS.forEach(function (sec) {
      html += '<fieldset class="section"><legend>' + esc(t('sec_' + sec.id)) + '</legend>';
      if (sec.id === 'costs') html += '<p class="section-note">' + esc(t('sec_costs_note')) + '</p>';
      html += '<div class="fields">';
      sec.fields.forEach(function (f) {
        var id = prefix + '-' + f.id;
        var describedBy = [];
        if (f.help) describedBy.push(id + '-help');
        describedBy.push(id + '-err');
        var unit = f.money ? '' : (/Min$/.test(f.id) ? t('unit_min') : (f.id === 'workDays' ? t('unit_days') : t('unit_h')));
        html += '<div class="field' + (f.money ? ' is-money' : '') + '">' +
          '<label for="' + id + '">' + esc(t(f.id)) + '</label>' +
          '<div class="input-wrap">' +
            (f.money ? '<span class="prefix" aria-hidden="true">' + esc(CURRENCIES[state.currency].symbol) + '</span>' : '') +
            '<input id="' + id + '" name="' + f.id + '" data-field="' + f.id + '" type="number" inputmode="decimal" min="0"' +
              (f.max != null ? ' max="' + f.max + '"' : '') + ' step="' + f.step + '" value="' + esc(values[f.id]) + '"' +
              ' aria-describedby="' + describedBy.join(' ') + '">' +
            (unit ? '<span class="suffix" aria-hidden="true">' + esc(unit) + '</span>' : '') +
          '</div>' +
          (f.help ? '<p class="help" id="' + id + '-help">' + esc(t(f.id + '_help')) + '</p>' : '') +
          '<p class="error" id="' + id + '-err" aria-live="polite"></p>' +
        '</div>';
      });
      html += '</div></fieldset>';
    });
    container.innerHTML = html;
  }

  function showErrors(prefix, errors) {
    FIELDS.forEach(function (f) {
      var input = $(prefix + '-' + f.id);
      var err = $(prefix + '-' + f.id + '-err');
      if (!input || !err) return;
      var msg = errors[f.id] || '';
      if (err.textContent !== msg) err.textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
  }

  function applyStaticI18n() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key === 'title') el.innerHTML = t(key); else el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang));
    });
    $('compare-toggle').textContent = state.compare ? t('compareClose') : t('compareOpen');
  }

  function renderForms() {
    renderFields($('main-fields'), 'f', state.inputs);
    renderFields($('offer-fields'), 'o', state.offer);
  }

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------
  var last = null; // latest valid result, used by share / copy / download

  function diffText(p, short) {
    var rp = Math.round(p);
    if (rp === 0) return short ? '0%' : t('diffSame');
    if (rp > 0) return t(short ? 'diffLessShort' : 'diffLess', { p: fmtPercent(rp) });
    return t(short ? 'diffMoreShort' : 'diffMore', { p: fmtPercent(rp) });
  }

  function update() {
    var parsed = parseValues(state.inputs);
    showErrors('f', parsed.errors);
    var v = parsed.values;
    var r = calculate(v);

    var hasErrors = Object.keys(parsed.errors).length > 0;
    var problem = hasErrors ? 'fixFields' : problemFor(v, r);

    var msg = $('result-message');
    var body = $('result-body');
    var shareBtns = [$('share-x'), $('copy-btn'), $('download-btn')];

    renderBreakdown(v, r, !problem);

    if (problem) {
      last = null;
      msg.textContent = t(problem);
      msg.hidden = false;
      body.hidden = true;
      shareBtns.forEach(function (b) { b.disabled = true; });
      $('sticky-real').textContent = '?';
      $('sticky-diff').textContent = '';
      updateCompare();
      return;
    }

    last = { v: v, r: r };
    msg.hidden = true;
    body.hidden = false;
    shareBtns.forEach(function (b) { b.disabled = false; });

    $('advertised').textContent = money(r.advertisedHourly, true);
    $('real').textContent = money(r.realHourly, true);

    var diff = $('diff');
    diff.textContent = diffText(r.differencePercent);
    diff.className = 'diff ' + (Math.round(r.differencePercent) > 0 ? 'is-less' : (Math.round(r.differencePercent) < 0 ? 'is-more' : 'is-same'));

    $('fact-hours').innerHTML = t('factHours', { real: fmtHours(r.realHoursMonth), paid: fmtHours(r.paidHoursMonth) });
    $('fact-commute').innerHTML = t('factCommute', { days: fmtDays(r.commuteDaysPerYear) });
    $('fact-costs').innerHTML = r.workCostsYear > 0 ? t('factCosts', { cost: esc(money(r.workCostsYear)) }) : t('factNoCosts');

    renderStats(r);

    var warn = $('result-warning');
    if (r.realIncomeMonth <= 0) { warn.textContent = t('negIncome'); warn.hidden = false; }
    else warn.hidden = true;

    $('sticky-real').textContent = money(r.realHourly, true);
    $('sticky-diff').textContent = Math.round(r.differencePercent) > 0 ? '↓' + fmtPercent(r.differencePercent) + '%' :
      (Math.round(r.differencePercent) < 0 ? '↑' + fmtPercent(r.differencePercent) + '%' : '');

    updateCompare();
  }

  function renderStats(r) {
    var k = state.period === 'year' ? 12 : 1;
    var per = t(state.period === 'year' ? 'per_year' : 'per_month');
    var h = t('unit_h');
    var rows = [
      ['st_real', fmtHours(r.realHoursMonth * k) + ' ' + h, ''],
      ['st_paid', fmtHours(r.paidHoursMonth * k) + ' ' + h, ''],
      ['st_hidden', fmtHours(r.hiddenHoursMonth * k) + ' ' + h, 'is-bad'],
      ['st_costs', money(r.workCostsMonth * k), 'is-bad'],
      ['st_income', money(r.realIncomeMonth * k), '']
    ];
    $('stats').innerHTML = rows.map(function (row) {
      return '<div class="stat"><dt>' + esc(t(row[0])) + ' <span class="per">' + esc(per) + '</span></dt>' +
        '<dd class="' + row[2] + '">' + esc(row[1]) + '</dd></div>';
    }).join('');
    document.querySelectorAll('[data-period]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-period') === state.period));
    });
  }

  function renderBreakdown(v, r, ok) {
    var h = ' ' + t('unit_h');
    var n = function (x) { return isFinite(x) ? x : 0; };
    var rows = [
      ['b_contract', fmtNumber(v.workDays, 2) + ' × ' + fmtNumber(v.contractHours, 2), fmtHours(r.contractHoursMonth) + h],
      ['b_paid', fmtHours(r.contractHoursMonth) + ' + ' + fmtHours(v.paidOvertime), fmtHours(r.paidHoursMonth) + h],
      ['b_commute', fmtNumber(v.commuteMin, 1) + ' × ' + fmtNumber(v.workDays, 2) + ' ÷ 60', fmtHours(r.commuteHoursMonth) + h],
      ['b_prep', fmtNumber(v.prepMin, 1) + ' × ' + fmtNumber(v.workDays, 2) + ' ÷ 60', fmtHours(r.prepHoursMonth) + h],
      ['b_unpaid', '', fmtHours(v.unpaidOvertime) + h],
      ['b_realHours', '', fmtHours(r.realHoursMonth) + h, 'is-total'],
      ['b_costs', [v.commuteCost, v.food, v.clothes, v.other].map(function (x) { return money(x); }).join(' + '), money(r.workCostsMonth)],
      ['b_income', money(v.takeHome) + ' - ' + money(r.workCostsMonth), money(r.realIncomeMonth), 'is-total'],
      ['b_adv', money(v.gross) + ' ÷ ' + fmtHours(r.contractHoursMonth), ok ? money(n(r.advertisedHourly), true) : 'n/a'],
      ['b_real', money(r.realIncomeMonth) + ' ÷ ' + fmtHours(r.realHoursMonth), ok ? money(n(r.realHourly), true) : 'n/a', 'is-total is-real']
    ];
    $('breakdown').innerHTML = '<tbody>' + rows.map(function (row) {
      return '<tr class="' + (row[3] || '') + '"><th scope="row">' + esc(t(row[0])) + '</th>' +
        '<td class="calc">' + esc(row[1]) + '</td><td class="num">' + esc(row[2]) + '</td></tr>';
    }).join('') + '</tbody>';
  }

  // ---------------------------------------------------------------------------
  // Compare with a job offer
  // ---------------------------------------------------------------------------
  function updateCompare() {
    $('compare-body').hidden = !state.compare;
    $('compare-toggle').setAttribute('aria-expanded', String(state.compare));
    $('compare-toggle').textContent = state.compare ? t('compareClose') : t('compareOpen');
    if (!state.compare) return;

    var parsed = parseValues(state.offer);
    showErrors('o', parsed.errors);
    var ov = parsed.values;
    var or = calculate(ov);
    var offerOk = !Object.keys(parsed.errors).length && !problemFor(ov, or);
    var out = $('compare-result');

    if (!last || !offerOk) {
      out.innerHTML = '<p class="notice">' + esc(t('offerNeedData')) + '</p>';
      return;
    }
    var cr = last.r;
    var rows = [
      ['c_adv', money(cr.advertisedHourly, true), money(or.advertisedHourly, true)],
      ['c_real', money(cr.realHourly, true), money(or.realHourly, true), 'is-real'],
      ['c_gap', diffText(cr.differencePercent, true), diffText(or.differencePercent, true)],
      ['c_hours', fmtHours(cr.realHoursMonth) + ' ' + t('unit_h'), fmtHours(or.realHoursMonth) + ' ' + t('unit_h')],
      ['c_income', money(cr.realIncomeMonth), money(or.realIncomeMonth)],
      ['c_commute', fmtDays(cr.commuteDaysPerYear), fmtDays(or.commuteDaysPerYear)]
    ];
    var decimals = CURRENCIES[state.currency].decimals;
    var factor = Math.pow(10, decimals);
    var a = Math.round(cr.realHourly * factor) / factor;
    var b = Math.round(or.realHourly * factor) / factor;
    var verdict, cls;
    if (a === b) { verdict = t('offerSame'); cls = 'is-same'; }
    else {
      var d = Math.abs(b - a);
      var p = a !== 0 ? Math.round(Math.abs((b - a) / a) * 100) : 0;
      verdict = t(b > a ? 'offerBetter' : 'offerWorse', { diff: esc(money(d, true)), p: fmtNumber(p, 0) });
      cls = b > a ? 'is-better' : 'is-worse';
    }
    var winnerCol = a === b ? -1 : (b > a ? 2 : 1);
    out.innerHTML =
      '<table class="compare-table"><thead><tr><th scope="col"></th>' +
      '<th scope="col"' + (winnerCol === 1 ? ' class="win"' : '') + '>' + esc(t('colCurrent')) + '</th>' +
      '<th scope="col"' + (winnerCol === 2 ? ' class="win"' : '') + '>' + esc(t('colOffer')) + '</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr class="' + (row[3] || '') + '"><th scope="row">' + esc(t(row[0])) + '</th><td>' + esc(row[1]) + '</td><td>' + esc(row[2]) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="verdict ' + cls + '">' + verdict + '</p>';
  }

  // ---------------------------------------------------------------------------
  // Share / copy / download
  // ---------------------------------------------------------------------------
  function shareText() {
    var r = last.r;
    var p = Math.round(r.differencePercent);
    return t(p < 0 ? 'shareTextMore' : 'shareText', {
      adv: money(r.advertisedHourly, true),
      real: money(r.realHourly, true),
      p: fmtPercent(p)
    });
  }

  function summaryText() {
    var r = last.r;
    return [
      t('copyTitle'),
      t('copySays', { adv: money(r.advertisedHourly, true) }),
      t('copyReal', { real: money(r.realHourly, true), diff: diffText(r.differencePercent, true) }),
      t('copyHours', { real: fmtHours(r.realHoursMonth), paid: fmtHours(r.paidHoursMonth) }),
      t('copyCommute', { days: fmtDays(r.commuteDaysPerYear) }),
      t('copyCosts', { cost: money(r.workCostsYear) }),
      '',
      t('copyCheck', { url: shareUrl() })
    ].join('\n');
  }

  function shareOnX() {
    if (!last) return;
    var url = 'https://x.com/intent/post?text=' + encodeURIComponent(shareText()) + '&url=' + encodeURIComponent(shareUrl());
    window.open(url, '_blank', 'noopener');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  var copyTimer = null;
  function copyResult() {
    if (!last) return;
    var btn = $('copy-btn');
    copyToClipboard(summaryText()).then(function () {
      btn.textContent = t('copied');
      btn.classList.add('is-done');
      $('copy-status').textContent = t('copied');
    }, function () {
      btn.textContent = t('copyFail');
      $('copy-status').textContent = t('copyFail');
    }).then(function () {
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        btn.textContent = t('copy');
        btn.classList.remove('is-done');
        $('copy-status').textContent = '';
      }, 2000);
    });
  }

  // 1200x630 PNG share card drawn on a canvas
  function drawShareCard() {
    var r = last.r;
    var W = 1200, H = 630, L = 72, R = W - 72, COL = 760;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var font = function (w, s) { return w + ' ' + s + 'px Inter, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif'; };
    var fit = function (text, weight, size, maxW, min) {
      ctx.font = font(weight, size);
      while (ctx.measureText(text).width > maxW && size > min) { size -= 2; ctx.font = font(weight, size); }
      return size;
    };
    var less = Math.round(r.differencePercent) >= 0;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#E5484D';
    ctx.fillRect(0, 0, W, 12);
    ctx.textBaseline = 'alphabetic';

    // Headline
    ctx.fillStyle = '#1a1b1e';
    fit(t('imgHeadline'), 800, 44, R - L, 28);
    ctx.fillText(t('imgHeadline'), L, 100);

    // Left: advertised (struck through) then real (big, red)
    ctx.fillStyle = '#5f636a';
    ctx.font = font(600, 26);
    ctx.fillText(t('imgSays'), L, 170);
    var adv = money(r.advertisedHourly, true) + t('perHourShort');
    fit(adv, 800, 56, COL - L - 40, 30);
    ctx.fillStyle = '#9a9da3';
    ctx.fillText(adv, L, 232);
    var advW = ctx.measureText(adv).width;
    ctx.strokeStyle = '#E5484D';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(L - 4, 213); ctx.lineTo(L + advW + 4, 213); ctx.stroke();

    ctx.fillStyle = '#1a1b1e';
    ctx.font = font(600, 26);
    ctx.fillText(t('imgReal'), L, 296);
    var real = money(r.realHourly, true) + t('perHourShort');
    ctx.fillStyle = '#E5484D';
    fit(real, 800, 124, COL - L - 40, 56);
    ctx.fillText(real, L - 4, 416);

    // Percent pill
    var pill = diffText(r.differencePercent);
    fit(pill, 800, 28, COL - L - 90, 18);
    var pw = ctx.measureText(pill).width + 44;
    ctx.fillStyle = less ? '#FDECEC' : '#E6F6EC';
    roundRect(ctx, L, 452, pw, 54, 27); ctx.fill();
    ctx.fillStyle = less ? '#CE2C31' : '#1E7B45';
    ctx.fillText(pill, L + 22, 489);

    // Right: three facts as label + value
    ctx.fillStyle = '#e2e3e6';
    ctx.fillRect(COL, 150, 2, 356);
    var facts = [
      [t('c_hours'), fmtHours(r.realHoursMonth) + ' ' + t('unit_h') + '  (' + t('st_paid') + ' ' + fmtHours(r.paidHoursMonth) + ')'],
      [t('c_commute'), fmtDays(r.commuteDaysPerYear) + ' ' + t('unit_days')],
      [t('st_costs') + ' ' + t('per_year'), money(r.workCostsYear)]
    ];
    var fx = COL + 40, fw = R - fx, fy = 190;
    facts.forEach(function (f) {
      ctx.fillStyle = '#5f636a';
      fit(f[0], 600, 22, fw, 14);
      ctx.fillText(f[0], fx, fy);
      ctx.fillStyle = '#1a1b1e';
      fit(f[1], 800, 34, fw, 18);
      ctx.fillText(f[1], fx, fy + 44);
      fy += 116;
    });

    // Footer
    ctx.fillStyle = '#e2e3e6';
    ctx.fillRect(L, 548, R - L, 2);
    ctx.fillStyle = '#1a1b1e';
    ctx.font = font(800, 26);
    ctx.fillText('RealWage', L, 596);
    ctx.textAlign = 'right';
    var foot = t('imgCta') + '  ' + shareUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillStyle = '#5f636a';
    fit(foot, 600, 22, R - L - 200, 14);
    ctx.fillText(foot, R, 596);
    ctx.textAlign = 'left';
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function downloadImage() {
    if (!last) return;
    var ready = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('800 40px Inter'), document.fonts.load('600 30px Inter'), document.fonts.load('400 22px Inter')]).catch(function () {})
      : Promise.resolve();
    ready.then(function () {
      var canvas = drawShareCard();
      var name = 'my-real-hourly-wage.png';
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          triggerDownload(url, name);
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }, 'image/png');
      } else {
        triggerDownload(canvas.toDataURL('image/png'), name);
      }
    });
  }
  function triggerDownload(href, name) {
    var a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ---------------------------------------------------------------------------
  // Mobile sticky bar: visible only while the result card is off screen
  // ---------------------------------------------------------------------------
  function setupStickyBar() {
    var bar = $('sticky-bar');
    var card = $('result-card');
    if (!('IntersectionObserver' in window)) { document.body.classList.add('sticky-visible'); return; }
    var io = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      document.body.classList.toggle('sticky-visible', !visible);
      bar.classList.toggle('is-hidden', visible);
    }, { threshold: 0.15 });
    io.observe(card);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  function onFieldInput(target, bucket) {
    var id = target.getAttribute('data-field');
    if (!id) return;
    state[bucket][id] = target.value;
    saveState();
    update();
  }

  function setCurrency(cur) {
    state.currency = cur;
    $('currency').value = cur;
    document.querySelectorAll('.prefix').forEach(function (p) { p.textContent = CURRENCIES[cur].symbol; });
    saveState();
    update();
  }

  function setLang(lang) {
    if (!I18N[lang] || lang === state.lang) return;
    // keep focus position across the re-render
    var active = document.activeElement && document.activeElement.id;
    state.lang = lang;
    saveState();
    applyStaticI18n();
    renderForms();
    update();
    if (active && $(active)) $(active).focus();
  }

  function init() {
    applyStaticI18n();
    renderForms();
    $('currency').value = state.currency;

    $('wage-form').addEventListener('input', function (e) { onFieldInput(e.target, 'inputs'); });
    $('offer-form').addEventListener('input', function (e) { onFieldInput(e.target, 'offer'); });
    $('wage-form').addEventListener('submit', function (e) {
      e.preventDefault();
      update();
      if (window.matchMedia('(max-width: 767px)').matches) $('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('offer-form').addEventListener('submit', function (e) { e.preventDefault(); });
    $('currency').addEventListener('change', function (e) { setCurrency(e.target.value); });

    $('reset-btn').addEventListener('click', function () {
      state.inputs = sanitizeValues(DEFAULTS);
      state.offer = sanitizeValues(DEFAULTS);
      state.period = 'month';
      saveState();
      renderForms();
      setCurrency('JPY');
    });

    $('share-x').addEventListener('click', shareOnX);
    $('copy-btn').addEventListener('click', copyResult);
    $('download-btn').addEventListener('click', downloadImage);

    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    document.querySelectorAll('[data-period]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.period = b.getAttribute('data-period');
        saveState();
        update();
      });
    });

    $('compare-toggle').addEventListener('click', function () {
      state.compare = !state.compare;
      saveState();
      updateCompare();
    });
    $('offer-copy').addEventListener('click', function () {
      state.offer = sanitizeValues(state.inputs);
      saveState();
      renderFields($('offer-fields'), 'o', state.offer);
      updateCompare();
    });

    setupStickyBar();
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
