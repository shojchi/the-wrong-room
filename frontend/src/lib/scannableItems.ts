// COCO Dataset labels that we want the game to respond to.
// We explicitly exclude 'person' to avoid players scanning themselves,
// and other irrelevant objects to ensure thematic game artifacts.

const SCANNABLE_LABELS = new Set([
  "cell phone",
  "clock",
  "apple",
  "cup",
  "bowl",
  "banana",
  "pizza",
  "laptop",
  "keyboard",
  "bottle",
]);

export function isScannableItem(label: string): boolean {
  return SCANNABLE_LABELS.has(label.toLowerCase());
}
