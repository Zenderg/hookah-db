import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';

@Entity('tobaccos')
export class Tobacco {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ nullable: true })
  lineId: string;

  @ManyToOne(() => Line, { nullable: true })
  @JoinColumn({ name: 'lineId' })
  line: Line;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column()
  country: string;

  @Column({ nullable: true })
  strengthOfficial: string;

  @Column({ nullable: true })
  strengthByRatings: string;

  @Column({ nullable: true })
  status: string;

  @Column({ unique: true })
  htreviewsId: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
