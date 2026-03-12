export const ADMIN_ROUTES = {
  ROOT: "/",
  EXPERIMENT_MANUAL: "/experiment-manual",
  EXPERIMENT_DATA: "/experiment-data",
  USER_MANAGEMENT: "/user-management",
  CLASS_MANAGEMENT: "/class-management",
} as const;

export const ADMIN_DEFAULT_ROUTE = ADMIN_ROUTES.EXPERIMENT_DATA;
