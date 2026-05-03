export interface OptionContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number | null;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

export interface OptionGreeks {
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
}

export interface OptionsChain {
  underlyingPrice: number;
  expirationDate: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface OptionsExpirations {
  symbol: string;
  expirations: string[];
}
