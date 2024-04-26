import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { Facility } from 'src/configuration/entities/facility.entity';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private configuration: Facility[] = [];

  constructor(private readonly configurationService: ConfigurationService) {
    this.fetchConfiguration();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async fetchConfiguration() {
    try {
      const all = await this.configurationService.findAllFacilities();
      this.configuration = all;
    } catch (err) {
      this.logger.error(`Error fetching configuration: ${err}`);
    }
  }

  getConfiguration(): Facility[] {
    return this.configuration;
  }

  getPositions() {
    return this.configuration
      .map((d) => d.positions)
      .filter((a) => a.length > 0)
      .flat();
  }
}
