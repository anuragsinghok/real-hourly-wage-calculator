# Real Hourly Wage Calculator (RealWage)

A free calculator that shows what you *really* earn per hour after commute time, overtime, unpaid work and work-related costs.

**Live:** https://anuragsinghok.github.io/real-hourly-wage-calculator/

![What do you REALLY earn per hour?](https://anuragsinghok.github.io/real-hourly-wage-calculator/og-image.png)

Most people think they earn ¥1,500/hour. After commute, overtime and costs, it's often ¥900 to ¥1,000. That gap is the point.

## Features

- Live calculation as you type (no button needed)
- Result card: what you think you earn vs. what you REALLY earn, % gap, real vs. paid hours, commute days per year, yearly work costs
- Monthly / yearly view
- Currencies: JPY ¥, USD $, INR ₹, EUR €, GBP £ (symbol only, no conversion)
- Share on X, copy result, download a 1200×630 PNG share card
- Compare your current job with a job offer
- English / 日本語
- Works at 375px, sticky real-wage bar on mobile, dark mode follows your system
- Remembers your inputs on your device (localStorage); still works if storage is blocked
- **Private:** nothing is sent anywhere. All calculation happens in your browser.

## How it works

```
contractHoursMonth = workDays × contractHoursPerDay
paidHoursMonth     = contractHoursMonth + paidOvertime
commuteHoursMonth  = commuteMinutesPerDay × workDays ÷ 60
prepHoursMonth     = prepMinutesPerDay × workDays ÷ 60
realHoursMonth     = paidHoursMonth + unpaidOvertime + commuteHoursMonth + prepHoursMonth

workCostsMonth     = commute + extra food + clothes/equipment + other
realIncomeMonth    = takeHomePay - workCostsMonth

advertisedHourly   = grossSalary ÷ contractHoursMonth
realHourly         = realIncomeMonth ÷ realHoursMonth
differencePercent  = (1 - realHourly ÷ advertisedHourly) × 100
commuteDaysPerYear = commuteHoursMonth × 12 ÷ 24
```

Take-home pay is entered directly, so no country-specific tax rules are needed.

With the default values you should see **¥1,488 → ¥900/hour, 40% less**, 214.5 real hours vs. 178 paid, and 10.5 commute days a year.

## Files

| File | What it is |
|------|------------|
| `index.html` | Page structure, meta tags, result card |
| `style.css` | All styling, light + dark mode |
| `app.js` | Calculation, rendering, EN/JA text, share, copy, PNG card, storage |
| `test.html` / `test.js` | Math check with the default values (open `test.html`, or run `node test.js`) |
| `og-image.html` / `og-image.png` | 1200×630 social preview (screenshot the HTML to regenerate the PNG) |
| `favicon.svg` | Tab icon |

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy (GitHub Pages)

Every push to `main` deploys automatically with GitHub Actions (`.github/workflows/pages.yml`). The math tests run first, so a broken calculation never goes live.

## Analytics (optional)

`index.html` has a commented-out [GoatCounter](https://www.goatcounter.com) snippet (free, no cookies). Create a site, put your code in, and uncomment it.

---

Built in one afternoon. Plain HTML, CSS and JavaScript, no framework, free hosting.

Built by Anurag ([Instagram](https://www.instagram.com/anurag_pov/) · [X](https://x.com/anurag_pov)) in rural Japan 🇯🇵 · Day 1 of 97 of building in public.

## License

[MIT](LICENSE)
