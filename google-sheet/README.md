# Play log on Google Sheets

BoxScore stores every logged play as a row in a Google Sheet. A small Apps
Script web app sits in front of the sheet so the site can read and add plays.

## Setup (about 5 minutes)

1. Create a new Google Sheet (e.g. "BoxScore plays").
2. **Extensions → Apps Script**. Replace the contents of `Code.gs` with
   [`Code.gs`](Code.gs) from this folder and save.
3. **Project Settings → Script properties → Add property**:
   `PASSCODE` = something only Travis knows. Anyone can view plays; only
   someone with the passcode can log or delete them.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   Authorize when asked, then copy the web app URL (ends in `/exec`).
5. In the project root create `.env.local`:
   ```
   VITE_PLAYS_URL=https://script.google.com/macros/s/…/exec
   ```
   and restart the dev server.

The `Plays` tab and its header row are created on first use. Columns:
`id, date, bggId, game, players, winners, notes, loggedAt`. Players and
winners are comma-separated names, so the sheet can also be edited by hand.

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New
version** so the same URL picks up the change.
