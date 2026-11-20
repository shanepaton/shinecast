# Overlays

The app keeps this folder up to date while you stream. Add a page to OBS as a **Browser source**, and it follows the match.

## Use one

1. In OBS add a Browser source, tick **Local file**, and pick a page from this folder, like `default/scoreboard-singles.html`.
2. Set the size to 1920 x 1080.

## Make your own

This folder is `shinecast/overlay/html/default`, copied there the first time the app ran. The app never changes anything in `html/` after that, so edit freely.

1. Save a copy of a page under another name, like `my-scoreboard.html`, or copy the whole folder to `html/weekly` for a different tournament.
2. Edit your copy. Pages read the data from the `overlay` folder above `html`, wherever they are inside it.

A scoreboard is three files that work together. The page says where things go, `scoreboard.css` is the look (fonts, colours, sizes) and `scoreboard.js` reads the data and fades changes in. Keep them together in a folder, or link to copies you've changed.

Anything that should fade when it changes has the classes `fade away` in the page. The script finds things by their class or id (`.name`, `.score`, `.stock`, `#roundName`, `.casterName` and so on), so keep those when you move things around.

## What a page can read

`data.json`, in the overlay folder above `html/`, is rewritten whenever something changes, so a page can read it every half second:

```
{
  "tournament": { "name", "round", "bestOf" },        // bestOf is 3, 5, "crews" or "endless"
  "players": [{
    "prefix", "name", "pronouns", "country", "region",
    "socials": { "twitter" },
    "character",                                     // the name, or null before one is picked
    "skin", "port",                                  // port is 1 to 4
    "score", "losers",
    "images": { "css", "stock", "saga" }             // paths under the overlay folder, above html/
  }],
  "casters": [{ "name", "twitter", "twitch" }]
}
```

Also in the overlay folder, above `html/`: `images/` holds the pictures the data points to, and `text/` has one plain text file per value (like `player1_score.txt`), for OBS text sources that read from a file.
