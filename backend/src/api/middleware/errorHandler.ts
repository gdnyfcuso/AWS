// 错误处理中间件

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, ErrorResponse } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ErrorHandler');

export interface ApiError extends Error {
  statusCode?: number;
  errorCode?: ErrorCode;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('API error', err);

  // Prisma 错误
  if (err.code?.startsWith('P')) {
    const error: ErrorResponse = {
      success: false,
      error: 'Database error',
      error_code: ErrorCode.INTERNAL_ERROR,
    };
    res.status(500).json(error);
    return;
  }

  // Zod 验证错误
  if (err instanceof ZodError) {
    const error: ErrorResponse = {
      success: false,
      error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
      error_code: ErrorCode.INVALID_ACTION,
    };
    res.status(400).json(error);
    return;
  }

  // 自定义错误
  const statusCode = err.statusCode || 500;
  const errorResponse: ErrorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    error_code: err.errorCode || ErrorCode.INTERNAL_ERROR,
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 处理
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error: ErrorResponse = {
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    error_code: ErrorCode.INVALID_ACTION,
  };
  res.status(404).json(error);
}
