import multer from 'multer';
import type { RequestHandler } from 'express';

type SingleUpload = {
  single: (fieldName: string) => RequestHandler;
};

function uploadErrorResponse(err: unknown): { status: number; message: string } {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, message: 'File too large' };
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return { status: 400, message: 'Upload exactly one file in the expected field' };
    }
    if (err.code === 'LIMIT_FIELD_VALUE') {
      return { status: 413, message: 'Form field too large' };
    }
    return { status: 400, message: 'Invalid upload' };
  }
  if (err instanceof Error && err.message === 'Unsupported file type') {
    return { status: 400, message: 'Unsupported file type' };
  }
  return { status: 400, message: 'Upload failed' };
}

export function singleUpload(upload: SingleUpload, fieldName: string): RequestHandler {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      const { status, message } = uploadErrorResponse(err);
      res.status(status).json({ error: message });
    });
  };
}
