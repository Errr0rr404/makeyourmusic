// AI Assistant Chat Component
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Send,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useAIAssistant, type AIMessage, type AISuggestion } from '@/lib/ai/useAIAssistant';
import { cn } from '@/lib/utils';

interface AIAssistantChatProps {
  onClose?: () => void;
  defaultOpen?: boolean;
}

export function AIAssistantChat({ onClose, defaultOpen = false }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const { messages, loading, ask } = useAIAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input;
    setInput('');
    await ask(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { icon: TrendingUp, label: 'Show revenue forecast', query: 'What is my revenue forecast for next quarter?' },
    { icon: AlertCircle, label: 'Risk analysis', query: 'What are the main risks in my business right now?' },
    { icon: Lightbulb, label: 'Growth opportunities', query: 'What growth opportunities should I focus on?' },
    { icon: Sparkles, label: 'Optimize workflow', query: 'How can I optimize my business workflows?' },
  ];

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <Brain className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col",
        isMinimized
          ? "bottom-6 right-6 w-80 h-16"
          : "bottom-6 right-6 w-[400px] h-[600px]"
      )}
    >
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <AnimatePresence>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">AI-Powered Business Insights</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Ask me anything about your business
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground px-2">Quick Actions:</p>
                    {quickActions.map((action, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-full p-3 text-left hover:bg-muted rounded-lg transition-colors flex items-center gap-3 group"
                        onClick={() => {
                          setInput(action.query);
                          setTimeout(handleSend, 100);
                        }}
                      >
                        <action.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {action.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, i) => (
                    <MessageBubble key={i} message={message} />
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>Analyzing...</span>
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Input */}
          <CardContent className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </motion.div>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Brain className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold">You</span>
        </div>
      )}
    </motion.div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: AISuggestion }) {
  const icons = {
    action: AlertCircle,
    insight: Lightbulb,
    warning: AlertCircle,
    opportunity: TrendingUp,
  };

  const Icon = icons[suggestion.type];

  return (
    <div className="bg-background border rounded p-2 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{suggestion.title}</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {suggestion.priority}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{suggestion.description}</p>
    </div>
  );
}
