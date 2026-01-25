import { NextResponse } from 'next/server';

// Category model doesn't exist in ERP schema
// These are stub handlers

export const getCategories = async (): Promise<NextResponse> => {
  return NextResponse.json({
    categories: [],
    message: 'Category management not available in ERP schema',
  });
};

export const getCategoryById = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Category management not available in ERP schema',
  }, { status: 404 });
};

export const createCategory = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Category management not available in ERP schema',
  }, { status: 404 });
};

export const updateCategory = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Category management not available in ERP schema',
  }, { status: 404 });
};

export const deleteCategory = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Category management not available in ERP schema',
  }, { status: 404 });
};
