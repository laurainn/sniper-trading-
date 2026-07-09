import { config } from './config';

const JUPITER_API_BASE = 'https://api.jup.ag/swap/v1';
const LITE_API_BASE = 'https://lite-api.jup.ag';

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpactPct: string;
  marketInfos: any[];
  routePlan: any[];
}

interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  inAmount: bigint,
  slippageBps: number
): Promise<QuoteResponse | null> {
  try {
    const apiBase = config.jupiterApiKey ? JUPITER_API_BASE : LITE_API_BASE;
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: inAmount.toString(),
      slippageBps: slippageBps.toString(),
    });

    if (config.jupiterApiKey) {
      params.append('apiKey', config.jupiterApiKey);
    }

    const url = `${apiBase}/quote?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Quote request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error(`Failed to get quote: ${e}`);
    return null;
  }
}

export async function getSwap(
  quoteResponse: QuoteResponse,
  userPublicKey: string,
  wrapUnwrapSol: boolean = true
): Promise<SwapResponse | null> {
  try {
    const apiBase = config.jupiterApiKey ? JUPITER_API_BASE : LITE_API_BASE;
    const url = `${apiBase}/swap`;

    const body = {
      quoteResponse,
      userPublicKey,
      wrapUnwrapSol,
    };

    if (config.jupiterApiKey) {
      body['apiKey'] = config.jupiterApiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`Swap request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error(`Failed to get swap: ${e}`);
    return null;
  }
}
