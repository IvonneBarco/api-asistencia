import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Session } from './session.entity';
import { User } from './user.entity';

export enum SaintName {
  ROSA_MISTICA = 'Rosa Mística',
  MEDALLA_MILAGROSA = 'Medalla Milagrosa',
  SAGRADO_CORAZON = 'Sagrado Corazón',
}

@Entity('saint_loans')
@Unique('UQ_saint_loans_session_saint', ['sessionId', 'saint'])
@Unique('UQ_saint_loans_session_user', ['sessionId', 'userId'])
export class SaintLoan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.saintLoans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.saintLoans, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: SaintName })
  saint: SaintName;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}