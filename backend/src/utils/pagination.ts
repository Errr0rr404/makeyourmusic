/**
 * Utility functions for pagination
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Extract and validate pagination parameters from request
 */
export const getPaginationParams = (
  page?: number | null,
  limit?: number | null,
  defaultLimit: number = 12,
  maxLimit: number = 100
): PaginationParams => {
  const pageNum = Math.max(1, page || 1);
  let limitNum = limit || defaultLimit;
  
  // Enforce maximum limit to prevent performance issues
  if (limitNum > maxLimit) {
    limitNum = maxLimit;
  }
  
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};

/**
 * Format pagination response
 */
export const formatPaginationResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
