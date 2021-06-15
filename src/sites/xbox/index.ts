import { SingleBar, Presets } from "cli-progress";
import { join } from "path";
import { Browser, Page } from "puppeteer";
import { BasicInfo, Game, Locale } from "../../types";
import { publicDir, spinner, TaskManager, wait, write } from "../../util";

export default async function (browser: Browser, locale: Locale) {
  const json = join(publicDir, `xbox/${locale}.json`);
  const { stop } = spinner(`[xbox/${locale}] Fetching game urls...`);

  const page = await browser.newPage();
  await page.goto(`https://www.xbox.com/${locale}/games/all-games?cat=all`);

  const handlePopup = async (page: Page) => {
    if (await page.$("div#srInvBody").catch(() => {})) {
      await page.click("img#closeBtn").catch((e) => console.log("\n", "img#closeBtn failed to click", e));
      await wait(1000);
    }
  };

  const sortListButton =
    "section.select-menu.live-area.sort-area.x-visible-inline-block.gameSort.generalSort > div.c-select div.c-select-menu.f-persist > button";

  await handlePopup(page);
  await page.waitForSelector(sortListButton);
  await page.hover(sortListButton);
  await page.click(sortListButton);

  await page.waitForSelector('li[id$="-select-menu-2"]');
  await wait(1000);
  await page.hover('li[id$="-select-menu-2"]');
  await page.click('li[id$="-select-menu-2"]');

  await page.waitForSelector("div.m-product-placement-item.context-game.gameDiv", { timeout: 0 });
  await wait(5000);

  const pageinateButton = "section.paginateDropdown > div > div.c-select-menu.f-persist > button";
  await page.hover(pageinateButton);
  await page.click(pageinateButton);
  await wait(1000);
  await page.hover("section.paginateDropdown > div > div > ul > li[id$='-select-menu-3'] > span");
  await page.click("section.paginateDropdown > div > div > ul > li[id$='-select-menu-3'] > span");

  const _basicInfo: BasicInfo[] = [];
  let plsBreak = false;

  while (true) {
    if (plsBreak) break;
    else {
      await wait(1000);
      const games = await page.$$("a.gameDivLink");
      for (const game of games) {
        const img = await game.$eval("picture > img", (e) => (e as HTMLImageElement).src);
        const url = await game.evaluate((e) => (e as HTMLAnchorElement).href);
        const name = await game.$eval("div > h3", (e) => e.textContent || "[unknown]");
        _basicInfo.push({ url, name, img });
      }

      const next = await page.$("li.paginatenext");
      if (next) {
        await next.hover();
        await next.click().catch(() => (plsBreak = true));
        await wait(500);
      } else plsBreak = true;
    }
  }

  await page.close();
  stop();

  const manager = new TaskManager(5);
  const basicInfo = [...new Set(_basicInfo)];
  await write(json, { basicInfo });
  const games: Game[] = [];
  const bar = new SingleBar(
    { format: `[xbox/${locale}] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}`, etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name, img } of basicInfo) {
    manager.addTask(async () => {
      const page = await browser.newPage();
      const game: Game = { url, name, availability: "unavailable", img };

      await page.goto(url, { timeout: 0 }).catch((e) => console.log(`\n${url} ${e}`));

      if (url.includes("microsoft")) {
        if (page.url().startsWith(url)) {
          await page.waitForSelector("div#productTitle > * > *").catch((e) => console.log(`\n${url} ${e}`));

          game.availability = (await page.$("button#buttonPanel_AppIdentityBuyButton")) ? "available" : "unavailable";
        }
      } else {
        await page.waitForSelector("a.c-call-to-action.c-glyph").catch((e) => console.log(`\n${url} ${e}`));

        game.availability = (await page.$("a.c-call-to-action.c-glyph")) ? "available" : "unavailable";
      }

      games.push(game);
      await page.close();
      bar.increment();
    });
  }

  await manager.runAll();
  await write(json, { games });
  console.log(`\n[xbox/${locale}] Done\n`);
}
