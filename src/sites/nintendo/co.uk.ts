import { join } from "path";
import { publicDir, TaskManager, wait, write } from "../../util";
import { Browser, Page } from "puppeteer";
import { BasicInfo, Game } from "../../types";
import { Presets, SingleBar } from "cli-progress";

const json = join(publicDir, "nintendo/en-gb.json");

const url = "https://www.nintendo.co.uk/Search/Search-299117.html?f=147394-89";

export default async function (browser: Browser) {
  // const page = await browser.newPage();
  const manager = new TaskManager(5);
  // const _basicInfo: BasicInfo[] = [];

  // console.log("[nintendo/en-gb] Fetching game urls...");

  // await page.goto(url, { timeout: 120000 });
  // await page.click("a.pla-btn.pla-btn--dark.pla-btn--block.plo-cookie-overlay__accept-btn").catch(() => {});
  // await page.waitForSelector("ul.results > li.searchresult_row > div > div > a > div.search-result-img > img");
  // await page.waitForSelector("ul.results > li.searchresult_row > div > div > a > div.search-result-txt > p.page-title > span", {
  //   visible: true,
  // });

  // const pages = await page.evaluate(() => {
  //   const buttons: Element[] = Array.prototype.slice.call(document.querySelectorAll("button.btn.btn-primary"));
  //   buttons.pop();
  //   const max = buttons.pop()?.textContent;
  //   return parseInt(max || "0");
  // });

  // const getGames = async (page: Page) => {
  //   const results = await page.$$("ul.results > li.searchresult_row > div > div > a");
  //   results.shift();
  //   for (const result of results) {
  //     const img = (await result.$eval("img", (e) => (e as HTMLImageElement).src).catch(() => {})) || undefined;
  //     const url = await result.evaluate((e) => (e as HTMLAnchorElement).href);
  //     const name = await result.$eval("span.page-title-text", (e) => e.textContent || "[unknown]");

  //     _basicInfo.push({ url, name, img });
  //   }
  // };

  // await getGames(page);
  // await page.close();

  // for (let i = 1; i <= pages; i++) {
  //   manager.addTask(async () => {
  //     return new Promise<void>(async (resolve, reject) => {
  //       const page = await browser.newPage();
  //       await page.goto(`${url}&p=${i}`, { timeout: 120000 }).catch(() => {});

  //       await page
  //         .waitForSelector("ul.results > li.searchresult_row > div > div > a > div.search-result-txt > p.page-title > span")
  //         .then(async () => {
  //           await getGames(page);
  //           resolve();
  //         })
  //         .catch(() => resolve())
  //         .finally(async () => await page.close());
  //     });
  //   });
  // }

  // await manager.runAll();

  // const basicInfo = [...new Set(_basicInfo)];
  const { basicInfo } = require("../../../public/nintendo/en-gb.json");
  await write(json, { basicInfo });
  const games: Game[] = [];
  const bar = new SingleBar(
    { format: "[nintendo/en-gb] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}", etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name, img } of basicInfo) {
    manager.addTask(() => {
      return new Promise<void>(async (resolve) => {
        const page = await browser.newPage();
        await page.goto(url, { timeout: 120000, waitUntil: "domcontentloaded" }).catch((e) => console.log("\n", url, e));

        page
          .waitForSelector("span.gamepage-header-meta", { visible: true })
          .then(async () => {
            const release = (await page.$$("span.gamepage-header-meta")).pop();

            const availability = release
              ? (await release.evaluate((e) => e.textContent?.toLowerCase().includes("no longer available")))
                ? "unavailable"
                : "available"
              : "unknown";

            games.push({ name, availability, url, img });
            resolve();
          })
          .catch(() => {
            games.push({ name, availability: "unknown", url, img });
            resolve();
          })
          .finally(async () => {
            await page.close();
            bar.increment();
          });
      });
    });
  }

  await manager.runAll();
  await write(json, { games });
  console.log("\n[nintendo/en-gb] Done\n");
}
