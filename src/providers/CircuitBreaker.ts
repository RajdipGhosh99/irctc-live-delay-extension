/**
 * Circuit Breaker Pattern for Resilient API Gateway Failover
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold = 3, cooldownMs = 180000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  public recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
  }

  public isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime < this.cooldownMs) {
        return true;
      }
      this.failures = this.threshold - 1;
    }
    return false;
  }
}
