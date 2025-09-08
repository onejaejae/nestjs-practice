import { Entity, Column } from 'typeorm';
import { UuidEntity } from 'src/core/database/typeorm/base.entity';
import { Role } from './user.interface';

@Entity('user')
export class User extends UuidEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: Role.USER,
  })
  role: Role;

  @Column({ type: 'int', default: 0 })
  score: number;
}
