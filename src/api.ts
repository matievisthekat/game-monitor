import express from "express";
import MiniSearch from "minisearch";
import { BasicInfo, JsonFile, Locale, Site } from "./types";
import { checkSiteAndLocale, getALlJson, getJson, publicDir, removeDuplicates } from "./util";

const app = express();
const port = 3000;

app.set("json spaces", 2);
app.use(express.static(publicDir));

app.get("/api", async (req, res) => {
  const all = await getALlJson();
  res.status(200).json({ amount: all.games.length, games: all.games });
});

app.get("/api/unavailable", async (req, res) => {
  const all = await getALlJson();
  const unavailable = all.games.filter(
    (g) => g && (g.availability === "unavailable" || !["購入にすすむ", "無料ダウンロード", "available"].includes(g.availability))
  );
  res.status(200).json({ amount: unavailable.length, games: unavailable });
});

app.get("/api/search", async (req, res) => {
  const { site: _site, locale: _locale, q: _q } = req.query;

  const site = _site as string;
  const locale = _locale as string;
  const q = _q as string;

  if (!q) return res.status(400).json({ error: "Query 'q' was not provided" });

  const error = checkSiteAndLocale(site, locale);
  if (error) return res.status(400).json({ error });

  const _games: BasicInfo[] = [];

  if (site && !locale) {
    const jp = await getJson(site as Site, "ja-jp");
    const gb = await getJson(site as Site, "en-gb");
    const us = await getJson(site as Site, "en-us");

    _games.push(...jp.games.concat(gb.games, us.games));
  } else if (!site && locale) {
    const xbox = await getJson("xbox", locale as Locale);
    const nintendo = await getJson("nintendo", locale as Locale);

    _games.push(...xbox.games.concat(nintendo.games));
  } else if (site && locale) {
    _games.push(...(await getJson(site as Site, locale as Locale)).games);
  } else {
    _games.push(...(await getALlJson()).games);
  }

  const _gamesClean = _games.filter((g) => !!g);
  const games = removeDuplicates(_gamesClean);
  const gamesWithId = games.map((g, id) => Object.assign(g, { id }));

  const mini = new MiniSearch({
    fields: ["name"],
    storeFields: ["name", "availability", "img", "url"],
  });

  mini.addAll(gamesWithId);
  const results = mini.search(q, { fuzzy: 0.2 });

  res.status(200).json(results);
});

app.get("/api/:site", async (req, res) => {
  const { site } = req.params as Record<string, string>;

  if (!["xbox", "nintendo"].includes(site)) return res.status(400).json({ error: "Invalid 'site' param" });

  const { games } = await getJson(site as Site);
  res.status(200).json({ amount: games.length, games });
});

app.get("/api/:site/:locale", async (req, res) => {
  const { site, locale } = req.params as Record<string, string>;

  if (!["xbox", "nintendo"].includes(site)) return res.status(400).json({ error: "Invalid 'site' param" });
  if (!["en-gb", "en-us", "ja-jp"].includes(locale)) return res.status(400).json({ error: "Invalid 'locale' param" });

  const { games } = await getJson(site as Site, locale as Locale);
  res.status(200).json({ amount: games.length, games });
});

app.listen(port, () => console.log(`[api] Listening on port ${port}`));
