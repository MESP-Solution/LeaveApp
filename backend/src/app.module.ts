import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { StaffsModule } from './staffs/staffs.module';
// import { LeaveRequestsModule } from './leave-requests/leave-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    StaffsModule,
    // LeaveRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
