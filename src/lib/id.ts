export const nanoid = (size = 12) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const arr = new Uint8Array(size);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < size; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < size; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
};
