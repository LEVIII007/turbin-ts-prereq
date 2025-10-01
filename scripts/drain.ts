import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  compileTransaction,
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
  type TransactionMessageBytesBase64,
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";
import wallet from "../wallet.json";

(async () => {
  const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

  const turbin3Wallet = address("ApUfnJByzG3oddQVx28JEACtPekof5Lq8Z2LwKYMLWem");

  const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
  const rpcSubscriptions = createSolanaRpcSubscriptions(
    devnet("wss://api.devnet.solana.com")
  );

  const { value: balance } = await rpc.getBalance(keypair.address).send();
  console.log(`💰 Balance: ${balance} lamports`);

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const dummyInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(0n),
  });

  const dummyTx = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([dummyInstruction], tx)
  );

  const compiledDummy = compileTransaction(dummyTx);
  const dummyMessageBase64 = Buffer.from(compiledDummy.messageBytes).toString(
    "base64"
  ) as TransactionMessageBytesBase64;

  const { value: fee } =
    (await rpc.getFeeForMessage(dummyMessageBase64).send()) || 0n;

  if (fee === null) throw new Error("Unable to calculate transaction fee");
  if (balance < fee)
    throw new Error(`Insufficient balance: ${balance}, Fee: ${fee}`);

  const sendAmount = balance - fee;
  console.log(`🔄 Draining ${sendAmount} lamports (after fee)`);

  const transferInstruction = getTransferSolInstruction({
    source: keypair,
    destination: turbin3Wallet,
    amount: lamports(sendAmount),
  });

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
      `Success! Drained wallet. TX: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
  } catch (e) {
    console.error("❌ Drain failed:", e);
  }
})();
