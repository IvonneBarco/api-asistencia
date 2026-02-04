import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { GroupAssignmentAudit } from '../entities/group-assignment-audit.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(GroupAssignmentAudit)
    private auditRepository: Repository<GroupAssignmentAudit>,
    private dataSource: DataSource,
  ) {}

  /**
   * Obtiene todos los grupos activos con conteo de miembros
   */
  async getAllActiveGroups() {
    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoin('group.users', 'user')
      .select([
        'group.id',
        'group.name',
        'group.isActive',
        'group.createdAt',
      ])
      .addSelect('COUNT(user.id)', 'memberCount')
      .where('group.isActive = :isActive', { isActive: true })
      .groupBy('group.id')
      .getRawAndEntities();

    return groups.entities.map((group, index) => ({
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      createdAt: group.createdAt,
      memberCount: parseInt(groups.raw[index].memberCount) || 0,
    }));
  }

  /**
   * Permite a un usuario unirse a un grupo (SOLO UNA VEZ)
   * Usa transacción y SELECT FOR UPDATE para evitar condiciones de carrera
   */
  async joinGroup(userId: string, groupId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // Bloquear fila del usuario para evitar doble asignación
      const user = await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar si el usuario ya tiene un grupo asignado
      if (user.groupId) {
        throw new ConflictException(
          'Ya perteneces a un grupo. No puedes cambiarlo. Contacta a un administrador si necesitas ayuda.',
        );
      }

      // Verificar que el grupo existe y está activo
      const group = await manager.findOne(Group, {
        where: { id: groupId, isActive: true },
      });

      if (!group) {
        throw new BadRequestException(
          'El grupo no existe o no está disponible',
        );
      }

      // Asignar grupo al usuario
      user.groupId = groupId;
      await manager.save(User, user);

      // Registrar auditoría
      const audit = manager.create(GroupAssignmentAudit, {
        userId: user.id,
        previousGroupId: null,
        newGroupId: groupId,
        changedByUserId: user.id, // El usuario se asignó a sí mismo
        reason: 'Usuario se unió al grupo por primera vez',
      });
      await manager.save(GroupAssignmentAudit, audit);

      return {
        success: true,
        message: `Te has unido exitosamente a ${group.name}`,
        group: {
          id: group.id,
          name: group.name,
        },
      };
    });
  }

  /**
   * Permite a un ADMIN cambiar el grupo de un usuario
   * Puede reasignar aunque el usuario ya tenga grupo
   */
  async assignGroupByAdmin(
    userId: string,
    groupId: string,
    adminUserId: string,
    reason?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      // Verificar que el usuario existe
      const user = await manager.findOne(User, { where: { id: userId } });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar que el grupo existe y está activo
      const group = await manager.findOne(Group, {
        where: { id: groupId, isActive: true },
      });

      if (!group) {
        throw new BadRequestException(
          'El grupo no existe o no está disponible',
        );
      }

      // Guardar grupo anterior para auditoría
      const previousGroupId = user.groupId;

      // Asignar nuevo grupo
      user.groupId = groupId;
      await manager.save(User, user);

      // Registrar auditoría
      const audit = manager.create(GroupAssignmentAudit, {
        userId: user.id,
        previousGroupId,
        newGroupId: groupId,
        changedByUserId: adminUserId,
        reason: reason || 'Cambio realizado por administrador',
      });
      await manager.save(GroupAssignmentAudit, audit);

      return {
        success: true,
        message: `Grupo actualizado exitosamente para ${user.name}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        group: {
          id: group.id,
          name: group.name,
        },
        previousGroupId,
      };
    });
  }

  /**
   * Permite a un ADMIN quitar a un usuario de su grupo
   * Establece groupId en null y registra auditoría
   */
  async removeUserFromGroup(
    userId: string,
    adminUserId: string,
    reason?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      // Verificar que el usuario existe
      const user = await manager.findOne(User, { where: { id: userId } });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar que el usuario tenga un grupo asignado
      if (!user.groupId) {
        throw new BadRequestException(
          'El usuario no pertenece a ningún grupo',
        );
      }

      // Guardar grupo anterior para auditoría
      const previousGroupId = user.groupId;

      // Quitar del grupo
      user.groupId = null;
      await manager.save(User, user);

      // Registrar auditoría
      const audit = manager.create(GroupAssignmentAudit, {
        userId: user.id,
        previousGroupId,
        newGroupId: null,
        changedByUserId: adminUserId,
        reason: reason || 'Usuario removido del grupo por administrador',
      });
      await manager.save(GroupAssignmentAudit, audit);

      return {
        success: true,
        message: `${user.name} ha sido removido del grupo exitosamente`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        previousGroupId,
      };
    });
  }

  /**
   * Obtiene el grupo actual de un usuario
   */
  async getUserGroup(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['group'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.group) {
      return {
        hasGroup: false,
        message: 'No perteneces a ningún grupo',
      };
    }

    return {
      hasGroup: true,
      group: {
        id: user.group.id,
        name: user.group.name,
        isActive: user.group.isActive,
      },
    };
  }

  /**
   * Obtiene historial de cambios de grupo de un usuario (admin only)
   */
  async getUserGroupHistory(userId: string) {
    const audits = await this.auditRepository.find({
      where: { userId },
      relations: ['previousGroup', 'newGroup', 'changedBy'],
      order: { createdAt: 'DESC' },
    });

    return audits.map((audit) => ({
      id: audit.id,
      previousGroup: audit.previousGroup
        ? {
            id: audit.previousGroup.id,
            name: audit.previousGroup.name,
          }
        : null,
      newGroup: audit.newGroup
        ? {
            id: audit.newGroup.id,
            name: audit.newGroup.name,
          }
        : null,
      changedBy: {
        id: audit.changedBy.id,
        name: audit.changedBy.name,
        email: audit.changedBy.email,
      },
      reason: audit.reason,
      createdAt: audit.createdAt,
    }));
  }

  /**
   * Crea un nuevo grupo (admin only)
   */
  async createGroup(name: string, isActive: boolean = true) {
    // Verificar que no exista un grupo con ese nombre
    const existing = await this.groupRepository.findOne({ where: { name } });

    if (existing) {
      throw new ConflictException('Ya existe un grupo con ese nombre');
    }

    const group = this.groupRepository.create({
      name,
      isActive,
    });

    await this.groupRepository.save(group);

    return {
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      createdAt: group.createdAt,
    };
  }

  /**
   * Actualiza un grupo (admin only)
   */
  async updateGroup(
    groupId: string,
    data: { name?: string; isActive?: boolean },
  ) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Si se está cambiando el nombre, verificar que no exista otro grupo con ese nombre
    if (data.name && data.name !== group.name) {
      const existing = await this.groupRepository.findOne({
        where: { name: data.name },
      });

      if (existing) {
        throw new ConflictException('Ya existe un grupo con ese nombre');
      }

      group.name = data.name;
    }

    if (data.isActive !== undefined) {
      group.isActive = data.isActive;
    }

    await this.groupRepository.save(group);

    return {
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Desactiva un grupo (admin only)
   * No elimina físicamente para mantener integridad referencial
   */
  async deactivateGroup(groupId: string) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    group.isActive = false;
    await this.groupRepository.save(group);

    return {
      success: true,
      message: `Grupo "${group.name}" desactivado exitosamente`,
    };
  }

  /**
   * Obtiene todos los grupos (incluyendo inactivos) con sus usuarios - admin only
   */
  async getAllGroups() {
    const groups = await this.groupRepository.find({
      relations: ['users'],
      order: {
        createdAt: 'ASC',
      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group.users?.length || 0,
      users: group.users?.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        identification: user.identification,
        flowers: user.flowers,
        role: user.role,
      })) || [],
    }));
  }
}
