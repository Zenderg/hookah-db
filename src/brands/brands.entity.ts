import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  @Index('idx_brands_slug')
  slug: string;

  @Column()
  country: string;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  logoUrl: string;

  @Column()
  @Index('idx_brands_status')
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
