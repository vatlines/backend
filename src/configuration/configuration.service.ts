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
import { DataSource, In, UpdateResult } from 'typeorm';
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
        createdAt: new Date('1970-01-01 00:00:01'),
      })
      .then(async (nas) => {
        const position = new Position();
        position.facility = nas;
        position.callsignPrefix = 'AUTO_ATC';
        position.sector = 'ALL';
        position.name = 'NAS';
        position.createdAt = new Date('1970-01-01 00:00:01');

        const facilities: Facility[] = [];

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
            facilities.push(f);

            facility.facility.childFacilities.forEach((c1: any) => {
              if (!c1.id) return;

              const c1f = new Facility();
              c1f.id = c1.id;
              c1f.parentFacility = f;
              facilities.push(c1f);

              c1.childFacilities.forEach((c2: any) => {
                if (!c2.id) return;

                const c2f = new Facility();
                c2f.id = c2.id;
                c2f.parentFacility = c1f;
                facilities.push(c2f);

                c2.childFacilities.forEach((c3: any) => {
                  if (!c3.id) return;

                  const c3f = new Facility();
                  c3f.id = c3.id;
                  c3f.parentFacility = c2f;
                  facilities.push(c3f);

                  c3.childFacilities.forEach((c4: any) => {
                    if (!c4.id) return;

                    this.logger.debug(`c4 Create facility ${c4.id}`);
                    const c4f = new Facility();
                    c4f.id = c4.id;
                    c4f.parentFacility = c3f;
                    facilities.push(c4f);

                    c4.childFacilities.forEach((c5: any) => {
                      if (!c5.id) return;

                      this.logger.debug(`c5 Create facility ${c5.id}`);
                      const c5f = new Facility();
                      c5f.id = c5.id;
                      c5f.parentFacility = c4f;
                      facilities.push(c5f);

                      c5.childFacilities.forEach((c6: any) => {
                        if (!c6.id) return;

                        this.logger.debug(`c6 Create facility ${c6.id}`);
                        const c6f = new Facility();
                        c6f.id = c6.id;
                        c6f.parentFacility = c5f;
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
          const editor = new Editor();
          editor.cid = 1369362;
          editor.facility = nas;
          this.createEditor(editor, '800000');
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

  async findAllFacilities() {
    return [];
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

  async findOneFacilityById(
    facilityId: string,
    relationsToLoad: string[] = [
      'parentFacility',
      'childFacilities',
      'positions',
      'editors',
    ],
  ) {
    const data: Facility | null = await this.dataSource
      .getTreeRepository(Facility)
      .findOne({
        where: { id: facilityId },
        relations: relationsToLoad,
      });

    data?.childFacilities?.sort((a, b) => ('' + a.id).localeCompare(b.id));
    data?.positions?.sort((a, b) => ('' + a.sector).localeCompare(b.sector));

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

  async deleteEditor(editorId: string) {
    const retval = await this.dataSource.getRepository(Editor).delete(editorId);

    return retval;
  }
  //#endregion Editor

  //#region Position
  async createPosition(
    position: Position,
    facilityId: string,
  ): Promise<Position> {
    const facility = await this.findOneFacilityById(facilityId, []);
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

  async findAllPositions1() {
    const start = performance.now();
    const p = await this.dataSource.getRepository(Position).find({
      relations: [
        'facility',
        'configurations',
        'configurations.layouts',
        'configurations.layouts.button',
      ],
    });

    console.log('all postions', performance.now() - start);

    return p;
  }

  async findAllPositions(facility: string) {
    const f = await this.dataSource.getRepository(Facility).findOne({
      where: { id: facility },
      relations: {
        positions: true,
      },
    });
    if (!f) throw new BadRequestException();

    return f.positions;
  }

  async findPositionById(positionId: string): Promise<Position | null> {
    const retval = await this.dataSource.getRepository(Position).findOne({
      where: { id: positionId },
      relations: ['facility', 'facility.parentFacility', 'configurations'],
    });

    return retval;
  }

  async findPositionByCallsignPrefix(
    callsign: string,
  ): Promise<Position | null> {
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

      return retval;
    }
    return null;
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
    positionId: string,
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

  async deletePosition(positionId: string): Promise<UpdateResult> {
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

  async findPositionConfigurationById(configId: string) {
    const retval = await this.dataSource
      .getRepository(PositionConfiguration)
      .findOne({
        where: { id: configId },
        relations: ['positions', 'layouts', 'layouts.button'],
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
    configId: string,
    config: PositionConfigurationDto,
  ) {
    // const buttons = [...config.buttons];
    // const { name, id, positions } = config;
    // const configuration = {
    //   name,
    //   id,
    //   positions,
    // };
    const pc = new PositionConfiguration();
    Object.assign(pc, config);
    pc.id = configId;
    // for (let i = 0; i < buttons.length; i++) {
    //   const layout = new ConfigurationLayout();
    //   layout.button = buttons[i];
    //   layout.order = i;
    //   layout.configuration = pc;
    //   await this.saveConfigurationLayout(layout);
    // }

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

  async deletePositionConfiguration(configId: string) {
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
  async createButton(button: Button, configurationId: string) {
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
    const approvedFacilities = await this.findVisibleFacilities(parseInt(cid));

    const facilities = approvedFacilities.map((f) => f.id);

    const buttons = await this.dataSource.getRepository(Button).find({
      where: {
        facility: {
          id: In(facilities),
        },
      },
    });

    // Add a none button for every facility
    const noneButton = new Button();
    noneButton.shortName = 'NONE';
    noneButton.longName = 'NONE';
    noneButton.target = 'NONE';
    noneButton.type = ButtonType.NONE;
    noneButton.layouts = [];
    noneButton.id = '00000000-0000-0000-0000-000000000000';

    return [
      noneButton,
      ...buttons.sort((a, b) => ('' + a.target).localeCompare(b.target)),
    ];
  }

  async findButtonById(buttonId: string) {
    const retval = await this.dataSource
      .getRepository(Button)
      .findOne({ where: { id: buttonId }, relations: ['configurations'] });

    return retval;
  }

  async updateButton(buttonId: string, button: Button) {
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

  async deleteButton(buttonId: string) {
    const retval = await this.dataSource
      .getRepository(Button)
      .softDelete(buttonId);

    return retval;
  }
  //#endregion

  //#region Authorization checks
  async isEditorOfFacility(cid: number, facilityId: string): Promise<boolean> {
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
          return true;
        } else {
          fac = fac.parentFacility;
        }
      }

      this.logger.log(
        `${cid} is not an editor of ${facilityId} or its parents.`,
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
    const position = await this.findPositionById(positionId);
    if (!position) throw new NotFoundException();
    const retval = await this.isEditorOfFacility(cid, position.facility.id);

    return retval;
  }

  async isEditorOfConfiguration(
    cid: number,
    configuration: string,
  ): Promise<boolean> {
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
