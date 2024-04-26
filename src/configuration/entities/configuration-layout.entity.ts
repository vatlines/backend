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
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

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
    },
  )
  configuration: PositionConfiguration;

  @ManyToOne(() => Button, (button: Button) => button.layouts)
  button: Button;
}
