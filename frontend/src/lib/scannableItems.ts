// COCO Dataset labels that we want the game to respond to.
// We explicitly exclude 'person' to avoid players scanning themselves,
// and other irrelevant objects to ensure thematic game artifacts.

export const SCANNABLE_LABELS = [
  { label: "cell phone", icon: "📱" },
  { label: "clock", icon: "⏰" },
  { label: "apple", icon: "🍎" },
  { label: "cup", icon: "☕" },
  { label: "bowl", icon: "🥣" },
  { label: "banana", icon: "🍌" },
  { label: "pizza", icon: "🍕" },
  { label: "laptop", icon: "💻" },
  { label: "keyboard", icon: "⌨️" },
  { label: "bottle", icon: "🍶" },
];

const SCANNABLE_SET = new Set(SCANNABLE_LABELS.map(item => item.label));

export function isScannableItem(label: string): boolean {
  return SCANNABLE_SET.has(label.toLowerCase());
}
