import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { validate } from 'class-validator';
import { firstValueFrom } from 'rxjs';
import { DataSource, In, Like, UpdateResult } from 'typeorm';
import { Button } from './entities/button.entity';
import { ConfigurationLayout } from './entities/configuration-layout.entity';
import { Editor } from './entities/editor.entity';
import { Facility } from './entities/facility.entity';
import {
  PositionConfiguration,
  PositionConfigurationDto,
} from './entities/position-configuration.entity';
import { Position } from './entities/position.entity';
import { ButtonType, PanelType } from './enums';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  constructor(
    private dataSource: DataSource,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async seedData() {
    this.dataSource
      .getRepository(Facility)
      .save({
        id: 'NAS',
        createdAt: new Date('1970-01-01 00:00:01'),
      })
      .then(async (nas) => {
        const facilities: Facility[] = [];
        const positions: Position[] = [];

        const position = new Position();
        position.facility = nas;
        position.callsign = 'AUTO_ATC';
        position.frequency = 136975;
        position.sector = 'ALL';
        position.name = 'ALL NAS';
        position.createdAt = new Date('1970-01-01 00:00:01');
        position.panelType = PanelType.VSCS;

        try {
          const data = (
            await firstValueFrom(
              this.httpService.get(
                'https://data-api.vnas.vatsim.net/api/artccs/',
              ),
            )
          ).data;
          if (!data) {
            this.logger.error('No data from vNAS');
            return;
          }
          data.forEach((facility: any) => {
            if (!facility.facility.id) {
              this.logger.error(
                `No facility id: ${JSON.stringify(facility.facility)}`,
              );
              return;
            }
            this.logger.debug(`Create facility ${facility.facility.id}`);
            const f = new Facility();
            f.id = facility.facility.id;
            f.childFacilities = [];
            f.parentFacility = nas;
            facility.facility.positions.forEach((p: any) => {
              const position = new Position();
              position.name = p.name;
              position.frequency = parseInt(
                p.frequency.toString().substr(0, 6),
              );
              position.callsign = p.callsign;
              position.facility = f;
              position.panelType = facility.eramConfiguration
                ? PanelType.VSCS
                : PanelType.RDVS;
              position.sector = p.eramConfiguration
                ? p.eramConfiguration.sectorId
                : p.starsConfiguration
                  ? p.starsConfiguration.sectorId
                  : p.callsign.split('_')[p.callsign.split('_').length - 1];
              positions.push(position);
            });
            facilities.push(f);

            facility.facility.childFacilities.forEach((c1: any) => {
              if (!c1.id) return;

              const c1f = new Facility();
              c1f.id = c1.id;
              c1f.parentFacility = f;
              c1.positions.forEach((p: any) => {
                const position = new Position();
                position.name = p.name;
                position.callsign = p.callsign;
                position.frequency = parseInt(
                  p.frequency.toString().substr(0, 6),
                );
                position.facility = c1f;
                position.panelType = facility.eramConfiguration
                  ? PanelType.VSCS
                  : PanelType.RDVS;
                position.sector = p.eramConfiguration
                  ? p.eramConfiguration.sectorId
                  : p.starsConfiguration
                    ? p.starsConfiguration.sectorId
                    : p.callsign.split('_')[p.callsign.split('_').length - 1];
                positions.push(position);
              });
              facilities.push(c1f);

              c1.childFacilities.forEach((c2: any) => {
                if (!c2.id) return;

                const c2f = new Facility();
                c2f.id = c2.id;
                c2f.parentFacility = c1f;
                c2.positions.forEach((p: any) => {
                  const position = new Position();
                  position.name = p.name;
                  position.callsign = p.callsign;
                  position.frequency = parseInt(
                    p.frequency.toString().substr(0, 6),
                  );
                  position.facility = c2f;
                  position.panelType = facility.eramConfiguration
                    ? PanelType.VSCS
                    : PanelType.RDVS;
                  position.sector = p.eramConfiguration
                    ? p.eramConfiguration.sectorId
                    : p.starsConfiguration
                      ? p.starsConfiguration.sectorId
                      : p.callsign.split('_')[p.callsign.split('_').length - 1];
                  positions.push(position);
                });
                facilities.push(c2f);

                c2.childFacilities.forEach((c3: any) => {
                  if (!c3.id) return;

                  const c3f = new Facility();
                  c3f.id = c3.id;
                  c3f.parentFacility = c2f;
                  c3.positions.forEach((p: any) => {
                    const position = new Position();
                    position.name = p.name;
                    position.callsign = p.callsign;
                    position.frequency = parseInt(
                      p.frequency.toString().substr(0, 6),
                    );
                    position.facility = c3f;
                    position.panelType = facility.eramConfiguration
                      ? PanelType.VSCS
                      : PanelType.RDVS;
                    position.sector = p.eramConfiguration
                      ? p.eramConfiguration.sectorId
                      : p.starsConfiguration
                        ? p.starsConfiguration.sectorId
                        : p.callsign.split('_')[
                            p.callsign.split('_').length - 1
                          ];
                    positions.push(position);
                  });
                  facilities.push(c3f);

                  c3.childFacilities.forEach((c4: any) => {
                    if (!c4.id) return;

                    this.logger.debug(`c4 Create facility ${c4.id}`);
                    const c4f = new Facility();
                    c4f.id = c4.id;
                    c4f.parentFacility = c3f;
                    c4.positions.forEach((p: any) => {
                      const position = new Position();
                      position.name = p.name;
                      position.callsign = p.callsign;
                      position.frequency = parseInt(
                        p.frequency.toString().substr(0, 6),
                      );
                      position.facility = c4f;
                      position.panelType = facility.eramConfiguration
                        ? PanelType.VSCS
                        : PanelType.RDVS;
                      position.sector = p.eramConfiguration
                        ? p.eramConfiguration.sectorId
                        : p.starsConfiguration
                          ? p.starsConfiguration.sectorId
                          : p.callsign.split('_')[
                              p.callsign.split('_').length - 1
                            ];
                      positions.push(position);
                    });
                    facilities.push(c4f);

                    c4.childFacilities.forEach((c5: any) => {
                      if (!c5.id) return;

                      this.logger.debug(`c5 Create facility ${c5.id}`);
                      const c5f = new Facility();
                      c5f.id = c5.id;
                      c5f.parentFacility = c4f;
                      c5.positions.forEach((p: any) => {
                        const position = new Position();
                        position.name = p.name;
                        position.frequency = parseInt(
                          p.frequency.toString().substr(0, 6),
                        );
                        position.facility = c5f;
                        position.callsign = p.callsign;
                        position.panelType = facility.eramConfiguration
                          ? PanelType.VSCS
                          : PanelType.RDVS;
                        position.sector = p.eramConfiguration
                          ? p.eramConfiguration.sectorId
                          : p.starsConfiguration
                            ? p.starsConfiguration.sectorId
                            : p.callsign.split('_')[
                                p.callsign.split('_').length - 1
                              ];
                        positions.push(position);
                      });
                      facilities.push(c5f);

                      c5.childFacilities.forEach((c6: any) => {
                        if (!c6.id) return;

                        this.logger.debug(`c6 Create facility ${c6.id}`);
                        const c6f = new Facility();
                        c6f.id = c6.id;
                        c6f.parentFacility = c5f;
                        c6.positions.forEach((p: any) => {
                          const position = new Position();
                          position.name = p.name;
                          position.callsign = p.callsign;
                          position.frequency = parseInt(
                            p.frequency.toString().substr(0, 6),
                          );
                          position.facility = c6f;
                          position.panelType = facility.eramConfiguration
                            ? PanelType.VSCS
                            : PanelType.RDVS;
                          position.sector = p.eramConfiguration
                            ? p.eramConfiguration.sectorId
                            : p.starsConfiguration
                              ? p.starsConfiguration.sectorId
                              : p.callsign.split('_')[
                                  p.callsign.split('_').length - 1
                                ];
                          positions.push(position);
                        });
                        facilities.push(c6f);
                      });
                    });
                  });
                });
              });
            });
          });

          this.logger.debug('saving artccs');
          await this.dataSource.getRepository(Facility).save(facilities);
          this.logger.debug('done saving artccs');
          this.logger.debug('saving positions');
          await this.dataSource
            .getRepository(Position)
            .createQueryBuilder()
            .insert()
            .values(positions)
            .orIgnore()
            .execute();
          this.logger.debug('done saving positions');
          const editor = new Editor();
          editor.cid = 1369362;
          editor.facility = nas;
          editor.addedBy = 800000;
          await this.dataSource.getRepository(Editor).save(editor);
          this.logger.debug('SEEDING DONE');
        } catch (err) {
          this.logger.error(`Error fetching ARTCCs ${err}`);
        }
      })
      .catch((err) => this.logger.error(`Error creating NAS: ${err}`));
  }

  //#region Facility
  async createFacility(facility: Facility) {
    const newF = new Facility();
    Object.assign(newF, facility);
    return await this.dataSource.manager.save(newF);
  }

  async findOneFacility(facilityId: string) {
    const facility = await this.dataSource.getTreeRepository(Facility).findOne({
      where: { id: facilityId },
    });
    const retval = await this.dataSource
      .getTreeRepository(Facility)
      .findDescendants(facility!, {
        relations: ['parentFacility', 'childFacilities', 'buttons'],
      });

    return retval;
  }

  async findVisibleFacilities(cid: number) {
    const approvedFacilities = await this.dataSource
      .getRepository(Editor)
      .find({
        where: { cid },
        relations: {
          facility: true,
        },
      });

    let retval: Facility[] = [];
    await Promise.all(
      approvedFacilities.map(async (editor: Editor) => {
        const data = await this.findOneFacility(editor.facility.id);
        if (data) {
          retval = retval.concat(data);
        }
      }),
    );

    return retval.sort((a, b) => ('' + a.id).localeCompare(b.id));
  }

  async findOneFacilityById(facilityId: string) {
    const data: Facility | null = await this.dataSource
      .getTreeRepository(Facility)
      .createQueryBuilder('facility')
      .where({
        id: facilityId,
      })
      .leftJoinAndSelect('facility.parentFacility', 'parentFacility')
      .leftJoinAndSelect('facility.childFacilities', 'childFacilities')
      .leftJoinAndSelect('facility.editors', 'editors')
      .leftJoinAndSelect('facility.positions', 'positions')
      .select([
        'facility',
        'parentFacility.id',
        'childFacilities.id',
        'editors',
        'positions',
      ])
      .getOne();

    if (!data) throw new BadRequestException();

    data.childFacilities?.sort((a, b) => ('' + a.id).localeCompare(b.id));
    data.positions?.sort((a, b) => ('' + a.sector).localeCompare(b.sector));

    return data;
  }

  async updateFacility(facilityId: string, facility: Facility) {
    const f = new Facility();
    Object.assign(f, facility);
    f.id = facilityId;

    const errors = await validate(f);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.getRepository(Facility).save(f);

    return retval;
  }

  async deleteFacility(facilityId: string) {
    const retval = await this.dataSource
      .getRepository(Facility)
      .softDelete(facilityId);

    return retval;
  }
  //#endregion

  //#region Editor
  async createEditor(editor: Editor, addedBy: string) {
    const e = new Editor();
    Object.assign(e, editor);
    e.addedBy = parseInt(addedBy);

    const errors = await validate(e);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.manager.save(e);

    return retval;
  }

  async deleteEditor(editorId: number) {
    const retval = await this.dataSource.getRepository(Editor).delete(editorId);

    return retval;
  }
  //#endregion Editor

  //#region Position
  async createPosition(
    position: Position,
    facilityId: string,
  ): Promise<Position> {
    const facility = await this.findOneFacilityById(facilityId);
    if (!facility) throw new BadRequestException();

    const p = new Position();
    Object.assign(p, position);
    p.facility = facility;

    const errors = await validate(p);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.manager.save(p);
    return retval;
  }

  async findAppPositions() {
    const p = await this.dataSource.getRepository(Position).find({
      relations: [
        'facility',
        'configurations',
        'configurations.layouts',
        'configurations.layouts.button',
      ],
    });

    return p;
  }

  async findAllPositionsByFacilityId(facility: string) {
    const f = await this.dataSource.getRepository(Facility).findOne({
      where: { id: facility },
      relations: {
        positions: true,
      },
      relationLoadStrategy: 'query',
    });
    if (!f) throw new BadRequestException();

    return f.positions;
  }

  async findPositionById(positionId: number): Promise<Position | null> {
    const retval = await this.dataSource.getRepository(Position).findOne({
      where: { id: positionId },
      relations: ['facility', 'facility.parentFacility', 'configurations'],
    });

    return retval;
  }

  async findPositionByIdOnlyFacility(
    positionId: number,
  ): Promise<Position | null> {
    const retval = await this.dataSource.getRepository(Position).findOne({
      where: { id: positionId },
      relations: ['facility'],
    });

    return retval;
  }

  async findPositionByCallsignPrefix(
    callsign: string,
    frequency: string | number,
  ): Promise<Position> {
    const freq = parseInt(frequency.toString().replace('.', ''));
    const parts = callsign.split('_');
    const match = await this.dataSource
      .getRepository(Position)
      .createQueryBuilder('position')
      .where({
        frequency: freq,
        callsign: Like(`${parts[0]}%_${parts[parts.length - 1]}`),
      })
      .leftJoinAndSelect('position.facility', 'facility')
      .leftJoinAndSelect('position.configurations', 'configs')
      .leftJoinAndSelect('configs.layouts', 'layouts')
      .leftJoinAndSelect('layouts.button', 'button')
      .select(['position', 'facility.id', 'configs', 'layouts', 'button'])
      .getOne();

    if (!match) throw new NotFoundException();

    return match;
  }

  async findPositionByDialCode(code: string): Promise<Position | null> {
    const retval = await this.dataSource.getRepository(Position).findOne({
      where: { dialCode: code },
      relations: [
        'facility',
        'facility.parentFacility',
        'configurations',
        'configurations.layouts.button',
        'configurations.positions',
      ],
    });

    return retval;
  }

  async updatePosition(
    positionId: number,
    position: Position,
  ): Promise<Position> {
    const p = new Position();
    Object.assign(p, position);
    p.id = positionId;

    const errors = await validate(p);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }
    const retval = await this.dataSource.getRepository(Position).save(p);

    return retval;
  }

  async deletePosition(positionId: number): Promise<UpdateResult> {
    const retval = await this.dataSource
      .getRepository(Position)
      .softDelete(positionId);

    return retval;
  }
  //#endregion

  //#region Position Configuration
  async createPositionConfiguration(config: PositionConfiguration) {
    const pc = new PositionConfiguration();
    Object.assign(pc, config);

    const errors = await validate(pc);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.manager.save(pc);

    return retval;
  }

  async findPositionConfigurationById(configId: number) {
    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { id: configId },
        relations: ['positions', 'layouts', 'layouts.button'],
      });

    return retval;
  }

  async findPositionConfigurationByIdNoLayouts(configId: number) {
    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { id: configId },
        relations: ['positions'],
      });

    return retval;
  }

  async findPositionConfigurationByName(name: string) {
    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { name },
        relations: ['positions', 'layouts', 'layouts.button'],
      });

    return retval;
  }

  async updatePositionConfiguration(
    configId: number,
    config: PositionConfigurationDto,
  ) {
    const buttons = [...config.buttons];
    const configuration = {
      name: config.name,
      id: configId,
      positions: config.positions,
    };
    const pc = new PositionConfiguration();
    Object.assign(pc, configuration);
    pc.id = configId;
    for (let i = 0; i < buttons.length; i++) {
      const layout = new ConfigurationLayout();
      layout.button = buttons[i];
      layout.order = i;
      layout.configuration = pc;
      await this.saveConfigurationLayout(layout);
    }

    const errors = await validate(pc);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .save(pc);

    return retval;
  }

  async deletePositionConfiguration(configId: number) {
    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .softDelete(configId);

    return retval;
  }
  //#endregion

  //#region ConfigurationLayout
  async saveConfigurationLayout(layout: ConfigurationLayout) {
    const lookup = await this.dataSource
      .getRepository(ConfigurationLayout)
      .findOne({
        where: {
          order: layout.order,
          configuration: {
            id: layout.configuration.id,
          },
        },
      });
    const l = new ConfigurationLayout();
    l.order = layout.order;
    l.configuration = layout.configuration;
    l.button = layout.button;
    if (lookup && lookup.id) {
      if (layout.button.type === ButtonType.NONE) {
        await this.dataSource
          .getRepository(ConfigurationLayout)
          .delete(lookup.id);
        return;
      }
      l.id = lookup.id;
    }

    if (l.button.type === ButtonType.NONE) {
      return;
    }

    const errors = await validate(l);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource
      .getRepository(ConfigurationLayout)
      .save(l);

    return retval;
  }
  //#endregion

  //#region Button
  async createButton(button: Button, configurationId: number) {
    // Preload information to assign to facility
    const config = await this.findPositionConfigurationById(configurationId);
    if (!config || !config.positions[0]) {
      throw new BadRequestException();
    }
    const position = await this.findPositionById(config.positions[0].id);
    if (!position) throw new BadRequestException();

    const b = new Button();
    Object.assign(b, button);
    b.facility = position.facility;

    const errors = await validate(b);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.manager.save(b);

    return retval;
  }

  async getButtons(cid: string) {
    console.time('approvedFacilities');
    const approvedFacilities = await this.findVisibleFacilities(parseInt(cid));

    const facilities = approvedFacilities.map((f) => f.id);
    console.timeEnd('approvedFacilities');

    console.time('visibleButtons');
    const buttons = await this.dataSource.getRepository(Button).find({
      where: {
        facility: {
          id: In(facilities),
        },
      },
    });
    console.timeEnd('visibleButtons');

    // Add a none button for every facility
    const noneButton = new Button();
    noneButton.shortName = 'NONE';
    noneButton.longName = 'NONE';
    noneButton.target = 'NONE';
    noneButton.type = ButtonType.NONE;
    noneButton.layouts = [];
    noneButton.id = 0;

    return [
      noneButton,
      ...buttons.sort((a, b) => ('' + a.target).localeCompare(b.target)),
    ];
  }

  async findButtonById(buttonId: number) {
    const retval = await this.dataSource
      .getRepository(Button)
      .findOne({ where: { id: buttonId }, relations: ['configurations'] });

    return retval;
  }

  async updateButton(buttonId: number, button: Button) {
    const b = new Button();
    Object.assign(b, button);
    b.id = buttonId;

    const errors = await validate(b);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.getRepository(Button).save(b);

    return retval;
  }

  async deleteButton(buttonId: number) {
    const retval = await this.dataSource
      .getRepository(Button)
      .softDelete(buttonId);

    return retval;
  }
  //#endregion

  //#region Authorization checks
  async isEditorOfFacility(cid: number, facilityId: string): Promise<boolean> {
    const cache = await this.cacheManager.get<boolean>(
      `facility-${cid}-${facilityId}`,
    );
    if (cache !== undefined) {
      this.logger.debug(`Using cache for facility, value: ${cache}`);
      return cache;
    }
    const approvedFacilities = await this.dataSource
      .getRepository(Editor)
      .find({
        where: { cid },
        relations: {
          facility: true,
        },
      });

    if (approvedFacilities.some((f) => f.facility.id === facilityId)) {
      // Direct match
      this.cacheManager.set(`facility-${cid}-${facilityId}`, true);
      return true;
    }

    const target = await this.dataSource
      .getRepository(Facility)
      .findOne({ where: { id: facilityId } });
    if (!target) {
      throw new InternalServerErrorException('Error finding facility');
    }

    const tree = await this.dataSource
      .getTreeRepository(Facility)
      .findAncestorsTree(target);

    if (!tree) throw new NotFoundException('Parent Facility not found');

    let fac = tree.parentFacility;
    while (fac) {
      if (approvedFacilities.some((f) => f.facility.id === fac.id)) {
        this.cacheManager.set(`facility-${cid}-${facilityId}`, true);
        return true;
      } else {
        fac = fac.parentFacility;
      }
    }

    this.logger.warn(
      `${cid} is not an editor of ${facilityId} or its parents.`,
    );
    this.cacheManager.set(`facility-${cid}-${facilityId}`, false);

    throw new ForbiddenException(`Not an editor for ${facilityId}`);
  }

  async isEditorOfPositions(
    cid: number,
    positions: Position[],
  ): Promise<boolean> {
    const facilities: Facility[] = [];
    positions.forEach((p) => facilities.push(p.facility));
    return await this.asyncEvery(facilities, async (f: Facility) => {
      return this.isEditorOfFacility(cid, f.id);
    });
  }

  async isEditorOfPosition(cid: number, positionId: number): Promise<boolean> {
    const cache = await this.cacheManager.get<boolean>(
      `position-${cid}-${positionId}`,
    );
    if (cache !== undefined) {
      this.logger.debug(`Using cache for position, value: ${cache}`);
      return cache;
    }
    const position = await this.findPositionByIdOnlyFacility(positionId);
    if (!position) throw new NotFoundException();
    const retval = await this.isEditorOfFacility(cid, position.facility.id);
    this.cacheManager.set(`position-${cid}-${positionId}`, retval, 300000);

    return retval;
  }

  async isEditorOfConfiguration(
    cid: number,
    configuration: number,
  ): Promise<boolean> {
    const cache = await this.cacheManager.get<boolean>(
      `configurations-${cid}-${configuration}`,
    );
    if (cache !== undefined) {
      this.logger.debug(`Using cache for configuration, value: ${cache}`);
      return cache;
    }
    const config =
      await this.findPositionConfigurationByIdNoLayouts(configuration);
    if (!config) throw new BadRequestException();
    const positions: Position[] = [];
    await Promise.all(
      config.positions.map(async (p) => {
        const data = await this.findPositionByIdOnlyFacility(p.id);
        if (data) positions.push(data);
      }),
    );

    const retval = await this.isEditorOfPositions(cid, positions);

    this.cacheManager.set(
      `configurations-${cid}-${configuration}`,
      retval,
      300000,
    );
    return retval;
  }
  //#endregion

  //#region Utilities
  private asyncEvery = async (arr: any[], predicate: any): Promise<boolean> => {
    for (const e of arr) {
      if (!(await predicate(e))) return false;
    }
    return true;
  };

  private asyncSome = async (arr: any[], predicate: any): Promise<boolean> => {
    for (const e of arr) {
      if (await predicate(e)) return true;
    }
    return false;
  };
  //#endregion
}
