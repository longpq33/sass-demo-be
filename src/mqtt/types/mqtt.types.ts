export interface MqttConfig {
  broker: string;
  clientId: string;
  username: string;
  password: string;
  port?: number;
}

export interface PowerDataMessage {
  timestamp: string;
  gridId: string;
  systemId: string;
  nodes: Array<{
    nodeId: string;
    voltage: number;
    current: number;
    power: number;
    powerFactor: number;
  }>;
  lines: Array<{
    lineId: string;
    currentFlow: number;
    powerLoss: number;
    voltageDrop: number;
  }>;
  gridMetrics: {
    totalGeneration: number;
    totalLoad: number;
    totalLoss: number;
    frequency: number;
    systemVoltage: number;
  };
}

export interface StatusMessage {
  systemId: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  timestamp: string;
  message?: string;
  metrics?: {
    uptime?: number;
    messagesSent?: number;
  };
}

export interface CommandMessage {
  command: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'UPDATE_CONFIG';
  timestamp: string;
  payload?: Record<string, unknown>;
}

