import { readJSON, writeJSON } from "fs-extra";
import { resolve, join } from "path";
import { BasicInfo, JsonFile, Locale, Site } from "./types";

export const publicDir = resolve("src", "public");

export function removeDuplicates(games: BasicInfo[]) {
  return games.filter((v, i) => games.indexOf(v) === i);
}

export function checkSiteAndLocale(site?: string, locale?: string) {
  if (locale && !["en-gb", "en-us", "ja-jp"].includes(locale)) return "Invalid 'locale' param";
  if (site && !["nintendo", "xbox", "playstation"].includes(site)) return "Invalid 'site' param";
  if (site !== "nintendo" && locale === "en-(gb+us)") return "Locale 'en-(gb+us)' is only available for Nintendo";
}

export async function getALlJson() {
  const nintendoJp = await getJson("nintendo", "ja-jp");
  const nintendoCom = await getJson("nintendo", "en-(gb+us)");
  const xboxGb = await getJson("xbox", "en-gb");
  const xboxUs = await getJson("xbox", "en-us");
  const xboxJp = await getJson("xbox", "ja-jp");
  const playstationGb = await getJson("playstation", "en-gb");
  const playstationUs = await getJson("playstation", "en-us");
  const playStationJp = await getJson("playstation", "ja-jp");

  return {
    games: nintendoJp.games.concat(
      nintendoCom.games,
      xboxGb.games,
      xboxUs.games,
      xboxJp.games,
      playstationGb.games,
      playstationUs.games,
      playStationJp.games
    ),
  };
}

export function getJson(site: Site, locale: Locale) {
  return new Promise<JsonFile>((resolve) => {
    if (site === "nintendo" && (locale === "en-gb" || locale === "en-us")) locale = "en-(gb+us)";

    const json = join(publicDir, site, `${locale}.json`);
    readJSON(json)
      .then((data) => resolve(data))
      .catch(() => resolve({ games: [] }));
  });
}

export function toProperCase(s: string) {
  if (!s) return s;
  return s
    .split(/ +/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1, w.length))
    .join(" ");
}

export function wait(t: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, t));
}

export async function write(file: string, data: any) {
  return await writeJSON(file, data, { spaces: 2 });
}
export type TaskFunc = () => Promise<void>;

export class TaskManager {
  public limit: number;
  private tasks: TaskFunc[] = [];
  private running: TaskFunc[] = [];
  private onDone: () => void = () => {};

  constructor(limit: number) {
    this.limit = limit;
  }

  public runAll() {
    return new Promise<void>((resolve) => {
      this.start().done(resolve);
    });
  }

  public start() {
    let i: NodeJS.Timeout;

    i = setInterval(() => {
      if (this.tasks.length + this.running.length === 0) {
        this.onDone();
        clearInterval(i);
      } else if (this.running.length < this.limit && this.tasks.length > 0) {
        this.runTask(this.tasks[0]);
      }
    }, 1000);

    return { done: (func: () => void) => (this.onDone = func) };
  }

  public addTask(t: TaskFunc) {
    this.tasks.push(t);
    return this;
  }

  public removeTask(t: TaskFunc) {
    this.tasks.splice(this.tasks.indexOf(t), 1);
    return this;
  }

  public setLimit(n: number) {
    this.limit = n;
    return this;
  }

  private runTask(t: TaskFunc) {
    return new Promise<void>((resolve) => {
      this.addRunning(t);
      this.removeTask(t);
      t().then(() => {
        this.removeRunning(t);
        resolve();
      });
    });
  }

  private addRunning(t: TaskFunc) {
    this.running.push(t);
    return this;
  }

  private removeRunning(t: TaskFunc) {
    this.running.splice(this.running.indexOf(t), 1);
    return this;
  }
}
