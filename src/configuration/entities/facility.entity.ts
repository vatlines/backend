import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  Tree,
  TreeChildren,
  TreeParent,
  UpdateDateColumn,
} from 'typeorm';
import { Button } from './button.entity';
import { Editor } from './editor.entity';
import { Position } from './position.entity';

@Entity({ name: 'facility' })
@Tree('nested-set')
export class Facility {
  @PrimaryColumn({ name: 'id', length: 4 })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(4)
  @Matches(/[A-Z]+/)
  id: string;

  @TreeParent({ onDelete: 'CASCADE' })
  parentFacility: Facility;

  @TreeChildren()
  childFacilities: Facility[];

  @OneToMany(() => Position, (position: Position) => position.facility, {
    onDelete: 'CASCADE',
    eager: true,
  })
  positions: Position[];

  @OneToMany(() => Editor, (editor: Editor) => editor.facility, {
    onDelete: 'CASCADE',
    eager: true,
  })
  editors: Editor[];

  @OneToMany(() => Button, (button: Button) => button.facility, {
    onDelete: 'CASCADE',
  })
  buttons: Button[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt?: Date;
}
