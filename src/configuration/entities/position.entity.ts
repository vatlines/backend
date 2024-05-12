import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PanelType } from '../enums';
import { Facility } from './facility.entity';
import { PositionConfiguration } from './position-configuration.entity';

@Entity({ name: 'position' })
@Index('position-name_facility-idx', ['name', 'facility.id'], { unique: true })
export class Position {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id: number;

  @Column({ name: 'name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @Column({ name: 'sector' })
  @IsNotEmpty()
  @IsString()
  @Matches(/[A-Z0-9]+/)
  sector: string;

  @ManyToOne(() => Facility, (facility: Facility) => facility.positions, {
    onDelete: 'RESTRICT',
  })
  facility!: Facility;

  @Column({ name: 'dial_code', width: 3, nullable: true })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  @IsNumberString()
  @IsOptional()
  dialCode?: string;

  @Column({ type: 'enum', enum: ['RDVS', 'VSCS'] })
  @IsNotEmpty()
  @IsEnum(PanelType)
  panelType!: PanelType;

  @Column({ name: 'callsign' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @Matches(/[A-Z_]+/)
  callsign!: string;

  @Column({ name: 'frequency' })
  @Index()
  @IsNotEmpty()
  @IsNumber()
  @Min(118000)
  @Max(136975)
  frequency!: number;

  @ManyToMany(
    () => PositionConfiguration,
    (configs: PositionConfiguration) => configs.positions,
    {},
  )
  configurations: PositionConfiguration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt?: Date;
}
