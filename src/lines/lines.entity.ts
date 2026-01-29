import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Brand } from '../brands/brands.entity';

@Entity('lines')
export class Line {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  @Index('idx_lines_slug')
  slug: string;

  @Column()
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column({ nullable: true })
  strengthOfficial: string;

  @Column({ nullable: true })
  strengthByRatings: string;

  @Column({ nullable: true })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
