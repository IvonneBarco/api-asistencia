import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';

@Entity('group_assignment_audits')
export class GroupAssignmentAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'previous_group_id', nullable: true })
  previousGroupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'previous_group_id' })
  previousGroup: Group;

  @Column({ name: 'new_group_id', nullable: true })
  newGroupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'new_group_id' })
  newGroup: Group;

  @Column({ name: 'changed_by_user_id' })
  changedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy: User;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
