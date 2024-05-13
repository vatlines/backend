import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VatsimDataService {
  private readonly logger = new Logger(VatsimDataService.name);
  private vatsimData: Controller[] = [];
  private overrides: Controller[] = [];

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

      this.vatsimData = (data as VatsimData).controllers;
    } catch (err) {
      this.logger.error(`Error downloading Vatsim data: ${err}`);
      this.vatsimData = [];
    } finally {
      this.vatsimData = this.vatsimData.concat(this.overrides);
    }
  }

  getVatsimData(): Controller[] {
    return this.vatsimData;
  }

  isControllerActive(cid: number): Controller | undefined {
    return this.vatsimData.find(
      (c) => Number(c.cid) === Number(cid) && c.frequency !== '199.998',
    );
  }

  async getOverrides() {
    return this.overrides;
  }

  async addOverride(input: AddOverrideDto) {
    if (this.overrides.find((o) => Number(o.cid) === Number(input.cid))) {
      throw new BadRequestException(`CID already has an override.`);
    }

    this.overrides.push({
      cid: input.cid,
      callsign: input.callsign,
      frequency: input.frequency,
    });
  }

  async deleteOverride(cid: number) {
    if (!this.overrides.find((o) => Number(o.cid) === Number(cid))) {
      throw new BadRequestException();
    }

    this.overrides = this.overrides.filter(
      (o) => Number(o.cid) !== Number(cid),
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
  callsign: string;
  frequency: string;
};

export type AddOverrideDto = {
  cid: number;
  callsign: string;
  frequency: string;
};
