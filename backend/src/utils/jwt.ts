import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { RefreshToken } from '../models/RefreshToken.model';
import { ApiError } from './ApiError';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const saveRefreshToken = async (
  userId: string,
  token: string
): Promise<void> => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
  });
};

export const verifyRefreshToken = async (
  token: string
): Promise<string | null> => {
  const tokenHash = hashToken(token);

  const refreshToken = await RefreshToken.findOne({
    tokenHash,
    isValid: true,
    expiresAt: { $gt: new Date() },
  });

  if (!refreshToken) {
    return null;
  }

  return refreshToken.user.toString();
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const tokenHash = hashToken(token);

  await RefreshToken.updateOne({ tokenHash }, { isValid: false });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await RefreshToken.updateMany({ user: userId }, { isValid: false });
};
