import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Button } from './button.entity';
import { PositionConfiguration } from './position-configuration.entity';

@Entity('configuration-layout')
@Index('order_configuration-idx', ['order', 'configuration.id'], {
  unique: true,
})
export class ConfigurationLayout {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id: number;

  @Column({ name: 'order' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(540)
  order!: number;

  @ManyToOne(
    () => PositionConfiguration,
    (config: PositionConfiguration) => config.layouts,
    {
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
  )
  configuration: PositionConfiguration;

  @ManyToOne(() => Button, (button: Button) => button.layouts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  button: Button;
}
