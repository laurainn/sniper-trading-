import { Keypair } from '@solana/web3.js';
import { keypairToBase58 } from '../src/wallet';

const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toBase58();
const privateKey = keypairToBase58(keypair);

console.log('=== NEW BURNER WALLET ===');
console.log(`\nPublic Key (deposit SOL here):\n${publicKey}`);
console.log(`\nPrivate Key (BASE58 - keep secret!):\n${privateKey}`);
console.log('\nAdd this to your .env file:');
console.log(`PRIVATE_KEY=${privateKey}`);
