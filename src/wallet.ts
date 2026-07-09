import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function loadKeypair(privateKeyString: string): Keypair {
  try {
    const secretKey = bs58.decode(privateKeyString);
    return Keypair.fromSecretKey(secretKey);
  } catch (e) {
    throw new Error(`Failed to load keypair from private key: ${e}`);
  }
}

export function keypairToBase58(keypair: Keypair): string {
  return bs58.encode(keypair.secretKey);
}
