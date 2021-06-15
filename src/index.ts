import { launch } from "puppeteer";
import { mkdir } from "fs-extra";
import { resolve, join } from "path";

import nintendoCom from "./sites/nintendo/com";
import nintendoJp from "./sites/nintendo/co.jp";

import xbox from "./sites/xbox/index";

import playstationGb from "./sites/playstation/gb";
import playstationUs from "./sites/playstation/us";
import playstationJp from "./sites/playstation/jp";

import { publicDir, TaskManager } from "./util";

const width = 1024;
const height = 600;

launch({
  headless: true,
  defaultViewport: { width, height },
  args: ["--proxy-server=vps.matievisthekat.dev:3128"],
}).then(async (browser) => {
  const tasks = new TaskManager(3);

  await mkdir(resolve("src", "public")).catch(() => {});

  await tasks
    .addTask(async () => await mkdir(join(publicDir, "nintendo")).catch(() => {}))
    .addTask(async () => await mkdir(join(publicDir, "xbox")).catch(() => {}))
    .addTask(async () => await mkdir(join(publicDir, "playstation")).catch(() => {}))
    .runAll();

  tasks.setLimit(1);

  await tasks
    // .addTask(async () => await nintendoJp(browser))
    // .addTask(async () => await nintendoCom(browser))

    .addTask(async () => await xbox(browser, "en-gb"))
    .addTask(async () => await xbox(browser, "en-us"))
    .addTask(async () => await xbox(browser, "ja-jp"))

    // .addTask(async () => await playstationGb(browser))
    // .addTask(async () => await playstationUs(browser))
    // .addTask(async () => await playstationJp(browser))
    .runAll();

  await browser.close();
});
