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
@Index('facility_editor-idx', ['cid', 'facility.facilityId'], { unique: true })
export class Editor {
  @PrimaryGeneratedColumn('identity', {
    name: 'id',
    generatedIdentity: 'BY DEFAULT',
  })
  id: number;

  @Column({ name: 'cid' })
  @Index('cid-idx')
  @IsNotEmpty()
  @IsNumber()
  @Min(800000)
  cid!: number;

  @ManyToOne(() => Facility, (facility: Facility) => facility.editors, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
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
