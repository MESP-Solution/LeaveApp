import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { SuccessResponseDto } from '../dto/success-response.dto';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseDto<T>> {
    const request = context.switchToHttp().getRequest<{ url: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: response.statusCode,
        message: 'Request successful',
        timestamp: new Date().toISOString(),
        path: request.url,
        data,
      })),
    );
  }
}
