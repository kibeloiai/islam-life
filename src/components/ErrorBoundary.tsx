
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-4">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                        Une erreur est survenue
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Quelque chose s'est mal passé ici. Veuillez réessayer ou retourner à l'accueil.
                    </p>
                    {this.state.error && (
                         <pre className="text-xs text-left bg-muted p-2 rounded-md overflow-auto max-h-40">
                           <code>Error: {this.state.error.message}</code>
                         </pre>
                    )}
                    <Button onClick={() => window.location.href = '/dashboard'}>
                        Retourner à l'accueil
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
