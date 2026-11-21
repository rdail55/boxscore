/**
 * BoxScore play log - Google Apps Script backend.
 * Paste into Extensions → Apps Script on the play-log Google Sheet, then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Set the passcode under Project Settings → Script properties: PASSCODE.
 */
// The play-log spreadsheet (the id from its /d/…/edit URL).
const SHEET_ID = '1LHfFhYjtxw4j3fo9lY0hMVnbCRcNk3AeQXsQ5J7Wbug'
const SHEET = 'Plays'
const HEADERS = ['id', 'date', 'bggId', 'game', 'players', 'winners', 'notes', 'loggedAt']

function sheet_() {
  const book = SpreadsheetApp.openById(SHEET_ID)
  const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET)
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS)
  return sheet
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}

function doGet() {
  // Display values, so dates come back exactly as typed in the sheet.
  const rows = sheet_().getDataRange().getDisplayValues().slice(1)
  const plays = rows
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      date: String(r[1]),
      bggId: Number(r[2]),
      game: String(r[3]),
      players: String(r[4]).split(',').map((s) => s.trim()).filter(String),
      winners: String(r[5]).split(',').map((s) => s.trim()).filter(String),
      notes: String(r[6] || ''),
    }))
  return json_({ ok: true, plays })
}

// Body is sent as text/plain JSON so browsers skip the CORS preflight.
function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  const passcode = PropertiesService.getScriptProperties().getProperty('PASSCODE')
  if (passcode && body.passcode !== passcode) return json_({ ok: false, error: 'Wrong passcode' })

  const sheet = sheet_()
  if (body.action === 'delete') {
    const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues()
    const row = ids.findIndex((r) => String(r[0]) === body.id)
    if (row > 0) sheet.deleteRow(row + 1)
    return json_({ ok: true })
  }

  const p = body.play
  const id = Utilities.getUuid()
  // Leading ' keeps the date as plain yyyy-mm-dd text instead of a Sheets date.
  sheet.appendRow([id, "'" + p.date, p.bggId, p.game, p.players.join(', '), p.winners.join(', '), p.notes || '', new Date()])
  return json_({ ok: true, id })
}
