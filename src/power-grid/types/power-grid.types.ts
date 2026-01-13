export type NodeType =
  | 'SUBSTATION'
  | 'TRANSFORMER'
  | 'DISTRIBUTION_POINT'
  | 'LOAD';

export type LineStatus = 'ACTIVE' | 'INACTIVE' | 'FAULT';
export type NodeStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED';

export interface PowerNode {
  id: string;
  name: string;
  code: string;
  type: NodeType;
  voltage: number; // kV
  capacity: number; // MW
  latitude: number;
  longitude: number;
  status: NodeStatus;
  currentLoad: number; // MW - sẽ được update động
  powerFactor: number; // 0.8 - 1.0
  // Dynamic values (updated during simulation)
  currentVoltage?: number; // V
  currentCurrent?: number; // A
  currentPower?: number; // MW
}

export interface PowerLine {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  length: number; // km
  voltage: number; // kV
  capacity: number; // MW
  resistance: number; // Ohm/km
  reactance: number; // Ohm/km
  status: LineStatus;
  // Dynamic values (updated during simulation)
  currentFlow?: number; // MW
  powerLoss?: number; // MW
  voltageDrop?: number; // V
}

export interface PowerGrid {
  id: string;
  name: string;
  code: string;
  region: string;
  nodes: PowerNode[];
  lines: PowerLine[];
  totalCapacity: number; // MW
  currentLoad: number; // MW
  frequency: number; // Hz (50 hoặc 60)
  systemVoltage: number; // V
}

