import { IsNotEmpty, IsString } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Button } from './button.entity';
import { ConfigurationLayout } from './configuration-layout.entity';
import { Position } from './position.entity';

@Entity({ name: 'position_configuration' })
export class PositionConfiguration {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id: number;

  @Column({ name: 'name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ManyToMany(() => Position, (position: Position) => position.configurations, {
    eager: true,
  })
  @JoinTable({ name: 'position_configurations_positions' })
  positions: Position[];

  @OneToMany(
    () => ConfigurationLayout,
    (layout: ConfigurationLayout) => layout.configuration,
    {
      onDelete: 'CASCADE',
      eager: true,
    },
  )
  layouts: ConfigurationLayout[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt?: Date;
}

export interface PositionConfigurationDto {
  name: string;
  positions: Position[];
  buttons: Button[];
  layouts: ConfigurationLayout[];
}
