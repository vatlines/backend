import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VatsimDataService {
  private readonly logger = new Logger(VatsimDataService.name);
  private vatsimData: VatsimData = new VatsimData();

  constructor(private readonly httpService: HttpService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  private async downloadData() {
    try {
      const data = (
        await firstValueFrom(
          this.httpService.get(
            `https://data.vatsim.net/v3/vatsim-data.json?t=${Date.now()}`,
          ),
        )
      ).data;

      this.vatsimData = data as VatsimData;
    } catch (err) {
      this.logger.error(`Error downloading Vatsim data: ${err}`);
      this.vatsimData = new VatsimData();
    }
  }

  getVatsimData(): VatsimData {
    return this.vatsimData;
  }

  isControllerActive(cid: number): Controller | undefined {
    return this.vatsimData.controllers.find(
      (c) => c.cid === cid && c.frequency !== '199.998',
    );
  }
}

class VatsimData {
  controllers: Controller[];

  constructor() {
    this.controllers = [];
  }
}

type Controller = {
  cid: number;
  name: string;
  callsign: string;
  frequency: string;
  facility: number;
  rating: number;
  server: string;
  visual_range: number;
  text_atis: string[];
  last_updated: Date;
  logon_time: Date;
};
