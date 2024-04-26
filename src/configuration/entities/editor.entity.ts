import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Facility } from './facility.entity';

@Entity({ name: 'editors' })
@Index('facility_editor-idx', ['cid', 'facility.id'], { unique: true })
export class Editor {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'cid' })
  @Index('cid-idx')
  @IsNotEmpty()
  @IsNumber()
  @Min(800000)
  cid!: number;

  @ManyToOne(() => Facility, (facility: Facility) => facility.editors, {
    onDelete: 'CASCADE',
  })
  facility!: Facility;

  @Column({ name: 'added_by' })
  @IsNotEmpty()
  @IsNumber()
  @Min(800000)
  addedBy!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
