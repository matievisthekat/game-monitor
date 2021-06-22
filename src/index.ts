import { launch, Target } from "puppeteer";
import { mkdir } from "fs-extra";
import { join } from "path";
import { CronJob } from "cron";

import nintendoGb from "./sites/nintendo/co.uk";
import nintendoCom from "./sites/nintendo/com";
import nintendoJp from "./sites/nintendo/co.jp";
import xbox from "./sites/xbox/index";
import playstation from "./sites/playstation/index";

import { publicDir, TaskManager } from "./util";
import "./api";

// const job = new CronJob("0 1 * * *", async () => await run(), null, false, "Europe/London");
// job.start();
run();

async function run() {
  const width = 1119;
  const height = 669;

  const tasks = new TaskManager(3);

  await mkdir(publicDir).catch(() => {});

  await tasks
    .addTask(async () => await mkdir(join(publicDir, "nintendo")).catch(() => {}))
    .addTask(async () => await mkdir(join(publicDir, "xbox")).catch(() => {}))
    .addTask(async () => await mkdir(join(publicDir, "playstation")).catch(() => {}))
    .runAll();

  launch({
    headless: true,
    userDataDir: "./cache",
    defaultViewport: { width, height },
    args: ["--no-sandbox", "--disable-setuid-sandbox" /*, "--proxy-server=lon1.matievisthekat.dev:3128"*/],
  }).then(async (browser) => {
    browser.on("targetcreated", async (target: Target) => {
      const page = await target.page();
      if (page) {
        await page.setRequestInterception(true);
        page.on("request", async (r) => {
          if (["document", "script"].includes(r.resourceType())) await r.continue();
          else await r.abort();
        });
      }
    });

    // try {
    //   await nintendoGb(browser).catch((err) => console.log(`\n\n[nintendo/en-gb]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[nintendo/en-gb)]\n${err}\n\n`);
    // }

    try {
      await nintendoCom(browser).catch((err) => console.log(`\n\n[nintendo/en-us]\n${err}\n\n`));
    } catch (err) {
      console.log(`\n\n[nintendo/en-us]\n${err}\n\n`);
    }

    // try {
    //   await nintendoJp(browser).catch((err) => console.log(`\n\n[nintendo/ja-jp]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[nintendo/ja-jp]\n${err}\n\n`);
    // }

    // try {
    //   await xbox(browser, "en-gb").catch((err) => console.log(`\n\n[xbox/en-gb]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[xbox/en-gb]\n${err}\n\n`);
    // }

    // try {
    //   await xbox(browser, "en-us").catch((err) => console.log(`\n\n[xbox/en-us]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[xbox/en-us]\n${err}\n\n`);
    // }

    // try {
    //   await xbox(browser, "ja-jp").catch((err) => console.log(`\n\n[xbox/ja-jp]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[xbox/ja-jp]\n${err}\n\n`);
    // }

    // try {
    //   await playstation(browser, "en-gb").catch((err) => console.log(`\n\n[playstation/en-gb]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[playstation/en-gb]\n${err}\n\n`);
    // }

    // try {
    //   await playstation(browser, "en-us").catch((err) => console.log(`\n\n[playstation/en-us]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[playstation/en-us]\n${err}\n\n`);
    // }

    // try {
    //   await playstation(browser, "ja-jp").catch((err) => console.log(`\n\n[playstation/ja-jp]\n${err}\n\n`));
    // } catch (err) {
    //   console.log(`\n\n[playstation/ja-jp]\n${err}\n\n`);
    // }

    await browser.close();
    console.log("\n\nFetched games\n\n");
  });
}
