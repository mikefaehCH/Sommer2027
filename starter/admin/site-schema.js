// Versioned, deliberately limited configuration for the local starter wizard.
export const CATEGORIES = Object.freeze(['city', 'walking']);
export const MODULES = Object.freeze(['places', 'map', 'favorites', 'planning', 'offline']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
export function validateSite(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Konfiguration fehlt');
  const { version, category, id, title, description, color, modules } = input;
  if (version !== 1 || !CATEGORIES.includes(category))
    throw Error('Unbekannte Schema-Version oder Kategorie');
  if (typeof id !== 'string' || id.length > 64 || !SLUG.test(id))
    throw Error('Ungültige Projekt-ID');
  if (typeof title !== 'string' || !title.trim() || title.length > 100)
    throw Error('Ungültiger Titel');
  if (typeof description !== 'string' || (!description.trim() || description.length > 500))
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
  const fields = ['version', 'category', 'id', 'title', 'description', 'color', 'modules'];
  if (Object.keys(input).some((key) => !fields.includes(key)))
    throw Error('Unbekannte Konfigurationsfelder');
  return Object.freeze({
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
} = {}) {
  return validateSite({
    version: 1,
    category,
    id,
    title,
    description,
    color,
    modules: {
      places: true,
      map: true,
      favorites: true,
      planning: true,
      offline: true,
      ...modules,
    },
  });
}
