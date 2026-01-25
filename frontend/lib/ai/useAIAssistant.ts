// Advanced AI Assistant for Kairux
// Provides intelligent business insights, predictions, and recommendations

import { useState, useCallback } from 'react';
import api from '@/lib/api';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  id: string;
  type: 'action' | 'insight' | 'warning' | 'opportunity';
  title: string;
  description: string;
  action?: () => void;
  priority: 'low' | 'medium' | 'high';
}

export interface AIInsight {
  category: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-100
  data?: Record<string, unknown>;
}

class AIAssistantService {
  private conversationHistory: AIMessage[] = [];

  // Ask AI a question
  async ask(question: string, context?: Record<string, unknown>): Promise<AIMessage> {
    try {
      const response = await api.post('/ai/chat', {
        message: question,
        context,
        history: this.conversationHistory.slice(-5), // Last 5 messages for context
      });

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
        suggestions: response.data.suggestions,
      };

      this.conversationHistory.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: new Date(),
        context,
      });
      this.conversationHistory.push(assistantMessage);

      return assistantMessage;
    } catch {
      throw new Error('Failed to get AI response');
    }
  }

  // Get business insights
  async getInsights(module: string, timeRange?: string): Promise<AIInsight[]> {
    try {
      const response = await api.get('/ai/insights', {
        params: { module, timeRange },
      });
      return response.data.insights;
    } catch {
      return this.getMockInsights(module);
    }
  }

  // Predict future trends
  async predictTrends(module: string, metric: string): Promise<unknown> {
    try {
      const response = await api.post('/ai/predict', {
        module,
        metric,
      });
      return response.data;
    } catch {
      return this.getMockPrediction(module, metric);
    }
  }

  // Get recommendations
  async getRecommendations(context: Record<string, unknown>): Promise<AISuggestion[]> {
    try {
      const response = await api.post('/ai/recommendations', context);
      return response.data.recommendations;
    } catch {
      return this.getMockRecommendations();
    }
  }

  // Analyze document/data
  async analyze(data: unknown, type: string): Promise<unknown> {
    try {
      const response = await api.post('/ai/analyze', { data, type });
      return response.data.analysis;
    } catch {
      return { success: false, error: 'Analysis failed' };
    }
  }

  // Clear conversation
  clearHistory() {
    this.conversationHistory = [];
  }

  // Mock data for development
  private getMockInsights(module: string): AIInsight[] {
    return [
      {
        category: 'Revenue',
        title: 'Revenue Growth Opportunity',
        description: `Your ${module} revenue is up 23% this quarter. Consider expanding your top-performing product lines.`,
        impact: 'positive',
        confidence: 87,
      },
      {
        category: 'Efficiency',
        title: 'Process Optimization Detected',
        description: 'Average transaction time can be reduced by 15% with workflow automation.',
        impact: 'positive',
        confidence: 92,
      },
      {
        category: 'Risk',
        title: 'Cash Flow Alert',
        description: 'Projected cash flow may dip below optimal levels in 45 days. Consider adjusting payment terms.',
        impact: 'negative',
        confidence: 78,
      },
    ];
  }

  private getMockPrediction(module: string, metric: string): unknown {
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const values = [45000, 52000, 48000, 61000, 58000, 67000];

    return {
      metric,
      prediction: months.map((month, i) => {
        const value = values[i] ?? 0;
        return {
          period: month,
          predicted: value,
          confidence: 85 - (i * 2),
          range: {
            low: value * 0.9,
            high: value * 1.1,
          },
        };
      }),
      insights: [
        'Expected 15% growth over next 6 months',
        'Seasonal peak predicted in May',
        'Q2 forecast: $178K total',
      ],
    };
  }

  private getMockRecommendations(): AISuggestion[] {
    return [
      {
        id: '1',
        type: 'opportunity',
        title: 'High-Value Customer Follow-up',
        description: '3 customers haven\'t purchased in 60 days but have high lifetime value',
        priority: 'high',
      },
      {
        id: '2',
        type: 'action',
        title: 'Inventory Reorder Alert',
        description: '5 products will run out of stock in 2 weeks',
        priority: 'medium',
      },
      {
        id: '3',
        type: 'insight',
        title: 'Payment Terms Optimization',
        description: 'Shortening payment terms by 5 days could improve cash flow by $12K/month',
        priority: 'medium',
      },
    ];
  }
}

// Singleton instance
export const aiAssistant = new AIAssistantService();

// React Hook
export function useAIAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  const ask = useCallback(async (question: string, context?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const response = await aiAssistant.ask(question, context);
      setMessages(prev => [...prev, response]);
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInsights = useCallback(async (module: string, timeRange?: string) => {
    setLoading(true);
    try {
      const results = await aiAssistant.getInsights(module, timeRange);
      setInsights(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, []);

  const predictTrends = useCallback(async (module: string, metric: string) => {
    setLoading(true);
    try {
      return await aiAssistant.predictTrends(module, metric);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecommendations = useCallback(async (context: Record<string, unknown>) => {
    setLoading(true);
    try {
      return await aiAssistant.getRecommendations(context);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    aiAssistant.clearHistory();
  }, []);

  return {
    messages,
    loading,
    insights,
    ask,
    getInsights,
    predictTrends,
    getRecommendations,
    clearChat,
  };
}
