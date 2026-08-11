import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// Global: nearly every feature module needs to write audit entries (database-design.md §7).
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
