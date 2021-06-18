import { Presets, SingleBar } from "cli-progress";
import { join } from "path";
import { Browser } from "puppeteer";
import { Availability, BasicInfo, Game, Locale } from "../../types";
import { publicDir, TaskManager, wait, write } from "../../util";

export default async function (browser: Browser, locale: Locale) {
  const json = join(publicDir, `playstation/${locale}.json`);
  console.log(`[playstation/${locale}] Fetching game urls...`);

  const page = await browser.newPage();
  await page.goto(`https://store.playstation.com/${locale}/collections`, { timeout: 120000 });

  await page.waitForSelector("h2#title-bbc9be0f-fe39-11ea-aadc-062143ad1e8d");

  const genreList = (await page.$$("ul.ems-sdk-collection__list"))[1];
  const genreUrls = await genreList.$$eval("li > a", (els) => els.map((e) => (e as HTMLAnchorElement).href));

  await page.close();

  const manager = new TaskManager(5);
  const _basicInfo: BasicInfo[] = [];

  for (const url of genreUrls) {
    manager.addTask(async () => {
      const page = await browser.newPage();
      await page.goto(url, { timeout: 120000 });

      const waitForItems = async () => {
        await page.waitForSelector("ul.ems-sdk-product-tile-list > li.psw-cell > div > a");
        await page.waitForSelector("div.ems-sdk-grid-paginator__page-buttons > button");
      };

      await waitForItems();

      const nextSel = "button.ems-sdk-grid-paginator__button.psw-button.psw-primary-button";
      const next = (await page.$$(nextSel))[1];

      let plsBreak = false;
      while (true) {
        if (plsBreak) break;
        else {
          await waitForItems();

          const games = await page.$$("li.psw-cell > div > a.ems-sdk-product-tile-link");
          for (const game of games) {
            const url = await game.evaluate((e) => (e as HTMLAnchorElement).href);
            const name = await game.$eval("section > span", (e) => e.textContent || "[unknown]");
            _basicInfo.push({ url, name });
          }

          const nextDisabled = await next.evaluate((e) => e.classList.contains("psw-is-disabled"));
          if (nextDisabled) plsBreak = true;
          else {
            await next.hover();
            await wait(500);
            await next.click();
            await waitForItems();
          }
        }
      }

      await page.close();
    });
  }

  await manager.runAll();
  const basicInfo = [...new Set(_basicInfo)];
  // await write(json, { basicInfo });
  const games: Game[] = [];
  const bar = new SingleBar(
    { format: `[playstation/${locale}] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}`, etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name } of basicInfo) {
    manager.addTask(async () => {
      const page = await browser.newPage();
      let availability: Availability = "unavailable";

      await page.goto(url, { timeout: 0 }).catch((e) => console.log(`\n${page.url()} ${e}`));
      await page
        .waitForSelector('span.psw-h3[data-qa="mfeCtaMain#offer0#finalPrice"]')
        .catch(() => (availability = "unavailable"));
      await page.waitForSelector("h1.psw-m-b-xs").catch((e) => console.log(`\n${url} ${e}`));

      availability = await page
        .$eval('span.psw-h3[data-qa="mfeCtaMain#offer0#finalPrice"]', (e) =>
          e.textContent?.toLowerCase().includes("not available") ? "unavailable" : "available"
        )
        .catch(() => "unavailable");

      games.push({ name, availability, url });
      await page.close();
      bar.increment();
    });
  }

  await manager.runAll();
  await write(json, { games }).catch((e) => console.log(`\n${e}`));
  console.log(`\n[playstation/${locale}] Done`);
}
