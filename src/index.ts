import { config, validateConfig } from './config';
import { testConnection } from './connection';
import { loadKeypair } from './wallet';
import { startPumpMonitor } from './pumpMonitor';
import { PositionManager } from './positionManager';
import { RiskManager } from './riskManager';
import { runSafetyChecks } from './safety';
import { getQuote } from './jupiter';
import fs from 'fs';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Setup logging
const logDir = './logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const appLog = fs.createWriteStream(`${logDir}/app.log`, { flags: 'a' });
const tradesLog = fs.createWriteStream(`${logDir}/trades.log`, { flags: 'a' });

function log(message: string): void {
  console.log(message);
  appLog.write(`[${new Date().toISOString()}] ${message}\n`);
}

function logTrade(message: string): void {
  console.log(message);
  tradesLog.write(`[${new Date().toISOString()}] ${message}\n`);
}

async function main(): Promise<void> {
  log('========== SOLANA SNIPE BOT STARTING ==========');
  log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);

  // Validate config
  const errors = validateConfig();
  if (errors.length > 0) {
    log('Configuration errors:');
    errors.forEach((e) => log(`  ✗ ${e}`));
    process.exit(1);
  }

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    log('Failed to connect to Solana RPC');
    process.exit(1);
  }

  // Load wallet
  let keypair;
  try {
    keypair = loadKeypair(config.privateKey);
    log(`Wallet: ${keypair.publicKey.toBase58()}`);
  } catch (e) {
    log(`Failed to load wallet: ${e}`);
    process.exit(1);
  }

  // Initialize managers
  const positionManager = new PositionManager();
  const riskManager = new RiskManager();

  log('Starting pump.fun monitor...');

  await startPumpMonitor(async (event) => {
    logTrade(`NEW TOKEN: ${event.symbol} (${event.mint})`);

    // Check risk limits
    if (!riskManager.canOpenPosition()) {
      logTrade(`  ✗ Skipped (risk limits)`);
      return;
    }

    // Run safety checks
    const safety = await runSafetyChecks(event.mint, 1.0);
    if (!safety.passed) {
      logTrade(`  ✗ Safety checks failed:`);
      safety.reasons.forEach((r) => logTrade(`    - ${r}`));
      return;
    }

    logTrade(`  ✓ Safety checks passed`);

    // Get entry quote
    const buyAmount = BigInt(config.buyAmountSol * 1e9);
    const buyQuote = await getQuote(SOL_MINT, event.mint, buyAmount, config.maxSlippageBps);

    if (!buyQuote) {
      logTrade(`  ✗ Failed to get buy quote`);
      return;
    }

    const outAmount = BigInt(buyQuote.outAmount);
    const pricePerToken = config.buyAmountSol / (Number(outAmount) / 1e9);

    if (config.dryRun) {
      logTrade(`  [DRY] Would buy ${(Number(outAmount) / 1e9).toFixed(6)} tokens at ~$${pricePerToken.toFixed(8)}`);
      riskManager.recordOpenPosition();
      positionManager.addPosition(event.mint, pricePerToken, outAmount);
    } else {
      logTrade(`  [LIVE] BUY: ${(Number(outAmount) / 1e9).toFixed(6)} tokens at ~$${pricePerToken.toFixed(8)}`);
      riskManager.recordOpenPosition();
      positionManager.addPosition(event.mint, pricePerToken, outAmount);
    }
  });

  // Setup position monitor
  positionManager.startPeriodicCheck(
    (pos, pnl) => {
      logTrade(`TAKE PROFIT: ${pos.mint} | PnL: +${pnl.toFixed(2)}%`);
      riskManager.recordClosePosition();
    },
    (pos, pnl) => {
      logTrade(`STOP LOSS: ${pos.mint} | PnL: ${pnl.toFixed(2)}%`);
      riskManager.recordClosePosition();
      riskManager.recordRealizedLoss(-pnl * config.buyAmountSol / 100);
    }
  );

  // Status logging
  setInterval(() => {
    const openPos = positionManager.getOpenPositions();
    const riskState = riskManager.getState();
    log(
      `[STATUS] Positions: ${openPos.length}/${config.maxConcurrentPositions} | Daily Loss: ${riskState.realizedLossToday.toFixed(4)} SOL`
    );
  }, 30000);

  log('========== BOT READY ==========');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
