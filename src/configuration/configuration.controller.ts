import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConfigurationService } from './configuration.service';
import { Button } from './entities/button.entity';
import { Editor } from './entities/editor.entity';
import { Facility } from './entities/facility.entity';
import {
  PositionConfiguration,
  PositionConfigurationDto,
} from './entities/position-configuration.entity';
import { Position } from './entities/position.entity';
import {
  ButtonGuard,
  CreatePositionGuard,
  EditorGuard,
  FacilityGuard,
  PositionConfigurationGuard,
  PositionGuard,
} from './guards';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RequestIdInterceptor } from './id.interceptor';

@Controller({
  path: 'configuration',
  version: '1',
})
@UseInterceptors(RequestIdInterceptor)
export class ConfigurationController {
  private readonly logger = new Logger(ConfigurationController.name);
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get('poop')
  async poop() {
    return await this.configurationService.getButtons('1000002');
  }

  //#region Facility
  @Post('facility/seed')
  @UseGuards(ApiKeyGuard)
  async seedFacilities() {
    return await this.configurationService.seedData();
  }

  @Get('facility')
  @UseGuards(AuthGuard)
  async getAllFacilities(@Req() request: RequestWithUser) {
    return await this.configurationService.findVisibleFacilities(
      parseInt(request.user.cid),
    );
  }

  @Get('facility/:id')
  @UseGuards(AuthGuard)
  async getFacilityById(@Param('id') id: string) {
    return await this.configurationService.findOneFacilityById(id);
  }

  @Post('facility')
  @UseGuards(AuthGuard, FacilityGuard)
  @HttpCode(HttpStatus.CREATED)
  async createFacility(@Body() input: Facility) {
    return await this.configurationService.createFacility(input);
  }

  @Patch('facility/:id')
  @UseGuards(AuthGuard, FacilityGuard)
  @HttpCode(HttpStatus.OK)
  async updateFacility(@Param('id') id: string, @Body() input: Facility) {
    return await this.configurationService.updateFacility(id, input);
  }

  @Delete('facility/:id')
  @UseGuards(AuthGuard, FacilityGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFacility(@Param('id') id: string) {
    return await this.configurationService.deleteFacility(id);
  }
  //#endregion

  //#region Editor
  @Post('editor')
  @UseGuards(AuthGuard, EditorGuard)
  @HttpCode(HttpStatus.CREATED)
  async createEditor(@Req() request: RequestWithUser, @Body() input: Editor) {
    return await this.configurationService.createEditor(
      input,
      request.user.cid,
    );
  }

  @Delete('editor/:id')
  @UseGuards(AuthGuard, EditorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: number) {
    return await this.configurationService.deleteEditor(id);
  }
  //#endregion

  //#region Position
  @Get('position/poop')
  async getAllPositions2() {
    return await this.configurationService.findAllPositionsByFacilityId('ZAU');
  }
  @Get('position/by-facility/:id')
  @UseGuards(AuthGuard, PositionGuard)
  async getAllPositions(@Param('id') id: string) {
    return await this.configurationService.findAllPositionsByFacilityId(id);
  }
  @Get('position/by-id/:id')
  async getPositionById(@Param('id') id: number) {
    return await this.configurationService.findPositionById(id);
  }

  @Get('position/by-callsign/:callsign/:frequency')
  async getPositionByCallsignAndFrequency(
    @Param('callsign') callsign: string,
    @Param('frequency') frequency: string | number,
  ) {
    return await this.configurationService.findPositionByCallsignPrefix(
      callsign,
      frequency,
    );
  }

  @Get('position/by-dial/:id')
  async getPositionByDialCode(@Param('id') id: string) {
    return await this.configurationService.findPositionByDialCode(id);
  }

  @Post('position')
  @UseGuards(AuthGuard, CreatePositionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPosition(
    @Body() input: { position: Position; facilityId: string },
  ) {
    return await this.configurationService.createPosition(
      input.position,
      input.facilityId,
    );
  }

  @Patch('position/:id')
  @UseGuards(AuthGuard, PositionGuard)
  @HttpCode(HttpStatus.OK)
  async updatePosition(
    @Param('id') id: number,
    @Body() input: { position: Position; facilityId: string },
  ) {
    return await this.configurationService.updatePosition(id, input.position);
  }

  @Delete('position/:id')
  @UseGuards(AuthGuard, PositionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePosition(@Param('id') id: number) {
    return await this.configurationService.deletePosition(id);
  }
  //#endregion

  //#region Position Configuration
  @Get('position-configuration/by-id/:id')
  async getPositionConfigurationById(@Param('id') id: number) {
    return await this.configurationService.findPositionConfigurationById(id);
  }
  @Get('position-configuration/by-name/:id')
  async getPositionConfigurationByName(@Param('id') id: string) {
    return await this.configurationService.findPositionConfigurationByName(id);
  }

  @Post('position-configuration')
  @UseGuards(AuthGuard, PositionConfigurationGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPositionConfiguration(
    @Body() input: { position: number; configuration: PositionConfiguration },
  ) {
    return await this.configurationService.createPositionConfiguration(
      input.configuration,
    );
  }

  @Patch('position-configuration/:id')
  @UseGuards(AuthGuard, PositionConfigurationGuard)
  @HttpCode(HttpStatus.OK)
  async updatePositionConfiguration(
    @Param('id') id: number,
    @Body()
    input: { configuration: PositionConfigurationDto; positionId: number },
  ) {
    return await this.configurationService.updatePositionConfiguration(
      id,
      input.configuration,
    );
  }

  @Delete('position-configuration/:id')
  @UseGuards(AuthGuard, PositionConfigurationGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePositionConfiguration(@Param('id') id: number) {
    return await this.configurationService.deletePositionConfiguration(id);
  }
  //#endregion

  //#region Button
  @Get('button')
  @UseGuards(AuthGuard)
  async getVisibleButtons(@Req() request: RequestWithUser) {
    return await this.configurationService.getButtons(request.user.cid);
  }

  @Get('button/:id')
  async getButtonById(@Param('id') id: number) {
    return await this.configurationService.findButtonById(id);
  }

  @Post('button')
  @UseGuards(AuthGuard, ButtonGuard)
  @HttpCode(HttpStatus.CREATED)
  async createButton(
    @Body() input: { button: Button; configurationId: number },
  ) {
    return await this.configurationService.createButton(
      input.button,
      input.configurationId,
    );
  }

  @Patch('button/:id')
  @UseGuards(AuthGuard, ButtonGuard)
  @HttpCode(HttpStatus.OK)
  async updateButton(
    @Param('id') id: number,
    @Body() input: { button: Button; configurationId: number },
  ) {
    return await this.configurationService.updateButton(id, input.button);
  }

  @Delete('button/:id')
  @UseGuards(AuthGuard, ButtonGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeButton(@Param('id') id: number) {
    return await this.configurationService.deleteButton(id);
  }
  //#endregion
}

interface RequestWithUser extends Request {
  user: {
    cid: string;
  };
}
