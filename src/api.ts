import express from "express";
import { go } from "fuzzysort";
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
    (g) =>
      g.availability === "unavailable" || !["購入にすすむ", "無料ダウンロード", "available"].includes(g.availability)
  );
  res.status(200).json({ amount: unavailable.length, games: unavailable });
});

app.get("/api/search", async (req, res) => {
  const { site: _site, locale: _locale, q: _q } = req.query;

  const site = Array.isArray(_site) ? _site.join(" ") : (_site as string);
  const locale = Array.isArray(_locale) ? _locale.join(" ") : (_locale as string);
  const q = Array.isArray(_q) ? _q.join(" ") : (_q as string);

  if (!q) return res.status(400).json({ error: "Query 'q' was not provided" });

  const error = checkSiteAndLocale(site, locale);
  if (error) return res.status(400).json({ error });

  const _games: BasicInfo[] = [];

  if (site && !locale) {
    let com: JsonFile = { games: [] };
    let gb: JsonFile = { games: [] };
    let us: JsonFile = { games: [] };

    const jp = await getJson(site as Site, "ja-jp");

    if (site === "nintendo") {
      com = await getJson(site, "en-(gb+us)");
    } else {
      gb = await getJson(site as Site, "en-gb");
      us = await getJson(site as Site, "en-us");
    }

    _games.push(...jp.games.concat(com.games, gb.games, us.games));
  } else if (!site && locale) {
    const xbox = await getJson("xbox", locale as Locale);
    const playstation = await getJson("playstation", locale as Locale);
    const nintendo = await getJson("nintendo", locale as Locale);

    _games.push(...xbox.games.concat(playstation.games, nintendo.games));
  } else if (site && locale) {
    _games.push(...(await getJson(site as Site, locale as Locale)).games);
  } else {
    _games.push(...(await getALlJson()).games);
  }

  const _gamesClean = _games.filter((g) => !!g);
  const games = removeDuplicates(_gamesClean);
  const names = games.map((g) => g.name);
  const results = go(q, [...new Set(names)])
    .concat([])
    .sort((a, b) => b.score - a.score);

  res
    .status(200)
    .json(results.map((r) => Object.assign(games.find((g) => g.name === r.target) as BasicInfo, { score: r.score })));
});

app.listen(port, () => console.log(`[api] Listening on port ${port}`));
