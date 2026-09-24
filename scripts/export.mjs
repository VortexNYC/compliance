#!/usr/bin/env node
/**
 * Exports per-product compliance status from the CompAI API into markdown
 * pages under products/. Runs on a schedule in GitHub Actions; only aggregate
 * counts are published — never finding details or evidence content.
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = (process.env.COMP_API_URL ?? 'https://api.comp.vortex.nyc').replace(/\/$/, '');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORGS = [
  { key: 'vortex', name: 'vortex', blurb: 'Payments infrastructure. PCI DSS applies because cardholder data flows through the product surface.' },
  { key: 'veil', name: 'veil', blurb: 'SOC 2 first; ISO 27001 is the next target.' },
  { key: 'seal', name: 'seal', blurb: 'E-signature / evidentiary product. SOC 2 baseline plus ESIGN/UETA evidentiary practices.' },
  { key: 'pile', name: 'pile', blurb: 'Internal tooling platform. SOC 2 baseline.' },
];

// Frameworks buyers commonly ask about — used to render the "not in scope"
// section. Absence here is honest scope, not a claim of non-compliance.
const KNOWN_SCOPE = ['SOC 2', 'SOC 3', 'ISO 27001', 'PCI DSS', 'HIPAA', 'GDPR', 'CCPA', 'eIDAS', 'FedRAMP'];

async function apiGet(key, path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-api-key': key, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
const bar = (done, total) => {
  const n = Math.round(pct(done, total) / 10);
  return '█'.repeat(n) + '░'.repeat(10 - n);
};

function render(org, frameworks, scores) {
  const p = scores.policies ?? {};
  const t = scores.tasks ?? {};
  const people = scores.people ?? {};
  const docs = scores.documents ?? {};
  const findings = Array.isArray(scores.findings) ? scores.findings : [];
  const openFindings = findings.filter(
    (f) => f.status !== 'resolved' && f.status !== 'closed',
  ).length;

  const frameworkNames = frameworks
    .map((f) => f?.framework?.name ?? f?.customFramework?.name ?? f?.name)
    .filter(Boolean);
  const notTracked = KNOWN_SCOPE.filter(
    (k) => !frameworkNames.some((n) => n.toLowerCase().includes(k.toLowerCase())),
  );

  const lines = [
    `# ${org.name} — compliance status`,
    '',
    `_${org.blurb}_`,
    '',
    `**Frameworks tracked:** ${frameworkNames.join(', ') || 'none yet'}`,
    `**Not in scope today:** ${notTracked.join(', ') || '—'}`,
    '',
    '| Area | Progress | State |',
    '|------|----------|-------|',
    `| Policies published | ${p.published ?? 0}/${p.total ?? 0} | ${bar(p.published ?? 0, p.total ?? 0)} ${pct(p.published ?? 0, p.total ?? 0)}% |`,
    `| Tasks completed | ${t.done ?? 0}/${t.total ?? 0} | ${bar(t.done ?? 0, t.total ?? 0)} ${pct(t.done ?? 0, t.total ?? 0)}% |`,
    `| Team security training | ${people.completed ?? 0}/${people.total ?? 0} | ${bar(people.completed ?? 0, people.total ?? 0)} ${pct(people.completed ?? 0, people.total ?? 0)}% |`,
    `| Documents completed | ${docs.completedDocuments ?? 0}/${docs.totalDocuments ?? 0} | ${bar(docs.completedDocuments ?? 0, docs.totalDocuments ?? 0)} ${pct(docs.completedDocuments ?? 0, docs.totalDocuments ?? 0)}% |`,
    `| Open findings | ${openFindings} | tracked internally |`,
    '',
    `> Auto-generated ${new Date().toISOString().slice(0, 10)} from live data.`,
    '> Counts reflect our internal tracking — "published policies" are written,',
    '> reviewed documents; a low number today means early, not absent.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  mkdirSync(join(ROOT, 'products'), { recursive: true });
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  for (const org of ORGS) {
    const key = process.env[`COMP_API_KEY_${org.key.toUpperCase()}`];
    if (!key) {
      console.warn(`[${org.key}] no COMP_API_KEY_${org.key.toUpperCase()} — skipping`);
      continue;
    }
    const [frameworksRes, scores] = await Promise.all([
      apiGet(key, '/v1/frameworks'),
      apiGet(key, '/v1/frameworks/scores'),
    ]);
    const frameworks = Array.isArray(frameworksRes)
      ? frameworksRes
      : (frameworksRes.data ?? []);
    writeFileSync(join(ROOT, 'products', `${org.name}.md`), render(org, frameworks, scores));
    console.log(`[${org.key}] wrote products/${org.name}.md`);
  }

  // Stamp the README footer
  const readmePath = join(ROOT, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  writeFileSync(readmePath, readme.replace(/_Last export:.*_/, `_Last export: ${stamp}_`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
