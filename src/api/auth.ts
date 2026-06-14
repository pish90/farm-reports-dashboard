import client from './client';
import type { AuthUser } from '../types';

interface AuthResponse {
  token: string;
  userId: number;
  farmId: number | null;
  farmName: string | null;
  userName: string;
  mustChangePassword: boolean;
}

export async function login(email: string, password: string): Promise<string> {
  const res = await client.post<AuthResponse>('/auth/login', { email, password });
  return res.data.token;
}

export function decodeUser(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    userId: payload.userId,
    farmId: payload.farmId,
    farmName: payload.farmName,
    userName: payload.userName,
    role: payload.role,
  };
}

export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
