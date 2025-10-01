import fs from "fs";
import {
  address,
  createSolanaRpc,
  devnet,
  createSolanaRpcSubscriptions,
  getProgramDerivedAddress,
  generateKeyPairSigner,
  getAddressEncoder,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  addSignersToTransactionMessage,
  assertIsTransactionWithinSizeLimit,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  createKeyPairSignerFromBytes,
} from "@solana/kit";

import { getSubmitTsInstruction } from "./clients/js/src/generated/index";

import { getBase64EncodedWireTransaction } from "@solana/transactions";

async function runSimulation(tx: any, rpc: any) {
  const encoded = getBase64EncodedWireTransaction(tx);
  const sim = await rpc
    .simulateTransaction(encoded, { encoding: "base64" })
    .send();
  return sim;
}

async function checkAccount(pubkey: any, rpc: any) {
  try {
    const info = await rpc.getAccountInfo(pubkey.toString()).send();
    if (!info.value) {
      return null;
    }
    return info.value;
  } catch (err) {
    return null;
  }
}

const walletBytes: number[] = JSON.parse(
  fs.readFileSync("./my-wallet.json", "utf8")
);

const keypair = await createKeyPairSignerFromBytes(new Uint8Array(walletBytes));

const PROGRAM_ADDRESS = address("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const MPL_CORE_PROGRAM = address(
  "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
);
const COLLECTION = address("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");

const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(
  devnet("wss://api.devnet.solana.com")
);

const addressEncoder = getAddressEncoder();

const [account, bump] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: [Buffer.from("prereqs"), addressEncoder.encode(keypair.address)],
});

const [authority, _bump2] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: [Buffer.from("collection"), addressEncoder.encode(COLLECTION)],
});

const mintKeyPair = await generateKeyPairSigner();

const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

await checkAccount(mintKeyPair.address, rpc);

const submitIx = getSubmitTsInstruction({
  user: keypair,
  account,
  mint: mintKeyPair,
  collection: COLLECTION,
  authority,
  mplCoreProgram: MPL_CORE_PROGRAM,
  systemProgram: SYSTEM_PROGRAM,
});

const { value: latestBlockhashSubmit } = await rpc.getLatestBlockhash().send();

const transactionMessageSubmit = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
  (tx) =>
    setTransactionMessageLifetimeUsingBlockhash(latestBlockhashSubmit, tx),
  (tx) => appendTransactionMessageInstructions([submitIx], tx),
  (tx) => addSignersToTransactionMessage([mintKeyPair], tx)
);

const signedTxSubmit = await signTransactionMessageWithSigners(
  transactionMessageSubmit
);
assertIsTransactionWithinSizeLimit(signedTxSubmit);

const simSubmit = await runSimulation(signedTxSubmit, rpc);
if (simSubmit.value.err) {
  process.exit(1);
}

try {
  await sendAndConfirmTransaction(signedTxSubmit, {
    commitment: "confirmed",
    skipPreflight: false,
  });
} catch (e) {
  process.exit(1);
}
