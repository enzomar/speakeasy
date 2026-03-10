import manifest from "./arasaac-pictograms.json";

export const ARASAAC_PICTOGRAMS = manifest;

export const ARASAAC_ATTRIBUTION =
  "Pictograms author: Sergio Palao. Source: ARASAAC (Government of Aragón). License: CC BY-NC-SA 4.0.";

export function getArasaacPictogram(itemOrId) {
  const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
  if (!id) return null;
  return ARASAAC_PICTOGRAMS[id] ?? null;
}

export function getArasaacPictogramUrl(itemOrId) {
  return getArasaacPictogram(itemOrId)?.localPath ?? null;
}

export function getArasaacPictogramDescription(itemOrId) {
  const pictogram = getArasaacPictogram(itemOrId);
  if (!pictogram) return null;
  return pictogram.description || pictogram.keywordMeanings?.find(Boolean) || null;
}
