import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { PowerDataMessage, StatusMessage, CommandMessage } from './types/mqtt.types';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;
  private isConnected = false;

  // Message handlers
  private powerDataHandlers: Array<(data: PowerDataMessage) => Promise<void>> = [];
  private statusHandlers: Array<(data: StatusMessage) => Promise<void>> = [];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    this.subscribeToTopics();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const broker = this.configService.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
    const username = this.configService.get<string>('MQTT_BROKER_USERNAME') || 'backend';
    const password = this.configService.get<string>('MQTT_BROKER_PASSWORD') || 'backend123';
    const clientId = this.configService.get<string>('MQTT_CLIENT_ID') || 'backend-main-system';

    const options: mqtt.IClientOptions = {
      clientId,
      username,
      password,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      will: {
        topic: 'power-grid/backend/status',
        payload: JSON.stringify({ status: 'OFFLINE', timestamp: new Date().toISOString() }),
        qos: 1,
        retain: true,
      },
    };

    try {
      this.client = mqtt.connect(broker, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to MQTT broker: ${broker}`);
        this.publishStatus('ONLINE');
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT error: ${error.message}`, error.stack);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.logger.log('Reconnecting to MQTT broker...');
      });

      this.client.on('offline', () => {
        this.logger.warn('MQTT client is offline');
        this.isConnected = false;
      });
    } catch (error: any) {
      this.logger.error(`Failed to connect to MQTT broker: ${error.message}`, error.stack);
    }
  }

  private subscribeToTopics(): void {
    if (!this.client) return;

    // Subscribe to power data from all systems
    this.client.subscribe('power-grid/+/data', { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to power-grid/+/data: ${err.message}`);
      } else {
        this.logger.log('Subscribed to power-grid/+/data');
      }
    });

    // Subscribe to status updates
    this.client.subscribe('power-grid/+/status', { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to power-grid/+/status: ${err.message}`);
      } else {
        this.logger.log('Subscribed to power-grid/+/status');
      }
    });

    // Subscribe to heartbeat
    this.client.subscribe('power-grid/+/heartbeat', { qos: 0 }, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to power-grid/+/heartbeat: ${err.message}`);
      } else {
        this.logger.log('Subscribed to power-grid/+/heartbeat');
      }
    });

    // Handle incoming messages
    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const data = JSON.parse(message.toString());

      if (topic.endsWith('/data')) {
        await this.handlePowerData(data as PowerDataMessage);
      } else if (topic.endsWith('/status')) {
        await this.handleStatus(data as StatusMessage);
      } else if (topic.endsWith('/heartbeat')) {
        // Heartbeat - just log
        this.logger.debug(`Heartbeat from ${topic}`);
      }
    } catch (error: any) {
      this.logger.error(`Error handling message from ${topic}: ${error.message}`, error.stack);
    }
  }

  private async handlePowerData(data: PowerDataMessage): Promise<void> {
    this.logger.debug(`Received power data from ${data.systemId} at ${data.timestamp}`);

    // Call all registered handlers
    for (const handler of this.powerDataHandlers) {
      try {
        await handler(data);
      } catch (error: any) {
        this.logger.error(`Error in power data handler: ${error.message}`, error.stack);
      }
    }
  }

  private async handleStatus(data: StatusMessage): Promise<void> {
    this.logger.log(`Status update from ${data.systemId}: ${data.status}`);

    // Call all registered handlers
    for (const handler of this.statusHandlers) {
      try {
        await handler(data);
      } catch (error: any) {
        this.logger.error(`Error in status handler: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Register handler for power data messages
   */
  onPowerData(handler: (data: PowerDataMessage) => Promise<void>): void {
    this.powerDataHandlers.push(handler);
  }

  /**
   * Register handler for status messages
   */
  onStatus(handler: (data: StatusMessage) => Promise<void>): void {
    this.statusHandlers.push(handler);
  }

  /**
   * Publish command to a system
   */
  publishCommand(systemId: string, command: CommandMessage): void {
    if (!this.client || !this.isConnected) {
      this.logger.warn('MQTT client not connected, cannot publish command');
      return;
    }

    const topic = `power-grid/${systemId}/commands`;
    const payload = JSON.stringify(command);

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Failed to publish command to ${topic}: ${error.message}`);
      } else {
        this.logger.log(`Published command to ${topic}: ${command.command}`);
      }
    });
  }

  /**
   * Publish status
   */
  private publishStatus(status: 'ONLINE' | 'OFFLINE'): void {
    if (!this.client || !this.isConnected) return;

    const topic = 'power-grid/backend/status';
    const payload: StatusMessage = {
      systemId: 'backend',
      status,
      timestamp: new Date().toISOString(),
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: true }, (error) => {
      if (error) {
        this.logger.error(`Failed to publish status: ${error.message}`);
      }
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      this.publishStatus('OFFLINE');
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.logger.log('Disconnected from MQTT broker');
    }
  }
}

