import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('attendance_periods')
export class AttendancePeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'starts_at', type: 'date' })
  startsAt: string;

  @Column({ name: 'ends_at', type: 'date' })
  endsAt: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Session, (session) => session.period)
  sessions: Session[];
}
