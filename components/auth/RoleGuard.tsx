"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  notAllowedRoles?: UserRole[];
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user has an allowed role.
 * Useful for hiding buttons/links that require specific roles.
 */
export function RoleGuard({
  children,
  allowedRoles,
  notAllowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { user, isCheckingAuth } = useAuth();

  if (isCheckingAuth) return null;

  if (!user || !user.role) {
    return <>{fallback}</>;
  }

  const role = user.role as UserRole;

  if (notAllowedRoles && notAllowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
