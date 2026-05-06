import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ApiSuccessResponse } from './common/swagger/api-response.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiSuccessResponse({
    description: 'API health status',
    status: 200,
    type: HealthResponseDto,
  })
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
