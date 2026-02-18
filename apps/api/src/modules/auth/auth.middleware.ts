import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from './interfaces/user.interface';

const VALID_ROLES: UserRole[] = ['admin', 'doctor', 'patient'];

/**
 * Simulated authentication middleware.
 *
 * Extracts user identity from request headers:
 * - `x-user-id`: UUID of the user
 * - `x-user-role`: one of 'admin' | 'doctor' | 'patient'
 *
 * In production, this would be replaced by a JWT verification middleware
 * that decodes the token and attaches the user to the request.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction) {
        const userId = req.headers['x-user-id'] as string | undefined;
        const userRole = req.headers['x-user-role'] as string | undefined;

        if (!userId || !userRole) {
            throw new UnauthorizedException(
                'Missing authentication headers: x-user-id and x-user-role are required',
            );
        }

        if (!VALID_ROLES.includes(userRole as UserRole)) {
            throw new UnauthorizedException(
                `Invalid role: "${userRole}". Must be one of: ${VALID_ROLES.join(', ')}`,
            );
        }

        // Attach simulated user to request — compatible with passport's User type
        (req as any).user = {
            id: userId,
            role: userRole as UserRole,
        };

        next();
    }
}
