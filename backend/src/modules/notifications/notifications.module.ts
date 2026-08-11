import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

// Global: Users (eradication), Submissions/Grading, Results, and Resources modules all trigger
// notifications (PRD §15) and would otherwise each need to import this module individually.
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
