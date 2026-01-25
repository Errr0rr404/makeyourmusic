import { NextResponse } from 'next/server';

// Contact/ContactMessage model doesn't exist in ERP schema
// These are stub handlers

export const getContacts = async (): Promise<NextResponse> => {
  return NextResponse.json({
    contacts: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    message: 'Contact management not available in ERP schema',
  });
};

export const getContactById = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Contact management not available in ERP schema',
  }, { status: 404 });
};

export const updateContactStatus = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Contact management not available in ERP schema',
  }, { status: 404 });
};

export const deleteContact = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Contact management not available in ERP schema',
  }, { status: 404 });
};
