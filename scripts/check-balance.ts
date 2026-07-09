import { config, validateConfig } from '../src/config';
import { testConnection, getConnection } from '../src/connection';
import { loadKeypair } from '../src/wallet';

async function checkBalance(): Promise<void> {
  const errors = validateConfig();
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  await testConnection();

  const keypair = loadKeypair(config.privateKey);
  const conn = getConnection();

  const balance = await conn.getBalance(keypair.publicKey);
  const balanceSol = balance / 1e9;

  console.log('\n=== WALLET INFO ===');
  console.log(`Address: ${keypair.publicKey.toBase58()}`);
  console.log(`Balance: ${balanceSol.toFixed(4)} SOL`);
  console.log(`\nConfiguration:`);
  console.log(`  BUY_AMOUNT_SOL: ${config.buyAmountSol}`);
  console.log(`  MAX_CONCURRENT_POSITIONS: ${config.maxConcurrentPositions}`);
  console.log(`  Estimated capacity: ~${(balanceSol / config.buyAmountSol).toFixed(0)} trades`);
  console.log(`  DRY_RUN: ${config.dryRun}`);
}

checkBalance().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
