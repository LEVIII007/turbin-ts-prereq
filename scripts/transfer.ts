import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";
import wallet from "../wallet.json";

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

(async () => {
  const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

  const turbin3Wallet = address("ApUfnJByzG3oddQVx28JEACtPekof5Lq8Z2LwKYMLWem");

  const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
  const rpcSubscriptions = createSolanaRpcSubscriptions(
    devnet("wss://api.devnet.solana.com")
  );

  const transferInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(1n * LAMPORTS_PER_SOL),
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
  );

  const signedTransaction =
    await signTransactionMessageWithSigners(transactionMessage);
  assertIsTransactionWithinSizeLimit(signedTransaction);

  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  try {
    await sendAndConfirmTransaction(signedTransaction, {
      commitment: "confirmed",
    });
    const signature = getSignatureFromTransaction(signedTransaction);
    console.log(
      `Success! TX: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
  } catch (e) {
    console.error("❌ Transfer failed:", e);
  }
})();
