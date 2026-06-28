# Older changelog entries

This file holds changelog entries moved out of `README.md`'s `## Changelog`
section once it exceeds 5 entries. See `README.md` for the current
changelog.

### 0.3.2 (2026-06-23)
* (ssbingo) Remove redundant "Other languages" line from README.md; disable the Sentry release-notification step in CI

### 0.3.1 (2026-06-23)
* (ssbingo) Complete the Object structure documentation (Plugs, Covers, Switches, Sensors, Thermostats) in all 11 README files; cap the changelog at 5 entries with older history moved to CHANGELOG_OLD.md

### 0.3.0 (2026-06-23)
* (ssbingo) Fix: device tabs in admin no longer trigger a false "switch host" warning — React 18 and @mui/material v6 are now shared with admin's host instead of being bundled separately (panel bundle size drops from ~411 KB to ~66 KB)
* (ssbingo) Fix: remove leftover legacy "tint" sidebar tab (admin/tab_m.html) — superseded by the jsonConfig device tabs

### 0.2.6 (2026-06-17)
* (ssbingo) Fix: pairing button replaced with a custom PairButton component — no longer relies on admin's result-mapping for encrypted fields; shows inline status ("Key received — please Save!" / error text)

### 0.2.5 (2026-06-16)
* (ssbingo) Fix: pairing button now implemented as a custom panel component — always visible regardless of adapter alive state
* (ssbingo) Fix: commit panel build bundles to git so GitHub installs work without a manual build step (empty Leuchten/Gruppen tabs resolved)

### 0.2.4 (2026-06-15)
* (ssbingo) Improve pairing UX: click button first, adapter polls deCONZ every 3 s until pairing window opens (up to 60 s) — no more time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Add automatic API key pairing: new "Request API key from deCONZ" button in the Settings tab

### 0.2.2 (2026-06-15)
* (ssbingo) Fix tab labels: "Leuchten" and "Gruppen" now shown correctly (i18n keys added to `admin/i18n/`)
* (ssbingo) Add static description text above each panel tab (always visible, even when panel fails to load)
* (ssbingo) Panel components: add sendTo timeout (10 s), alive-check, deferred mount via setTimeout, error boundary
* (ssbingo) Improve LightsTab and GroupsTab UX: status bar with dot indicator, count label, alert boxes for error/empty/offline

### 0.2.1 (2026-06-15)
* (ssbingo) Fix: panels were empty because `window.React` is not a global in admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: lights and groups overview tabs inside the adapter settings dialog
* (ssbingo) Group management: create, edit, and delete deCONZ groups from the admin UI
* (ssbingo) Drop Node 20 support; require Node.js >= 22

### 0.1.0 (2026-06-15)
* (ssbingo) Initial release: lights, groups, scenes, Tint remote with color wheel
