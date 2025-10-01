import fs from "fs";
import bs58 from "bs58";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WALLET_PATH = path.join(__dirname, "my-wallet.json");

try {
  const raw = fs.readFileSync(WALLET_PATH, "utf-8");
  const walletBytes: number[] = JSON.parse(raw);
  const walletUint8 = Uint8Array.from(walletBytes);

  console.log("Wallet bytes loaded from wallet.json:", walletUint8);
  const base58Key = bs58.encode(walletUint8);
  console.log("Base58 private key (Phantom format):", base58Key);

  const decodedBytes = bs58.decode(base58Key);
  console.log("Decoded back to bytes:", decodedBytes);
} catch (error) {
  if (error instanceof Error) {
    console.error("Error reading wallet file:", error.message);
  } else {
    console.error("An unknown error occurred");
  }
  process.exit(1);
}
