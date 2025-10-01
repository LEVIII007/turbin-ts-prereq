# Turbin Project Files

## Main Files

- **initialize_pda.ts** - Initializes a Program Derived Address (PDA) for the Turbin program with user's GitHub handle
- **submit.ts** - Submits a TypeScript solution by creating an NFT mint and linking it to the user's account

## Scripts

- **airdrop.ts** - Requests 2 SOL airdrop from devnet faucet to the configured wallet
- **transfer.ts** - Transfers 1 SOL from the configured wallet to the Turbin3 wallet address
- **keygen.ts** - Generates a new Solana keypair and outputs the wallet address and private key bytes
- **drain.ts** - Transfers all available SOL (minus transaction fees) from the configured wallet to Turbin3
- **connect-wallet.ts** - Loads wallet from JSON file and converts it to Base58 format for Phantom wallet
- **generate-client.ts** - Generates TypeScript client code from the Anchor IDL for the Turbin program
