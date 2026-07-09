import { PublicKey } from '@solana/web3.js';
import { getConnection } from './connection';
import { getQuote } from './jupiter';
import { config } from './config';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const LAMPORTS_PER_SOL = 1e9;

export interface SafetyCheckResult {
  passed: boolean;
  reasons: string[];
}

export async function runSafetyChecks(
  tokenMint: string,
  liquidityAmount: number
): Promise<SafetyCheckResult> {
  const reasons: string[] = [];

  // Check 1: Mint authority renounced
  const conn = getConnection();
  try {
    const mintPubkey = new PublicKey(tokenMint);
    const mintData = await conn.getParsedAccountInfo(mintPubkey);

    if (mintData?.value?.data) {
      const parsedData = mintData.value.data as any;
      const owner = parsedData?.parsed?.info?.owner;

      if (owner && owner !== '11111111111111111111111111111111') {
        reasons.push('Mint authority not renounced');
      }
    }
  } catch (e) {
    reasons.push(`Could not verify mint authority: ${e}`);
  }

  // Check 2: Liquidity check
  if (liquidityAmount < 0.1) {
    reasons.push('Insufficient liquidity');
  }

  // Check 3: Honeypot check - can we actually sell?
  try {
    const buyAmount = BigInt(config.buyAmountSol * LAMPORTS_PER_SOL);
    const quote = await getQuote(SOL_MINT, tokenMint, buyAmount, config.maxSlippageBps);

    if (!quote || BigInt(quote.outAmount) === 0n) {
      reasons.push('No route to buy token (honeypot likely)');
    } else {
      // Try reverse quote
      const outAmount = BigInt(quote.outAmount);
      const reverseQuote = await getQuote(tokenMint, SOL_MINT, outAmount, config.maxSlippageBps);

      if (!reverseQuote || BigInt(reverseQuote.outAmount) === 0n) {
        reasons.push('No route to sell token back to SOL (honeypot)');
      } else {
        const priceImpact = parseFloat(quote.priceImpactPct || '0');
        if (priceImpact > config.maxPriceImpactPct) {
          reasons.push(`Price impact too high: ${priceImpact.toFixed(2)}%`);
        }
      }
    }
  } catch (e) {
    reasons.push(`Honeypot check failed: ${e}`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}
