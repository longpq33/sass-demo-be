import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';

type RequestWithUser = Request & { user?: JwtPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithUser | undefined>();

    return request?.user ?? null;
  },
);
