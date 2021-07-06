import { join } from "path";
import { publicDir, TaskManager, wait, write } from "../../util";
import { Browser } from "puppeteer";
import { Presets, SingleBar } from "cli-progress";
import { Availability, BasicInfo, Game } from "../../types";

const json = join(publicDir, "nintendo/en-us.json");

interface GameTile extends Element {
  href: string;
}

const url =
  "https://www.nintendo.com/games/game-guide/#filter/:q=&dFR[platform][0]=Nintendo%20Switch&dFR[platform][1]=Nintendo%203DS&indexName=ncom_game_en_us_title_asc";

const priceFilters = [
  "Free%20to%20start",
  "%240%20-%20%244.99",
  "%245%20-%20%249.99",
  "%2410%20-%20%2419.99",
  "%2420%20-%20%2439.99",
  "%2440%2B",
];

const genreFilters = [
  "Action",
  "Adventure",
  "Application",
  "Education",
  "Fitness",
  "Indie",
  "Music",
  "Party",
  "Puzzle",
  "Racing",
  "Role-Playing",
  "Simulation",
  "Sports",
  "Strategy",
];

export default async function (browser: Browser) {
  const manager = new TaskManager(1);
  const _basicInfo: BasicInfo[] = [];

  console.log("[nintendo/en-us] Fetching game urls...");

  for (const genre of genreFilters) {
    for (const price of priceFilters) {
      manager.addTask(() => {
        return new Promise<void>(async (resolve) => {
          const page = await browser.newPage();
          await page.goto(`${url}&dFR[genres][0]=${genre}&dFR[priceRange][0]=${price}`, { timeout: 0 });

          const sel = "styled-button#btn-load-more > span";
          let plsBreak = false;

          while (true) {
            if (plsBreak) break;
            else {
              await page.waitForSelector(sel, { timeout: 0 });
              await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), sel);
              await wait(1000);
              const e = await page.$(sel).catch(() => {});
              if (e) {
                await e.click().catch(() => (plsBreak = true));
              } else plsBreak = true;
            }
          }

          const tiles = await page.$$("game-tile");

          for (const tile of tiles) {
            const url = await tile.evaluate((e) => `https://nintendo.com${(e as GameTile).href}`);
            const name = await tile.$eval("h3", (e) => e.textContent || "[unknown]");
            const img = await tile.evaluate((e) => e.shadowRoot?.querySelector<HTMLImageElement>("div > a > img.loaded")?.src);
            _basicInfo.push({ url, name, img });
          }

          await page.close();
          resolve();
        });
      });
    }
  }

  await manager.runAll();
  const basicInfo = [...new Set(_basicInfo)];
  const games: Game[] = [];
  const bar = new SingleBar(
    { format: "[nintendo/en-us] [{bar}] {percentage}% ({value}/{total}) | ETA {eta_formatted}", etaBuffer: 100 },
    Presets.shades_classic
  );

  bar.start(basicInfo.length, 0);
  for (const { url, name, img } of basicInfo) {
    manager.addTask(() => {
      return new Promise<void>(async (resolve) => {
        const page = await browser.newPage();
        await page.goto(url, { timeout: 0 });

        const end = async (availability?: Availability | void | null) => {
          games.push({ name, url, availability: availability || "unavailable", img });

          await page.close();
          bar.increment();
          resolve();
        };

        await page.waitForFunction(() => {
          const div = document.querySelector("div#purchase-options.purchase-info");
          if (!div) return true;
          else return div.classList.contains("loaded");
        });

        page
          .waitForSelector("div.buy-digital > a > styled-button" /*, { visible: true }*/)
          .then(async () => {
            const buttonVisible = await page.$eval(
              "a.digital-purchase.buy-now-link",
              (e) => (e as HTMLAnchorElement).style.display !== "none"
            );

            if (!buttonVisible) return await end();

            const availability = (await page
              .$eval("a.digital-purchase.buy-now-link > styled-button.buy-now", (e) => e.textContent?.toLowerCase())
              .catch(() => {}))
              ? "available"
              : "unavailable";

            await end(availability);
          })
          .catch(async () => await end());
      });
    });
  }

  await manager.runAll();
  await write(json, { games });
  console.log("\n[nintendo/en-us] Done\n");
}
