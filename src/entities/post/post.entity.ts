import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UuidEntity } from 'src/core/database/typeorm/base.entity';
import { User } from '../user/user.entity';

@Entity('post')
export class Post extends UuidEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  User: User;
}