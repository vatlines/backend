import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/api-key.guard';
import { AddOverrideDto, VatsimDataService } from './vatsim-data.service';

@Controller({
  path: 'overrides',
  version: '1',
})
@UseGuards(ApiKeyGuard)
export class VatsimDataController {
  private readonly logger = new Logger(VatsimDataController.name);
  constructor(private readonly vatsimDataService: VatsimDataService) {}
  @Get()
  async getAll() {
    return this.vatsimDataService.getOverrides();
  }

  @Post()
  async addOverride(@Body() input: AddOverrideDto) {
    return this.vatsimDataService.addOverride(input);
  }

  @Delete('/:cid')
  async deleteOverride(@Param('cid') cid: number) {
    return this.vatsimDataService.deleteOverride(cid);
  }
}
