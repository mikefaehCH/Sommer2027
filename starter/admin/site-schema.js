// Versioned, deliberately limited configuration for the local starter wizard.
export const CATEGORIES = Object.freeze(['city', 'walking']);
import { MODULES, SLUG } from '../modules/config.js';
export { MODULES };
const HEX = /^#[0-9a-fA-F]{6}$/;
export function validateSite(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Konfiguration fehlt');
  const { version, category, id, title, description, color, modules, start, end } = input;
  if (version !== 1 || !CATEGORIES.includes(category))
    throw Error('Unbekannte Schema-Version oder Kategorie');
  if (typeof id !== 'string' || id.length > 64 || !SLUG.test(id))
    throw Error('Ungültige Projekt-ID');
  if (typeof title !== 'string' || !title.trim() || title.length > 100)
    throw Error('Ungültiger Titel');
  if (typeof description !== 'string' || !description.trim() || description.length > 500)
    throw Error('Ungültige Beschreibung');
  if (typeof color !== 'string' || !HEX.test(color)) throw Error('Ungültige Akzentfarbe');
  if (!modules || typeof modules !== 'object' || Array.isArray(modules))
    throw Error('Module fehlen');
  const allowed = MODULES;
  if (
    Object.keys(modules).some((key) => !allowed.includes(key)) ||
    allowed.some((key) => typeof modules[key] !== 'boolean')
  )
    throw Error('Ungültige Module');
  if (modules.map && !modules.places) throw Error('Karte benötigt Orte');
  if (modules.planning && !modules.places) throw Error('Planung benötigt Orte');
  {
    for (const value of [start, end]) {
      if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value
      )
        throw Error('Ungültiges Datum');
    }
    if (start > end || (Date.parse(end) - Date.parse(start)) / 86400000 > 366)
      throw Error('Ungültiger Zeitraum');
  }
  const fields = [
    'start',
    'end',
    'version',
    'category',
    'id',
    'title',
    'description',
    'color',
    'modules',
  ];
  if (Object.keys(input).some((key) => !fields.includes(key)))
    throw Error('Unbekannte Konfigurationsfelder');
  return Object.freeze({
    start,
    end,
    version: 1,
    category,
    id,
    title: title.trim(),
    description: description.trim(),
    color: color.toLowerCase(),
    modules: Object.freeze(Object.fromEntries(allowed.map((key) => [key, modules[key]]))),
  });
}
export function makeSite({
  category = 'city',
  id = 'meine-website',
  title = 'Meine Website',
  description = 'Meine neue Website',
  color = '#965a3e',
  modules = {},
  start,
  end,
} = {}) {
  return validateSite({
    ...(start === undefined && end === undefined ? {} : { start, end }),
    version: 1,
    category,
    id,
    title,
    description,
    color,
    modules: { ...Object.fromEntries(MODULES.map((key) => [key, true])), ...modules },
  });
}
