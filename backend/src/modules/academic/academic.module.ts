import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';

@Module({
  controllers: [ModulesController, ClassesController, AssessmentsController],
  providers: [ModulesService, ClassesService, AssessmentsService],
  exports: [ModulesService, ClassesService, AssessmentsService],
})
export class AcademicModule {}
