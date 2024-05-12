import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ButtonType } from '../enums';
import { ConfigurationLayout } from './configuration-layout.entity';
import { Facility } from './facility.entity';

@Entity({ name: 'button' })
export class Button {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id: number;

  @Column({ name: 'short_name', length: 4 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(4)
  @MinLength(1)
  shortName!: string;

  @Column({ name: 'long_name', length: 6, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  longName?: string;

  @Column({ name: 'target' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  target!: string;

  @Column({
    type: 'enum',
    enum: [
      ButtonType.SHOUT,
      ButtonType.OVERRIDE,
      ButtonType.INTERCOM,
      ButtonType.RING,
      ButtonType.NONE,
      ButtonType.CONVERTED_SHOUT,
    ],
    // enum: ['SHOUT', 'OVERRIDE', 'INTERCOM', 'RING', 'NONE', 'CONVERTED_SHOUT'],
  })
  type: ButtonType;

  @Column({ name: 'dial_code', width: 3, nullable: true })
  @IsOptional()
  @IsNumberString()
  @MinLength(3)
  @MaxLength(3)
  dialCode?: number;

  @OneToMany(
    () => ConfigurationLayout,
    (layout: ConfigurationLayout) => layout.button,
    {
      onDelete: 'CASCADE',
    },
  )
  layouts: ConfigurationLayout[];

  @ManyToOne(() => Facility, (facility: Facility) => facility.buttons, {
    onDelete: 'SET NULL',
  })
  facility: Facility;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt?: Date;
}
