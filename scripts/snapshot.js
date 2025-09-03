// node >= 18
import fs from 'fs/promises';

const BASE = 'https://api.sleeper.app/v1';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function flattenRostered(rosters) {
  const set = new Set();
  for (const r of rosters || []) {
    for (const k of ['players','reserve','taxi']) {
      const arr = r?.[k];
      if (Array.isArray(arr)) arr.forEach(id => set.add(id));
    }
  }
  return [...set];
}

const cfg = JSON.parse(await fs.readFile('./leagues.json', 'utf8'));
const leaguesOut = [];

for (const row of cfg.leagues) {
  const league_id = String(row.league_id);
  const league_name = row.league_name || '';

  const meta = await fetchJson(`${BASE}/league/${league_id}`);
  const rosters = await fetchJson(`${BASE}/league/${league_id}/rosters`);

  leaguesOut.push({
    league_name: league_name || meta?.name || '',
    league_id,
    settings: {
      scoring_settings: meta?.scoring_settings || {},
      roster_positions: meta?.roster_positions || [],
      settings: meta?.settings || {},
      draft_settings: meta?.draft_settings || {}
    },
    waiver_type: meta?.settings?.waiver_type ?? null,
    faab_budget: meta?.settings?.waiver_budget ?? null,
    num_teams: meta?.total_rosters ?? null,
    rostered_player_ids: flattenRostered(rosters)
  });
}

await fs.mkdir('public', { recursive: true });
await fs.writeFile(
  './public/ffww_snapshot.json',
  JSON.stringify({ updated_at: new Date().toISOString(), leagues: leaguesOut }, null, 2)
);
console.log('Wrote public/ffww_snapshot.json');
