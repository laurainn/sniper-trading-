import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // RPC
  rpcHttpUrl: process.env.RPC_HTTP_URL || '',
  rpcWsUrl: process.env.RPC_WS_URL || '',

  // Wallet
  privateKey: process.env.PRIVATE_KEY || '',

  // Jupiter
  jupiterApiKey: process.env.JUPITER_API_KEY || '',

  // Trading
  buyAmountSol: parseFloat(process.env.BUY_AMOUNT_SOL || '0.05'),
  maxSlippageBps: parseInt(process.env.MAX_SLIPPAGE_BPS || '500'),
  maxPriceImpactPct: parseFloat(process.env.MAX_PRICE_IMPACT_PCT || '15'),
  takeProfitPct: parseFloat(process.env.TAKE_PROFIT_PCT || '50'),
  stopLossPct: parseFloat(process.env.STOP_LOSS_PCT || '25'),
  positionCheckIntervalMs: parseInt(process.env.POSITION_CHECK_INTERVAL_MS || '5000'),
  maxConcurrentPositions: parseInt(process.env.MAX_CONCURRENT_POSITIONS || '3'),
  dailyLossLimitSol: parseFloat(process.env.DAILY_LOSS_LIMIT_SOL || '0.5'),

  // Mode
  dryRun: process.env.DRY_RUN !== 'false',
};

export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.rpcHttpUrl) errors.push('RPC_HTTP_URL is required');
  if (!config.rpcWsUrl) errors.push('RPC_WS_URL is required');
  if (!config.privateKey) errors.push('PRIVATE_KEY is required');

  return errors;
}
