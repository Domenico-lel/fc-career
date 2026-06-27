/**
 * Pipeline di import dataset → modello di gioco.
 *
 * Legge il CSV grezzo (EA FC 26, schema sofifa) e produce
 * `src/data/seed/serieA.json` con le 20 squadre di Serie A e le rose reali,
 * mappate sul nostro modello { id, name, role, age, overall, potential }.
 *
 * Ri-eseguibile:  node dataset/import.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, 'players_fc26.csv');
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'seed', 'serieA.json');

// Nome club nel CSV  →  metadati nel nostro gioco (ordine = ordine di display).
const TEAMS = [
  { csv: 'Inter', id: 'int', name: 'Inter', shortName: 'INT' },
  { csv: 'Napoli', id: 'nap', name: 'Napoli', shortName: 'NAP' },
  { csv: 'Juventus', id: 'juv', name: 'Juventus', shortName: 'JUV' },
  { csv: 'AC Milan', id: 'mil', name: 'Milan', shortName: 'MIL' },
  { csv: 'Atalanta', id: 'ata', name: 'Atalanta', shortName: 'ATA' },
  { csv: 'Roma', id: 'rom', name: 'Roma', shortName: 'ROM' },
  { csv: 'Lazio', id: 'laz', name: 'Lazio', shortName: 'LAZ' },
  { csv: 'Fiorentina', id: 'fio', name: 'Fiorentina', shortName: 'FIO' },
  { csv: 'Bologna', id: 'bol', name: 'Bologna', shortName: 'BOL' },
  { csv: 'Como', id: 'com', name: 'Como', shortName: 'COM' },
  { csv: 'Torino', id: 'tor', name: 'Torino', shortName: 'TOR' },
  { csv: 'Udinese', id: 'udi', name: 'Udinese', shortName: 'UDI' },
  { csv: 'Genoa', id: 'gen', name: 'Genoa', shortName: 'GEN' },
  { csv: 'Sassuolo', id: 'sas', name: 'Sassuolo', shortName: 'SAS' },
  { csv: 'Cagliari', id: 'cag', name: 'Cagliari', shortName: 'CAG' },
  { csv: 'Parma', id: 'par', name: 'Parma', shortName: 'PAR' },
  { csv: 'Lecce', id: 'lec', name: 'Lecce', shortName: 'LEC' },
  { csv: 'Hellas Verona FC', id: 'ver', name: 'Hellas Verona', shortName: 'VER' },
  { csv: 'Pisa', id: 'pis', name: 'Pisa', shortName: 'PIS' },
  { csv: 'Cremonese', id: 'cre', name: 'Cremonese', shortName: 'CRE' },
];

const CLUB_TO_TEAM = new Map(TEAMS.map((t) => [t.csv, t]));

// Mappa la posizione FIFA sul nostro ruolo a 4 reparti.
const POSITION_TO_ROLE = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT', CF: 'ATT', LF: 'ATT', RF: 'ATT',
};

function roleFromPositions(positions) {
  const first = (positions || '').split(',')[0].trim();
  return POSITION_TO_ROLE[first] ?? 'MID';
}

// Parser CSV minimale che gestisce i campi tra virgolette.
function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n') { record.push(field); rows.push(record); record = []; field = ''; }
    else if (c === '\r') { /* ignora */ }
    else field += c;
  }
  if (field.length > 0 || record.length > 0) { record.push(field); rows.push(record); }
  return rows;
}

const raw = readFileSync(CSV_PATH, 'utf-8');
const rows = parseCsv(raw);
const header = rows[0];
const col = (name) => header.indexOf(name);

const I = {
  version: col('fifa_version'),
  shortName: col('short_name'),
  positions: col('player_positions'),
  overall: col('overall'),
  potential: col('potential'),
  age: col('age'),
  value: col('value_eur'),
  league: col('league_name'),
  club: col('club_name'),
  playerId: col('player_id'),
};

// Valore di mercato: usa il dato reale, con una stima di riserva se mancante.
function marketValue(rawValue, overall) {
  const v = Number(rawValue);
  if (Number.isFinite(v) && v > 0) return v;
  return Math.max(250_000, (overall - 40) * 150_000);
}

const byTeam = new Map(TEAMS.map((t) => [t.id, []]));

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length <= I.club) continue;
  if (row[I.version] !== '26') continue;
  if (row[I.league] !== 'Serie A') continue; // esclude omonimi di altre leghe
  const team = CLUB_TO_TEAM.get(row[I.club]);
  if (!team) continue;

  const overall = Number(row[I.overall]);
  byTeam.get(team.id).push({
    id: `${team.id}-${row[I.playerId]}`,
    name: row[I.shortName],
    role: roleFromPositions(row[I.positions]),
    age: Number(row[I.age]),
    overall,
    potential: Number(row[I.potential]),
    value: marketValue(row[I.value], overall),
  });
}

const output = TEAMS.map((t) => {
  const players = byTeam.get(t.id).sort((a, b) => b.overall - a.overall);
  return { id: t.id, name: t.name, shortName: t.shortName, players };
});

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

// Report riepilogativo
console.log('Squadre esportate:', output.length);
for (const t of output) {
  const roles = t.players.reduce((m, p) => ((m[p.role] = (m[p.role] || 0) + 1), m), {});
  const top = t.players[0];
  console.log(
    `  ${t.name.padEnd(16)} ${String(t.players.length).padStart(2)} giocatori ` +
      `(GK ${roles.GK || 0} DEF ${roles.DEF || 0} MID ${roles.MID || 0} ATT ${roles.ATT || 0}) ` +
      `· top: ${top.name} ${top.overall}`,
  );
}
console.log('\nScritto:', OUT_PATH);
