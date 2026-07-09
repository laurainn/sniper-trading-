import { config } from './config';
import { getQuote } from './jupiter';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export interface Position {
  mint: string;
  entryPrice: number;
  entryAmount: bigint;
  currentAmount: bigint;
  openedAt: number;
  id: string;
}

export class PositionManager {
  private positions: Map<string, Position> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  addPosition(mint: string, entryPrice: number, amount: bigint): Position {
    const id = `${mint}_${Date.now()}`;
    const position: Position = {
      mint,
      entryPrice,
      entryAmount: amount,
      currentAmount: amount,
      openedAt: Date.now(),
      id,
    };

    this.positions.set(id, position);
    console.log(`[POSITION] Added position ${id}: ${(Number(amount) / 1e9).toFixed(6)} tokens at $${entryPrice}`);

    return position;
  }

  async checkPositions(
    onTakeProfit: (pos: Position, pnl: number) => void,
    onStopLoss: (pos: Position, pnl: number) => void
  ): Promise<void> {
    for (const [id, position] of this.positions.entries()) {
      try {
        // Get current price via Jupiter
        const quote = await getQuote(SOL_MINT, position.mint, BigInt(1e9), 100);

        if (!quote) continue;

        const currentPrice = parseFloat(quote.outAmount) / 1e9;
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        const pnlSol = (currentPrice - position.entryPrice) * (Number(position.currentAmount) / 1e9);

        console.log(
          `[POSITION] ${id.substring(0, 16)}... | PnL: ${pnlPercent.toFixed(2)}% (${pnlSol.toFixed(4)} SOL)`
        );

        if (pnlPercent >= config.takeProfitPct) {
          console.log(`[EXIT] TAKE PROFIT triggered on ${id}`);
          onTakeProfit(position, pnlPercent);
          this.positions.delete(id);
        } else if (pnlPercent <= -config.stopLossPct) {
          console.log(`[EXIT] STOP LOSS triggered on ${id}`);
          onStopLoss(position, pnlPercent);
          this.positions.delete(id);
        }
      } catch (e) {
        console.error(`[POSITION] Error checking ${id}: ${e}`);
      }
    }
  }

  startPeriodicCheck(
    onTakeProfit: (pos: Position, pnl: number) => void,
    onStopLoss: (pos: Position, pnl: number) => void
  ): void {
    if (this.checkInterval) clearInterval(this.checkInterval);

    this.checkInterval = setInterval(
      () => this.checkPositions(onTakeProfit, onStopLoss),
      config.positionCheckIntervalMs
    );

    console.log(`[POSITION] Periodic check started every ${config.positionCheckIntervalMs}ms`);
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getPositionCount(): number {
    return this.positions.size;
  }
}
