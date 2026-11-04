import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Attendance } from './attendance.entity';
import { SaintLoan } from './saint-loan.entity';
import { AttendancePeriod } from './attendance-period.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', unique: true })
  sessionId: string;

  @Column()
  name: string;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamp' })
  endsAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'session_pin', type: 'varchar', length: 4, nullable: true })
  sessionPin: string;

  @ManyToOne(() => AttendancePeriod, (period) => period.sessions, { nullable: false })
  @JoinColumn({ name: 'period_id' })
  period: AttendancePeriod;

  @OneToMany(() => Attendance, (attendance) => attendance.session)
  attendances: Attendance[];

  @OneToMany(() => SaintLoan, (saintLoan) => saintLoan.session)
  saintLoans: SaintLoan[];
}
