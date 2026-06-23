# Older changelog entries

This file holds changelog entries moved out of `README.md`'s `## Changelog`
section once it exceeds 5 entries. See `README.md` for the current
changelog.

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
