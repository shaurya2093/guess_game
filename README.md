# Third Umpire

A daily cricketer guessing game. Everyone gets the same mystery player each day and has 8 guesses. After each guess, five clues (country, role, batting hand, birth year, debut year) show how close the pick is.

It is a static site: plain HTML, CSS and JavaScript, with no build step and no server.

## Features

- One puzzle a day, the same for every player, changing at local midnight
- Colour-coded clues with later/earlier arrows for years
- Streaks and a guess distribution, saved in the browser
- Shareable emoji score that does not reveal the answer
- Unlimited practice rounds that do not affect the streak
- Light and dark themes, keyboard friendly, built for phones first

## Run it locally

Open `index.html` in a browser. Nothing to install.

## Put it online with GitHub Pages

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the `main` branch and the `/ (root)` folder, then save.
4. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Styling |
| `players.js` | The player list. Add or correct players here |
| `core.js` | Game rules: daily pick, clue comparison, search, share text |
| `game.js` | Screen logic: input, rendering, stats, sharing |
| `tests/test.js` | Data and logic checks |

## Adding players

Append a row to `ROWS` in `players.js`:

```js
["Player Name", "IND", "BAT", "R", 1990, 2012],
```

The columns are name, country code, role (`BAT`, `WK`, `AR`, `PACE`, `SPIN`), batting hand (`L` or `R`), birth year, and the year of the first international match. Then run the checks:

```
node tests/test.js
```

Adding players changes which cricketer falls on which future day, so add them in batches rather than daily.

## Notes

- The player facts were entered by hand. Spot-check them before promoting the game widely.
- The game uses names and facts only. Do not add player photos, team logos or league branding, which are licensed.
