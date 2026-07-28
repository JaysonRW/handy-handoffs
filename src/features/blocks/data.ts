export interface Flat {
  id: string;
  label: string;
}
export interface Block {
  id: string;
  name: string;
  description: string;
  flats: Flat[];
}

const flatList = (blockId: string, labels: string[]): Flat[] =>
  labels.map((label) => ({ id: `${blockId}-${label}`, label }));

export const BLOCKS: Block[] = [
  {
    id: "falcon",
    name: "Falcon",
    description: "12 flats",
    flats: flatList("falcon", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]),
  },
  {
    id: "martlett",
    name: "Martlett",
    description: "15 flats (no 14)",
    flats: flatList("martlett", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "15", "16"]),
  },
  {
    id: "merlin",
    name: "Merlin",
    description: "11 flats",
    flats: flatList("merlin", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]),
  },
  {
    id: "oak",
    name: "Oak Lodge",
    description: "13 flats (no 13)",
    flats: flatList("oak", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14"]),
  },
  {
    id: "northwood",
    name: "Northwood",
    description: "13 flats (Flat 1 = 1 & 1A)",
    flats: flatList("northwood", ["1", "1A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]),
  },
];

export const getBlock = (id: string) => BLOCKS.find((b) => b.id === id);
export const getFlat = (blockId: string, flatId: string) =>
  getBlock(blockId)?.flats.find((f) => f.id === flatId);

export function getFlatLabel(blockId: string, flatId: string): string {
  const found = getFlat(blockId, flatId);
  if (found?.label) return found.label;
  const idx = flatId.indexOf("-");
  return idx >= 0 ? flatId.slice(idx + 1) : flatId;
}
