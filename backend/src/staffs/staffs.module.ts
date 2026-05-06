import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';

@Module({
  imports: [MikroOrmModule.forFeature([Staff, Role])],
  controllers: [StaffsController],
  providers: [StaffsService],
  exports: [StaffsService],
})
export class StaffsModule {}
