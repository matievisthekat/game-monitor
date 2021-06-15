import { Presets, SingleBar } from "cli-progress";
import { resolve } from "path";
import { Browser } from "puppeteer";
import { BasicInfo, Game } from "../../types";
import { spinner, TaskManager, wait, write } from "../../util";

const json = resolve("playstation.gb.json");

export default async function (browser: Browser) {
  const { stop } = spinner("[playstation.gb] Fetching game urls...");

  const page = await browser.newPage();
  await page.goto("https://store.playstation.com/en-gb/collections");

  await page.waitForSelector("h2#title-bbc9be0f-fe39-11ea-aadc-062143ad1e8d");

  const genreList = (await page.$$("ul.ems-sdk-collection__list"))[1];
  const genreUrls = await genreList.$$eval("li > a", (els) => els.map((e) => (e as HTMLAnchorElement).href));

  await page.close();

  const manager = new TaskManager(5);
  const _basicInfo: BasicInfo[] = [];

  for (const url of genreUrls) {
    manager.addTask(async () => {
      const page = await browser.newPage();
      await page.goto(url);

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
  await write(json, { basicInfo });
  stop();

  const games: Game[] = [];
  const bar = new SingleBar(
    { format: "[playstation.gb] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}", etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name } of basicInfo) {
    manager.addTask(async () => {
      const page = await browser.newPage();
      let availability = "";

      await page.goto(url);
      await page
        .waitForSelector('span.psw-h3[data-qa="mfeCtaMain#offer0#finalPrice"]')
        .catch((e) => (availability = "unavailable"));
      await page.waitForSelector("h1.psw-m-b-xs").catch((e) => console.log(`${url} ${e}`));

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
  await write(json, { games });
  console.log("\n[playstation.gb] Done");
}
