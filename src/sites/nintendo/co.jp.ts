import { join } from "path";
import { publicDir, TaskManager, write } from "../../util";
import { Browser, Page } from "puppeteer";
import { BasicInfo, Game } from "../../types";
import { Presets, SingleBar } from "cli-progress";

const json = join(publicDir, "nintendo/ja-jp.json");

const url = "https://www.nintendo.co.jp/software/switch/index.html?sftab=all&sfsort=adate";

export default async function (browser: Browser) {
  const page = await browser.newPage();
  const manager = new TaskManager(10);
  const _basicInfo: BasicInfo[] = [];

  console.log("[nintendo/ja-jp] Fetching game urls...");

  await page.goto(url);
  await page.waitForSelector("li.nc3-as-result__listItem.nc3-l-grid__cell.is-shown.is-visible");
  await page.waitForSelector("div.nc3-js-scrollbar__content > div.nc3-js-scrollbar__content");

  const pages = await page.$$(
    "div.nc3-js-scrollbar__content > div.nc3-js-scrollbar__content > ul.nc3-c-pagination__list > li"
  );

  const getPageGames = async (page: Page) => {
    const results = await page.$$("li.nc3-as-result__listItem.nc3-l-grid__cell.is-shown.is-visible");
    for (const result of results) {
      const img = await result.$eval("div.nc3-c-softCard__thumb > div > img", (e) => (e as HTMLImageElement).src);
      const url = await result.$eval("div.nc3-c-softCard > a", (e) => (e as HTMLAnchorElement).href);
      const name = await result.$eval(
        "div.nc3-c-softCard > a > div > div > div.nc3-c-softCard__name",
        (e) => e.textContent || "[unknown]"
      );

      _basicInfo.push({ url, name, img });
    }
  };

  await getPageGames(page);
  await page.close();

  for (let i = 2; i < pages.length; i++) {
    manager.addTask(async () => {
      const tmp = await browser.newPage();
      await tmp.goto(url);

      await tmp.goto(`${url}&spage=${i}`, { timeout: 0 });
      await tmp.waitForSelector("li.nc3-as-result__listItem.nc3-l-grid__cell.is-shown.is-visible");

      await getPageGames(tmp);
      await tmp.close();
    });
  }

  await manager.runAll();
  const basicInfo = [...new Set(_basicInfo)];
  await write(json, { basicInfo });
  const games: Game[] = [];
  const bar = new SingleBar(
    { format: "[nintendo/ja-jp] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}", etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name, img } of basicInfo) {
    manager.addTask(() => {
      return new Promise<void>(async (resolve) => {
        const page = await browser.newPage();
        await page.goto(url, { timeout: 0 }).catch((e) => console.log("\n", url, e));

        page
          .waitForSelector("h1.productDetail--headline__title")
          .then(async () => {
            await page.waitForSelector("a.productDetail--buttons__button--primary");

            const availability =
              (await page
                .$eval("a.productDetail--buttons__button--primary", (e) => e.textContent?.trim())
                .catch(() => {})) || "unavailable";

            games.push({ name, availability, url, img });
            resolve();
          })
          .catch(() => resolve())
          .finally(async () => {
            await page.close();
            bar.increment();
          });
      });
    });
  }

  await manager.runAll();
  await write(json, { games });
  console.log("\n[nintendo/ja-jp] Done\n");
}
