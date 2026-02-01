import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('attendances')
@Unique(['user', 'session'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.attendances, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Session, (session) => session.attendances, {
    nullable: false,
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt: Date;

  @Column({ name: 'raw_qr', type: 'text' })
  rawQr: string;
}
