import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  AfterLoad,
} from 'typeorm';
import { buildLineHtreviewsUrl } from '../common/utils/htreviews-url';
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

  @Column()
  imageUrl: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column()
  strengthOfficial: string;

  @Column()
  strengthByRatings: string;

  @Column()
  status: string;

  htreviewsUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @AfterLoad()
  computeHtreviewsUrl() {
    if (this.brand?.slug) {
      this.htreviewsUrl = buildLineHtreviewsUrl(this.brand.slug, this.slug);
    }
  }
}
