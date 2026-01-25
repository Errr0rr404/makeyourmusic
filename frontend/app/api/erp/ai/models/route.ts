import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/server/utils/routeHandler';

// AI Models - stub handlers since full AI is not configured
const getModels = async (_req: NextRequest) => {
  return NextResponse.json({
    models: [],
    message: 'AI models require OpenAI API key configuration',
  });
};

const createPrediction = async (_req: NextRequest) => {
  return NextResponse.json({
    prediction: null,
    message: 'AI predictions require OpenAI API key configuration',
  });
};

export const GET = createRouteHandler(getModels);
export const POST = createRouteHandler(createPrediction);
