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

const makeFlats = (blockId: string, floors: number, perFloor: number): Flat[] => {
  const flats: Flat[] = [];
  for (let f = 1; f <= floors; f++) {
    for (let n = 1; n <= perFloor; n++) {
      const label = `${f}${String(n).padStart(2, "0")}`;
      flats.push({ id: `${blockId}-${label}`, label });
    }
  }
  return flats;
};

export const BLOCKS: Block[] = [
  { id: "falcon", name: "Falcon", description: "South wing · 6 floors", flats: makeFlats("falcon", 6, 4) },
  { id: "martlett", name: "Martlett", description: "Courtyard · 5 floors", flats: makeFlats("martlett", 5, 4) },
  { id: "merlin", name: "Merlin", description: "East tower · 8 floors", flats: makeFlats("merlin", 8, 3) },
  { id: "oak", name: "Oak", description: "Garden block · 4 floors", flats: makeFlats("oak", 4, 4) },
  { id: "northwood", name: "Northwood", description: "North wing · 6 floors", flats: makeFlats("northwood", 6, 4) },
];

export const getBlock = (id: string) => BLOCKS.find((b) => b.id === id);
export const getFlat = (blockId: string, flatId: string) =>
  getBlock(blockId)?.flats.find((f) => f.id === flatId);
