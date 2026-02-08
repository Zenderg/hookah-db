import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { Flavor } from '../flavors/flavors.entity';

@Entity('tobaccos')
export class Tobacco {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

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
  strengthOfficial: string;

  @Column()
  strengthByRatings: string;

  @Column()
  status: string;

  @Column({ unique: true })
  htreviewsId: string;

  @Column()
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Flavor, (flavor) => flavor.tobaccos)
  @JoinTable({
    name: 'tobacco_flavors',
    joinColumn: { name: 'tobaccoId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'flavorId', referencedColumnName: 'id' },
  })
  flavors: Flavor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
