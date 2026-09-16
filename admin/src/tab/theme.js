/**
 * Theme detection for the admin sidebar tab.
 *
 * ioBroker Admin loads singleton tabs as `tab.html?<instance>` without any
 * theme parameter. The active theme is available in two other ways, both of
 * which are used here:
 *  - localStorage `App.themeName` / `App.theme` (written by Admin, same origin)
 *  - a `postMessage` (`'updateTheme'` or `{ type: 'updateTheme', themeName }`)
 *    that Admin sends to the tab iframe whenever the user switches the theme.
 * URL parameters (`themeType`, `react`, `theme`) are still honoured for manual
 * testing, and the OS preference is the last fallback.
 */

/* global window */

/** Admin theme names that are rendered with a dark background */
const DARK_THEMES = ['dark', 'blue', 'modernDark'];

/**
 * @returns {boolean} True if the browser prefers a dark colour scheme
 */
function prefersDark() {
	return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * @param {string} key - localStorage key
 * @returns {string | null} Stored value or null if not available
 */
function readStorage(key) {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Map an Admin theme name (or a plain theme type) to 'light' | 'dark'.
 *
 * @param {string | null | undefined} name - Theme name such as 'dark', 'modernLight', 'auto' or a theme type
 * @returns {'light' | 'dark' | null} Theme type, or null if the name is empty
 */
function themeTypeFromName(name) {
	if (!name) {
		return null;
	}
	if (name === 'light' || name === 'dark') {
		return name;
	}
	if (name === 'auto') {
		return prefersDark() ? 'dark' : 'light';
	}
	return DARK_THEMES.includes(name) ? 'dark' : 'light';
}

/**
 * Determine the theme type the tab should render with.
 *
 * @param {string | null} [explicitName] - Theme name announced by Admin (highest priority)
 * @returns {'light' | 'dark'} Theme type
 */
export function resolveThemeType(explicitName) {
	const params = new URLSearchParams(window.location.search);
	return (
		themeTypeFromName(explicitName) ||
		themeTypeFromName(params.get('themeType')) ||
		themeTypeFromName(params.get('react') || params.get('theme')) ||
		themeTypeFromName(readStorage('App.themeName')) ||
		themeTypeFromName(readStorage('App.theme')) ||
		(prefersDark() ? 'dark' : 'light')
	);
}

/**
 * Subscribe to theme changes announced by Admin (postMessage), by other
 * browser tabs (storage event) or by the operating system (media query).
 *
 * @param {(themeType: 'light' | 'dark') => void} onChange - Called with the new theme type
 * @returns {() => void} Unsubscribe function
 */
export function subscribeThemeType(onChange) {
	/** @param {MessageEvent} event - Message from the Admin window */
	const onMessage = event => {
		const data = event.data;
		if (data === 'updateTheme') {
			onChange(resolveThemeType());
		} else if (data && typeof data === 'object' && data.type === 'updateTheme') {
			onChange(resolveThemeType(data.themeName));
		}
	};
	/** @param {StorageEvent} event - localStorage change from another document */
	const onStorage = event => {
		if (!event.key || event.key === 'App.themeName' || event.key === 'App.theme') {
			onChange(resolveThemeType());
		}
	};
	const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	const onMedia = () => onChange(resolveThemeType());

	window.addEventListener('message', onMessage);
	window.addEventListener('storage', onStorage);
	media?.addEventListener?.('change', onMedia);
	return () => {
		window.removeEventListener('message', onMessage);
		window.removeEventListener('storage', onStorage);
		media?.removeEventListener?.('change', onMedia);
	};
}
