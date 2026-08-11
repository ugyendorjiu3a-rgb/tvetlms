import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { AdminUpdateTraineeDto, UpdateOwnProfileDto } from './dto/update-profile.dto';

// Implements PRD §5.1 (no self-registration — Admin-provisioned only) and the "Eradicate Trainee"
// safeguard from PRD FR6 / database-design.md §9 / ui-ux-flow.md §4.4.
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------
  // Provisioning (Admin only, enforced at the controller via @Roles)
  // ---------------------------------------------------------------------

  async createTrainee(dto: CreateTraineeDto, actor: AuthenticatedUser) {
    await this.assertLoginIdAvailable(dto.loginId);
    const tempPassword = generateTempPassword();
    const passwordHash = await AuthService.hashPassword(tempPassword);

    const traineeRole = await this.prisma.role.findUniqueOrThrow({ where: { name: ROLE.TRAINEE } });

    const user = await this.prisma.user.create({
      data: {
        institutionId: dto.institutionId,
        loginId: dto.loginId,
        email: dto.email,
        passwordHash,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        userRoles: { create: { roleId: traineeRole.id, assignedBy: actor.userId } },
        traineeProfile: {
          create: {
            fullName: dto.fullName,
            citizenshipId: dto.citizenshipId,
            contactNumber: dto.contactNumber,
            tradeId: dto.tradeId,
            enrollmentDate: new Date(dto.enrollmentDate),
            profilePhotoUrl: dto.profilePhotoUrl,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        },
      },
      include: { traineeProfile: true },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      institutionId: user.institutionId,
      afterValue: { loginId: user.loginId, role: ROLE.TRAINEE },
    });

    return { user: this.toSafeUser(user), tempPassword };
  }

  async createTrainer(dto: CreateTrainerDto, actor: AuthenticatedUser) {
    await this.assertLoginIdAvailable(dto.loginId);
    const tempPassword = generateTempPassword();
    const passwordHash = await AuthService.hashPassword(tempPassword);

    const trainerRole = await this.prisma.role.findUniqueOrThrow({ where: { name: ROLE.TRAINER } });

    const user = await this.prisma.user.create({
      data: {
        institutionId: dto.institutionId,
        loginId: dto.loginId,
        email: dto.email,
        passwordHash,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        userRoles: { create: { roleId: trainerRole.id, assignedBy: actor.userId } },
        trainerProfile: {
          create: {
            fullName: dto.fullName,
            staffId: dto.staffId,
            specialization: dto.specialization,
            contactNumber: dto.contactNumber,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        },
      },
      include: { trainerProfile: true },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      institutionId: user.institutionId,
      afterValue: { loginId: user.loginId, role: ROLE.TRAINER },
    });

    return { user: this.toSafeUser(user), tempPassword };
  }

  async createStaff(dto: CreateStaffDto, actor: AuthenticatedUser) {
    await this.assertLoginIdAvailable(dto.loginId);
    const tempPassword = generateTempPassword();
    const passwordHash = await AuthService.hashPassword(tempPassword);

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });

    const user = await this.prisma.user.create({
      data: {
        institutionId: dto.institutionId,
        loginId: dto.loginId,
        email: dto.email,
        passwordHash,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        userRoles: { create: { roleId: role.id, assignedBy: actor.userId } },
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      institutionId: user.institutionId,
      afterValue: { loginId: user.loginId, role: dto.role },
    });

    return { user: this.toSafeUser(user), tempPassword };
  }

  private async assertLoginIdAvailable(loginId: string) {
    const existing = await this.prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      throw new ConflictException(`Login ID '${loginId}' is already in use`);
    }
  }

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        traineeProfile: true,
        trainerProfile: true,
        institution: true,
      },
    });
    return this.toSafeUser(user);
  }

  async listUsers(institutionId?: string) {
    const users = await this.prisma.user.findMany({
      where: institutionId ? { institutionId } : undefined,
      include: { userRoles: { include: { role: true } }, traineeProfile: true, trainerProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toSafeUser(u));
  }

  // ---------------------------------------------------------------------
  // Profile edits (edit-accessibility matrix — PRD §5.1)
  // ---------------------------------------------------------------------

  async updateOwnProfile(actor: AuthenticatedUser, dto: UpdateOwnProfileDto) {
    if (dto.email) {
      await this.prisma.user.update({ where: { id: actor.userId }, data: { email: dto.email } });
    }

    if (actor.traineeId) {
      return this.prisma.traineeProfile.update({
        where: { userId: actor.traineeId },
        data: {
          contactNumber: dto.contactNumber,
          profilePhotoUrl: dto.profilePhotoUrl,
          updatedBy: actor.userId,
        },
      });
    }

    if (actor.trainerId) {
      return this.prisma.trainerProfile.update({
        where: { userId: actor.trainerId },
        data: { contactNumber: dto.contactNumber, updatedBy: actor.userId },
      });
    }

    throw new BadRequestException('No editable profile found for this account');
  }

  async adminUpdateTrainee(traineeId: string, dto: AdminUpdateTraineeDto, actor: AuthenticatedUser) {
    const before = await this.prisma.traineeProfile.findUniqueOrThrow({ where: { userId: traineeId } });

    const updated = await this.prisma.traineeProfile.update({
      where: { userId: traineeId },
      data: {
        fullName: dto.fullName,
        citizenshipId: dto.citizenshipId,
        contactNumber: dto.contactNumber,
        profilePhotoUrl: dto.profilePhotoUrl,
        tradeId: dto.tradeId,
        enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : undefined,
        status: dto.status,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'trainee_profile.update',
      entityType: 'trainee_profile',
      entityId: traineeId,
      beforeValue: before,
      afterValue: updated,
    });

    return updated;
  }

  // ---------------------------------------------------------------------
  // Eradicate Trainee workflow — PRD FR6 / database-design.md §9 / ui-ux-flow.md §4.4
  // Two-step, explicitly confirmable, pre-action-notified, never a hard delete.
  // ---------------------------------------------------------------------

  async requestEradication(traineeId: string, reason: string | undefined, actor: AuthenticatedUser) {
    const trainee = await this.prisma.traineeProfile.findUniqueOrThrow({ where: { userId: traineeId } });

    if (trainee.status !== 'completed') {
      throw new BadRequestException(
        'This trainee has not completed their course yet — eradication is only available for completed trainees.',
      );
    }

    const request = await this.prisma.eradicationRequest.create({
      data: { traineeId, requestedBy: actor.userId, reason, status: 'pending_confirmation' },
    });

    // PRD FR6: "Notify Admin before the action" — a deliberate pause before this becomes reversible-only-by-audit-trail.
    await this.notifications.create({
      type: 'general',
      title: 'Confirm trainee record eradication',
      body: `You requested to eradicate the personal record for trainee ${trainee.fullName} (${traineeId}). This will remove Citizenship ID, contact info, and profile photo. Confirm to proceed.`,
      relatedEntityType: 'eradication_request',
      relatedEntityId: request.id,
      priority: 'high',
      recipientUserIds: [actor.userId],
      createdBy: actor.userId,
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'trainee.eradicate.request',
      entityType: 'eradication_request',
      entityId: request.id,
      afterValue: request,
    });

    return request;
  }

  async confirmEradication(eradicationRequestId: string, actor: AuthenticatedUser) {
    const request = await this.prisma.eradicationRequest.findUniqueOrThrow({
      where: { id: eradicationRequestId },
    });

    if (request.status !== 'pending_confirmation') {
      throw new BadRequestException(`This request is already '${request.status}'`);
    }

    const before = await this.prisma.traineeProfile.findUniqueOrThrow({ where: { userId: request.traineeId } });

    const [updatedProfile] = await this.prisma.$transaction([
      this.prisma.traineeProfile.update({
        where: { userId: request.traineeId },
        data: {
          citizenshipId: `REDACTED-${request.traineeId}`, // citizenship_id is UNIQUE NOT NULL — a placeholder preserves the constraint while redacting the real value
          contactNumber: null,
          profilePhotoUrl: null,
          status: 'eradicated',
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
      }),
      this.prisma.user.update({
        where: { id: request.traineeId },
        data: { status: 'deactivated', updatedBy: actor.userId },
      }),
      this.prisma.eradicationRequest.update({
        where: { id: eradicationRequestId },
        data: { status: 'confirmed', confirmedBy: actor.userId, confirmedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      actorId: actor.userId,
      action: 'trainee.eradicate.confirm',
      entityType: 'trainee_profile',
      entityId: request.traineeId,
      beforeValue: before,
      afterValue: updatedProfile,
    });

    return updatedProfile;
  }

  // ---------------------------------------------------------------------
  private toSafeUser<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

function generateTempPassword(): string {
  // Admin hands this to the trainee/trainer once via the credential portal (PRD FR1); never
  // logged or stored anywhere except as this run's return value and the argon2 hash on the user row.
  return crypto.randomBytes(9).toString('base64url');
}
