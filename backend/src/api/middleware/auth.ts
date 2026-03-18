// 认证中间件

import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../../services/database';
import { ErrorCode, ErrorResponse } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuthMiddleware');

export interface AuthenticatedRequest extends Request {
  agent?: {
    id: string;
    agent_id: string;
    agent_name: string;
  };
}

/**
 * API Key 认证中间件
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    const error: ErrorResponse = {
      success: false,
      error: 'Missing or invalid Authorization header',
      error_code: ErrorCode.AUTH_FAILED,
    };
    res.status(401).json(error);
    return;
  }

  const apiKey = authHeader.substring(7);

  try {
    const db = getDatabase();
    const agent = await db.agent.findUnique({
      where: { api_key: apiKey },
      select: {
        id: true,
        agent_id: true,
        agent_name: true,
        status: true,
      },
    });

    if (!agent) {
      const error: ErrorResponse = {
        success: false,
        error: 'Invalid API key',
        error_code: ErrorCode.INVALID_API_KEY,
      };
      res.status(401).json(error);
      return;
    }

    if (agent.status === 'offline') {
      // 自动更新为在线状态
      await db.agent.update({
        where: { id: agent.id },
        data: { status: 'online', last_ping: new Date() },
      });
    }

    req.agent = {
      id: agent.id,
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Authentication failed',
      error_code: ErrorCode.INTERNAL_ERROR,
    };
    res.status(500).json(errorResponse);
  }
}

/**
 * 可选的 API Key 认证（允许未认证访问）
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const apiKey = authHeader.substring(7);

  try {
    const db = getDatabase();
    const agent = await db.agent.findUnique({
      where: { api_key: apiKey },
      select: {
        id: true,
        agent_id: true,
        agent_name: true,
      },
    });

    if (agent) {
      req.agent = {
        id: agent.id,
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
      };
    }
  } catch (error) {
    logger.error('Optional authentication error', error);
  }

  next();
}
