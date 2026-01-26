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
  nameRu: string;

  @Column()
  nameEn: string;

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

  @Column({ default: 0 })
  reviewsCount: number;

  @Column({ default: 0 })
  views: number;

  @Column()
  category: string;

  @Column({ nullable: true })
  year: number;

  @Column()
  country: string;

  @Column({ nullable: true })
  strengthOfficial: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  strengthUser: number;

  @Column({ nullable: true })
  tier: string;

  @Column('simple-array', { nullable: true })
  flavorDescriptors: string[];

  @Column({ nullable: true })
  productionStatus: string;

  @Column({ unique: true })
  htreviewsId: string;

  @Column()
  dateAdded: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
