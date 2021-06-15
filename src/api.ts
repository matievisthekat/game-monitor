import express from "express";
import { compareTwoStrings } from "string-similarity";
import { BasicInfo, BasicInfoSearch, JsonFile, Locale, Site } from "./types";
import { checkSiteAndLocale, getALlJson, getJson } from "./util";

const app = express();
const port = 3000;

app.set("json spaces", 2);

app.get("/", async (req, res) => {
  const all = await getALlJson();
  res.status(200).json({ amount: all.games.length });
});

app.get("/:site/:locale", async (req, res) => {
  const { site, locale } = req.params;

  const error = checkSiteAndLocale(site, locale);
  if (error) return res.status(400).json({ error });

  const data = await getJson(site as Site, locale as Locale);
  res.status(200).json(data);
});

app.get("/search", async (req, res) => {
  const { _site, _locale, _q } = req.query;

  const site = Array.isArray(_site) ? _site.join(" ") : (_site as string);
  const locale = Array.isArray(_locale) ? _locale.join(" ") : (_locale as string);
  const q = Array.isArray(_q) ? _q.join(" ") : (_q as string);

  if (!q) return res.status(400).json({ error: "Query 'q' was not provided" });

  const error = checkSiteAndLocale(site, locale);
  if (error) return res.status(400).json({ error });

  const games: BasicInfo[] = [];

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

    games.push(...jp.games.concat(com.games, gb.games, us.games));
  } else if (!site && locale) {
    const xbox = await getJson("xbox", locale as Locale);
    const playstation = await getJson("playstation", locale as Locale);
    const nintendo = await getJson("nintendo", locale as Locale);

    games.push(...xbox.games.concat(playstation.games, nintendo.games));
  } else if (site && locale) {
    games.push(...(await getJson(site as Site, locale as Locale)).games);
  } else {
    games.push(...(await getALlJson()).games);
  }

  const searchedGames: BasicInfoSearch[] = [];
  for (const game of games) {
    const similarity = compareTwoStrings(q, game.name);
    searchedGames.push(Object.assign({ similarity }, game));
  }

  const sortedSearchedGames = searchedGames.sort((a, b) => b.similarity - a.similarity);
  res.status(200).json(sortedSearchedGames);
});

app.listen(port, () => console.log(`[api] Listening on port ${port}`));
