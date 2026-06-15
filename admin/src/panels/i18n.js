import en from '../i18n/en.json';
import de from '../i18n/de.json';
import ru from '../i18n/ru.json';
import pt from '../i18n/pt.json';
import nl from '../i18n/nl.json';
import fr from '../i18n/fr.json';
import it from '../i18n/it.json';
import es from '../i18n/es.json';
import pl from '../i18n/pl.json';
import uk from '../i18n/uk.json';
import zhCn from '../i18n/zh-cn.json';

const TRANSLATIONS = { en, de, ru, pt, nl, fr, it, es, pl, uk, 'zh-cn': zhCn };

/**
 * Returns a translation function for the given language.
 *
 * @param {string} lang - BCP-47 language tag, e.g. "de" or "zh-cn"
 * @returns {function(string): string}
 */
export function createT(lang) {
	const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
	return (key) => dict[key] || TRANSLATIONS['en'][key] || key;
}
