import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { GroupAssignmentAudit } from '../entities/group-assignment-audit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, User, GroupAssignmentAudit])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
