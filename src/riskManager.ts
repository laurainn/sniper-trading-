import { config } from './config';

export interface RiskState {
  openPositions: number;
  realizedLossToday: number;
  dayStartTime: number;
}

export class RiskManager {
  private state: RiskState = {
    openPositions: 0,
    realizedLossToday: 0,
    dayStartTime: this.getTodayStartMs(),
  };

  private getTodayStartMs(): number {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now.getTime();
  }

  canOpenPosition(): boolean {
    // Check if it's a new day
    if (Date.now() - this.state.dayStartTime > 24 * 60 * 60 * 1000) {
      this.state.realizedLossToday = 0;
      this.state.dayStartTime = this.getTodayStartMs();
      console.log('[RISK] Daily loss counter reset');
    }

    const maxExceeded = this.state.openPositions >= config.maxConcurrentPositions;
    const lossExceeded = this.state.realizedLossToday >= config.dailyLossLimitSol;

    if (maxExceeded) {
      console.warn(
        `[RISK] Max concurrent positions (${config.maxConcurrentPositions}) reached`
      );
    }

    if (lossExceeded) {
      console.warn(
        `[RISK] Daily loss limit (${config.dailyLossLimitSol} SOL) hit. No more trades today.`
      );
    }

    return !maxExceeded && !lossExceeded;
  }

  recordOpenPosition(): void {
    this.state.openPositions++;
  }

  recordClosePosition(): void {
    if (this.state.openPositions > 0) {
      this.state.openPositions--;
    }
  }

  recordRealizedLoss(lossSol: number): void {
    if (lossSol > 0) {
      this.state.realizedLossToday += lossSol;
      console.log(
        `[RISK] Recorded loss: ${lossSol.toFixed(4)} SOL. Total today: ${this.state.realizedLossToday.toFixed(4)} SOL`
      );
    }
  }

  getState(): RiskState {
    return { ...this.state };
  }
}
