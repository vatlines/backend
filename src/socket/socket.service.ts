import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { Position } from 'src/configuration/entities/position.entity';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private configuration: Position[] = [];

  constructor(private readonly configurationService: ConfigurationService) {
    this.fetchConfiguration();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async fetchConfiguration() {
    try {
      const all = await this.configurationService.findAppPositions();
      this.configuration = all;
      this.logger.debug(`Refreshed cached configuration`);
    } catch (err) {
      this.logger.error(`Error fetching configuration: ${err}`);
    }
  }

  // getConfiguration(): Facility[] {
  //   return this.configuration;
  // }

  getPositions() {
    return this.configuration;
  }
}
