import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Workflow, Users, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Kairux',
  description: 'Learn about Kairux - where business connects and flows seamlessly',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Why <span className="text-primary">Kairux</span>?
            </h1>
            <p className="text-xl text-muted-foreground">
              A name that reflects our philosophy
            </p>
          </div>

          {/* Name Origin */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                The Name
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Etymology</h3>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Kai</span> (Greek: καί) - meaning "and" or "connection"
                  <br />
                  <span className="font-semibold text-foreground">Rux</span> - derived from "flux," meaning "flow"
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Together</h3>
                <p className="text-muted-foreground">
                  <span className="text-lg font-semibold text-primary">Kairux</span> represents the
                  <span className="font-semibold text-foreground"> "Connecting Flow"</span> -
                  the seamless integration and movement of data, processes, and insights across your entire organization.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Our Philosophy */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Our Philosophy</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    Business in Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Business should flow naturally, without friction. Kairux removes barriers between
                    departments, connecting accounting to sales, HR to projects, and inventory to analytics
                    - creating a unified stream of operations.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Where Everything Connects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Just as "kai" means "and" - connecting ideas together - Kairux connects every aspect
                    of your business. Data flows seamlessly, insights emerge naturally, and decisions
                    become clearer when everything is connected.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Continuous Movement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Like water flowing in a stream, your business data and processes should move
                    continuously and effortlessly. Kairux ensures information flows where it's needed,
                    when it's needed, without manual intervention.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI-Powered Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Modern business requires intelligent automation. Kairux uses AI to understand your
                    business patterns, predict trends, and suggest optimal decisions - making the flow
                    of your business smarter every day.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tagline */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-8 text-center">
              <blockquote className="text-2xl sm:text-3xl font-bold mb-2">
                "Business in Flow"
              </blockquote>
              <p className="text-muted-foreground">
                Your operations, seamlessly connected and continuously moving forward
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
