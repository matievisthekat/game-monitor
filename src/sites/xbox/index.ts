import { SingleBar, Presets } from "cli-progress";
import { join } from "path";
import { Browser, Page } from "puppeteer";
import { BasicInfo, Game, Locale } from "../../types";
import { publicDir, TaskManager, wait, write } from "../../util";

export default async function (browser: Browser, locale: Locale) {
  const json = join(publicDir, `xbox/${locale}.json`);
  console.log(`[xbox/${locale}] Fetching game urls...`);

  const page = await browser.newPage();
  await page.goto(`https://www.xbox.com/${locale}/games/all-games?cat=all`, { timeout: 0 });

  const handlePopup = async (page: Page) => {
    if (await page.$("div#srInvBody").catch(() => {})) {
      await page.click("img#closeBtn").catch((e) => console.log("\n", "img#closeBtn failed to click", e));
      await wait(1000);
    }
  };

  await handlePopup(page);
  await page.waitForSelector("div.m-product-placement-item.context-game.gameDiv", { timeout: 0 });

  const sortListButton =
    "section.select-menu.live-area.sort-area.x-visible-inline-block.gameSort.generalSort > div.c-select div.c-select-menu.f-persist > button";
  await page.waitForSelector(sortListButton, { visible: true });
  await page.hover(sortListButton);
  await page.click(sortListButton);

  await page.waitForSelector('li[id$="-select-menu-2"]', { visible: true });
  await wait(1000);
  await page.hover('li[id$="-select-menu-2"]');
  await page.click('li[id$="-select-menu-2"]');

  const paginateButton = "section.paginateDropdown > div > div > button";
  await page.hover(paginateButton);
  await page.click(paginateButton);

  const paginateLi = "section.paginateDropdown > div > div > ul > li[id$='-select-menu-3'] > span";
  await page.waitForSelector(paginateLi);
  await page.hover(paginateLi);
  await page.click(paginateLi);

  await page.waitForSelector("div.m-product-placement-item.context-game.gameDiv", { timeout: 0, visible: true });

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
        await next.evaluate((e) => e?.scrollTo());
        await next.click().catch(() => (plsBreak = true));
        await wait(500);
      } else plsBreak = true;
    }
  }

  await page.close();
  const manager = new TaskManager(5);
  const basicInfo = [...new Set(_basicInfo)];
  // await write(json, { basicInfo });
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

      await page.goto(url, { timeout: 0 }).catch((e) => console.log(`\n${url}\n${e}`));

      if (url.includes("microsoft.com")) {
        if (page.url().startsWith(url)) {
          await page
            .waitForSelector("div#productTitle > * > *", { timeout: 120000 })
            .catch((e) => console.log(`\n${url}\n${e}`));

          game.availability = (await page.$("button#buttonPanel_AppIdentityBuyButton")) ? "available" : "unavailable";
        }
      } else {
        const over18 = await page.$("div#over18 > a");
        if (over18) {
          await over18.hover().catch(() => {});
          await over18.click().catch(() => {});
        }

        await page
          .waitForSelector("a.c-call-to-action.c-glyph", { timeout: 120000 })
          .catch((e) => console.log(`\n${url}\n${e}`));

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
