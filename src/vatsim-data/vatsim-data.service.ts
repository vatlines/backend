import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VatsimDataService {
  private readonly logger = new Logger(VatsimDataService.name);
  private vatsimData: VatsimData = new VatsimData();

  constructor(private readonly httpService: HttpService) {
    this.downloadData();
  }

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
      this.logger.debug(`Vatsim data download completed.`);
      const tmp = new VatsimData();
      tmp.controllers = [
        {
          cid: 1369362,

          name: 'Ryan',

          callsign: 'ORD_S_TWR',

          frequency: '120.750',

          facility: 4,

          rating: 8,

          server: 'VIRTUALNAS',

          visual_range: 50,

          text_atis: null,

          last_updated: '2024-04-27T23:54:11.8506514Z',

          logon_time: '2024-04-27T23:53:10.3574456Z',
        },
        {
          cid: 1320703,

          name: 'bRiAN',

          callsign: 'ORD_I_GND',

          frequency: '120.750',

          facility: 4,

          rating: 8,

          server: 'VIRTUALNAS',

          visual_range: 50,

          text_atis: null,

          last_updated: '2024-04-27T23:54:11.8506514Z',

          logon_time: '2024-04-27T23:53:10.3574456Z',
        },
      ];
      this.vatsimData = tmp;
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
      (c) => Number(c.cid) === Number(cid) && c.frequency !== '199.998',
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
  text_atis: string[] | null;
  last_updated: string;
  logon_time: string;
};
