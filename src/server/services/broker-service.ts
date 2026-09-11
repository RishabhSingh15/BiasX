import { NormalizedTrade } from './trade-normalization';
import { generateDemoTrades } from './demo-data-generator';
import { normalizeDemoTrade } from './trade-normalization';

export interface BrokerProvider {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  sync(): Promise<NormalizedTrade[]>;
  getBalance(): Promise<number>;
  getPositions(): Promise<any[]>;
  getOrders(): Promise<any[]>;
}

export class DemoBrokerProvider implements BrokerProvider {
  async connect(): Promise<boolean> {
    return true;
  }
  async disconnect(): Promise<boolean> {
    return true;
  }
  async sync(): Promise<NormalizedTrade[]> {
    const trades = generateDemoTrades();
    return trades.map(normalizeDemoTrade);
  }
  async getBalance(): Promise<number> {
    return 10420;
  }
  async getPositions(): Promise<any[]> {
    return [];
  }
  async getOrders(): Promise<any[]> {
    return [];
  }
}

export class CSVBrokerProvider implements BrokerProvider {
  async connect(): Promise<boolean> {
    return true;
  }
  async disconnect(): Promise<boolean> {
    return true;
  }
  async sync(): Promise<NormalizedTrade[]> {
    return [];
  }
  async getBalance(): Promise<number> {
    return 0;
  }
  async getPositions(): Promise<any[]> {
    return [];
  }
  async getOrders(): Promise<any[]> {
    return [];
  }
}

export function createBrokerProvider(type: string): BrokerProvider {
  switch (type.toLowerCase()) {
    case 'demo':
      return new DemoBrokerProvider();
    case 'csv':
      return new CSVBrokerProvider();
    default:
      throw new Error(`Unsupported broker type: ${type}`);
  }
}
