import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { firstValueFrom } from 'rxjs';
import { DataSource, UpdateResult } from 'typeorm';
import { Button } from './entities/button.entity';
import { ConfigurationLayout } from './entities/configuration-layout.entity';
import { Editor } from './entities/editor.entity';
import { Facility } from './entities/facility.entity';
import {
  PositionConfiguration,
  PositionConfigurationDto,
} from './entities/position-configuration.entity';
import { Position } from './entities/position.entity';
import { ButtonType } from './enums';
import { performance } from 'perf_hooks';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  constructor(
    private dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {}

  async seedData() {
    this.dataSource
      .getRepository(Facility)
      .save({
        id: 'NAS',
      })
      .then(async (nas) => {
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
              console.error('p: No facility id', facility.facility);
              return;
            }
            this.dataSource
              .getRepository(Facility)
              .save({
                id: facility.facility.id,
                parentFacility: nas,
              })
              .then((artcc) => {
                facility.facility.childFacilities.forEach((c1: any) => {
                  if (!c1.id) {
                    console.error('c1: no facility id', c1);
                    return;
                  }
                  this.dataSource
                    .getRepository(Facility)
                    .save({
                      id: c1.id,
                      parentFacility: artcc,
                    })
                    .then((s1) => {
                      c1.childFacilities.forEach((c2: any) => {
                        if (!c2.id) {
                          console.error('c2: no facility id', c2);
                          return;
                        }
                        this.dataSource
                          .getRepository(Facility)
                          .save({
                            id: c2.id,
                            parentFacility: s1,
                          })
                          .then((s2) => {
                            c2.childFacilities.forEach((c3: any) => {
                              if (!c3.id) {
                                console.error('c3: no facility id', c3);
                                return;
                              }
                              this.dataSource
                                .getRepository(Facility)
                                .save({
                                  id: c3.id,
                                  parentFacility: s2,
                                })
                                .then((s3) => {
                                  c3.childFacilities.forEach((c4: any) => {
                                    if (!c4.id) {
                                      console.error('c4: no facility id', c4);
                                      return;
                                    }
                                    this.dataSource
                                      .getRepository(Facility)
                                      .save({
                                        id: c4.id,
                                        parentFacility: s3,
                                      })
                                      .then((s4) => {
                                        c4.childFacilities.forEach(
                                          (c5: any) => {
                                            if (!c5.id) {
                                              console.error(
                                                'c5: no facility id',
                                                c5,
                                              );
                                              return;
                                            }
                                            this.dataSource
                                              .getRepository(Facility)
                                              .save({
                                                id: c5.id,
                                                parentFacility: s4,
                                              });
                                          },
                                        );
                                      })
                                      .catch((err) =>
                                        this.logger.error(
                                          `Error saving s4 ${err}`,
                                        ),
                                      );
                                  });
                                })
                                .catch((err) =>
                                  this.logger.error(`Error saving c3 ${err}`),
                                );
                            });
                          })
                          .catch((err) =>
                            this.logger.error(`Error creating c2 ${err}`),
                          );
                      });
                    })
                    .catch((err) =>
                      this.logger.error(`Error creating c1 ${err}`),
                    );
                });
              })
              .catch((err) => this.logger.error(`Error creating artcc ${err}`));
          });
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

  async findAllFacilities() {
    const start = performance.now();
    const retval = await this.dataSource.getTreeRepository(Facility).findTrees({
      relations: [
        'parentFacility',
        'childFacilities',
        'positions',
        'editors',
        'positions.facility',
        'positions.configurations',
        'positions.configurations.layouts',
        'childFacilities.positions',
        'childFacilities.positions.facility',
        'childFacilities.positions.configurations',
        'childFacilities.positions.configurations.layouts',
        'childFacilities.childFacilities',
      ],
    });

    this.logger.debug(
      `findAllFacilities took ${performance.now() - start}ms to execute`,
    );

    return retval;
  }

  async findVisibleFacilities(cid: number) {
    const start = performance.now();
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
        const data = await this.findFacilityById(editor.facility.id);
        if (data) {
          retval = retval.concat(data);
        }
      }),
    );
    this.logger.debug(
      `findVisibleFacilities took ${performance.now() - start} to execute`,
    );
    return retval;
  }

  async findOneFacilityById(facilityId: string) {
    const start = performance.now();
    const data: Facility | null = await this.dataSource
      .getTreeRepository(Facility)
      .findOne({
        where: { id: facilityId },
        relations: [
          'parentFacility',
          'childFacilities',
          'positions',
          'positions.facility',
          'editors',
          'positions.configurations',
          'positions.configurations.layouts',
          'childFacilities.childFacilities',
        ],
      });

    data?.childFacilities.sort((a, b) => ('' + a.id).localeCompare(b.id));
    data?.positions.sort((a, b) => ('' + a.sector).localeCompare(b.sector));

    this.logger.debug(
      `findOneFacilityById took ${performance.now() - start} to execute`,
    );

    return data;
  }

  async findFacilityById(facilityId: string) {
    const start = performance.now();
    const facility: Facility | null = await this.dataSource
      .getTreeRepository(Facility)
      .findOne({
        where: { id: facilityId },
        relations: [
          'parentFacility',
          'childFacilities',
          'positions',
          'positions.facility',
          'editors',
          'positions.configurations',
          'positions.configurations.layouts',
          'childFacilities.childFacilities',
        ],
      });

    if (!facility) throw new BadRequestException();

    const data = [];
    data.push(facility);
    await Promise.all(
      facility.childFacilities.map(async (cf) => {
        const cfData = await this.findFacilityById(cf.id);
        data.push(cfData);
      }),
    );

    const retval = data.flat();

    this.logger.debug(
      `findFacilityById took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async updateFacility(facilityId: string, facility: Facility) {
    const start = performance.now();
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

    this.logger.debug(
      `updateFacility took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async deleteFacility(facilityId: string) {
    const start = performance.now();
    const retval = await this.dataSource
      .getRepository(Facility)
      .softDelete(facilityId);

    this.logger.debug(
      `deleteFacility took ${performance.now() - start} to execute`,
    );
    return retval;
  }
  //#endregion

  //#region Editor
  async createEditor(editor: Editor, addedBy: string) {
    const start = performance.now();
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

    this.logger.debug(
      `createEditor took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async deleteEditor(editorId: string) {
    const start = performance.now();
    const retval = await this.dataSource.getRepository(Editor).delete(editorId);

    this.logger.debug(
      `deleteEditor took ${performance.now() - start} to execute`,
    );

    return retval;
  }
  //#endregion Editor

  //#region Position
  async createPosition(
    position: Position,
    facilityId: string,
  ): Promise<Position> {
    const start = performance.now();
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

    this.logger.debug(
      `createPosition took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async findAllPositions(facility: string) {
    const start = performance.now();
    const f = await this.dataSource.getRepository(Facility).findOne({
      where: { id: facility },
      relations: {
        positions: true,
      },
    });
    if (!f) throw new BadRequestException();

    this.logger.debug(
      `findAllPositions took ${performance.now() - start} to execute`,
    );

    return f.positions;
  }

  async findPositionById(positionId: string): Promise<Position | null> {
    const start = performance.now();

    const retval = await this.dataSource.getRepository(Position).findOne({
      where: { id: positionId },
      relations: [
        'facility',
        'facility.parentFacility',
        'configurations',
        'configurations.layouts',
        'configurations.layouts.button',
        'configurations.positions',
      ],
    });

    this.logger.debug(
      `findPositionById took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async findPositionByCallsignPrefix(
    callsign: string,
  ): Promise<Position | null> {
    const start = performance.now();

    const all = await this.dataSource
      .getRepository(Position)
      .find({ select: ['id', 'callsignPrefix'] });

    const match = all.find((p) => callsign.startsWith(p.callsignPrefix));
    if (match) {
      const retval = await this.dataSource.getRepository(Position).findOne({
        where: { id: match.id },
        relations: [
          'facility',
          'facility.parentFacility',
          'configurations',
          'configurations.layouts',
          'configurations.layouts.button',
          'configurations.positions',
        ],
      });

      this.logger.debug(
        `findPositionByCallsignPrefix took ${performance.now() - start} to execute`,
      );

      return retval;
    }
    return null;
  }

  async findPositionByDialCode(code: string): Promise<Position | null> {
    const start = performance.now();
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

    this.logger.debug(
      `findPositionByDialCode took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async updatePosition(
    positionId: string,
    position: Position,
  ): Promise<Position> {
    const start = performance.now();
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

    this.logger.debug(
      `updatePosition took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async deletePosition(positionId: string): Promise<UpdateResult> {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(Position)
      .softDelete(positionId);

    this.logger.debug(
      `deletePosition took ${performance.now() - start} to execute`,
    );

    return retval;
  }
  //#endregion

  //#region Position Configuration
  async createPositionConfiguration(config: PositionConfiguration) {
    const start = performance.now();

    const pc = new PositionConfiguration();
    Object.assign(pc, config);

    const errors = await validate(pc);
    if (errors.length > 0) {
      throw new BadRequestException(
        `Validation failed! ${errors.map((z) => z.constraints![Object.keys(z.constraints!)[0]]).join(', ')}`,
      );
    }

    const retval = await this.dataSource.manager.save(pc);

    this.logger.debug(
      `createPositionConfiguration took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async findPositionConfigurationById(configId: string) {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { id: configId },
        relations: ['positions', 'layouts', 'layouts.button'],
      });

    this.logger.debug(
      `findPositionConfigurationById took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async findPositionConfigurationByName(name: string) {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { name },
        relations: ['positions', 'layouts', 'layouts.button'],
      });

    this.logger.debug(
      `findPositionConfigurationByName took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async updatePositionConfiguration(
    configId: string,
    config: PositionConfigurationDto,
  ) {
    const start = performance.now();
    const buttons = [...config.buttons];
    const { name, id, positions } = config;
    const configuration = {
      name,
      id,
      positions,
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

    this.logger.debug(
      `updatePositionConfiguration took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async deletePositionConfiguration(configId: string) {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .softDelete(configId);

    this.logger.debug(
      `deletePositionConfiguration took ${performance.now() - start} to execute`,
    );

    return retval;
  }
  //#endregion

  //#region ConfigurationLayout
  async saveConfigurationLayout(layout: ConfigurationLayout) {
    const start = performance.now();
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

    this.logger.debug(
      `saveConfigurationLayout took ${performance.now() - start} to execute`,
    );

    return retval;
  }
  //#endregion

  //#region Button
  async createButton(button: Button, configurationId: string) {
    const start = performance.now();
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

    this.logger.debug(
      `createButton took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async getButtons(cid: string) {
    const start = performance.now();
    const visibleFacilities = await this.findVisibleFacilities(parseInt(cid));
    if (!visibleFacilities) {
      throw new BadRequestException(
        'You are not authorized to view any facilities.',
      );
    }

    const buttons: Button[] = [];
    await Promise.all(
      visibleFacilities.map(async (facility) => {
        const btns = await this.dataSource.getRepository(Button).find({
          where: {
            facility: {
              id: facility.id,
            },
          },
        });
        if (btns) {
          buttons.push(...btns);
        }
      }),
    );

    // Add a none button for every facility
    const noneButton = new Button();
    noneButton.shortName = 'NONE';
    noneButton.longName = 'NONE';
    noneButton.target = 'NONE';
    noneButton.type = ButtonType.NONE;
    noneButton.layouts = [];
    noneButton.id = '00000000-0000-0000-0000-000000000000';

    this.logger.debug(
      `getButtons took ${performance.now() - start} to execute`,
    );

    return [
      noneButton,
      ...buttons.sort((a, b) => ('' + a.shortName).localeCompare(b.shortName)),
    ];
  }

  async findButtonById(buttonId: string) {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(Button)
      .findOne({ where: { id: buttonId }, relations: ['configurations'] });

    this.logger.debug(
      `findButtonById took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async updateButton(buttonId: string, button: Button) {
    const start = performance.now();
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

    this.logger.debug(
      `updateButton took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async deleteButton(buttonId: string) {
    const start = performance.now();

    const retval = await this.dataSource
      .getRepository(Button)
      .softDelete(buttonId);

    this.logger.debug(
      `deleteButton took ${performance.now() - start} to execute`,
    );

    return retval;
  }
  //#endregion

  //#region Authorization checks
  async isEditorOfFacility(cid: number, facilityId: string): Promise<boolean> {
    const start = performance.now();
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
      this.logger.debug(
        `isEditorOfFacility took ${performance.now() - start} to execute`,
      );

      return true;
    } else {
      const target = await this.dataSource
        .getRepository(Facility)
        .findOne({ where: { id: facilityId } });
      if (!target) {
        throw new InternalServerErrorException('Error find facility');
      }

      const tree = await this.dataSource
        .getTreeRepository(Facility)
        .findAncestorsTree(target);

      if (!tree) throw new NotFoundException('Parent Facility not found');

      let fac = tree.parentFacility;
      while (fac) {
        if (approvedFacilities.some((f) => f.facility.id === fac.id)) {
          this.logger.debug(
            `isEditorOfFacility took ${performance.now() - start} to execute`,
          );

          return true;
        } else {
          fac = fac.parentFacility;
        }
      }

      this.logger.log(
        `${cid} is not an editor of ${facilityId} or its parents.`,
      );
      this.logger.debug(
        `isEditorOfFacility took ${performance.now() - start} to execute`,
      );

      throw new ForbiddenException(`Not an editor for ${facilityId}`);
    }
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

  async isEditorOfPosition(cid: number, positionId: string): Promise<boolean> {
    const start = performance.now();
    const position = await this.findPositionById(positionId);
    if (!position) throw new NotFoundException();
    const retval = await this.isEditorOfFacility(cid, position.facility.id);

    this.logger.debug(
      `isEditorOfPosition took ${performance.now() - start} to execute`,
    );

    return retval;
  }

  async isEditorOfConfiguration(
    cid: number,
    configuration: string,
  ): Promise<boolean> {
    const start = performance.now();
    const config = await this.findPositionConfigurationById(configuration);
    if (!config) throw new BadRequestException();
    const positions: Position[] = [];
    await Promise.all(
      config.positions.map(async (p) => {
        const data = await this.findPositionById(p.id);
        if (data) positions.push(data);
      }),
    );

    const retval = await this.isEditorOfPositions(cid, positions);

    this.logger.debug(
      `isEditorOfConfiguration took ${performance.now() - start} to execute`,
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
