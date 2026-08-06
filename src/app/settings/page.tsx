"use client";

import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { getByokConfig, setByokConfig, type ByokConfig, type ProviderKeys } from "@/lib/byok";
import { PROVIDERS, PROVIDER_LABELS, type Provider } from "@/lib/providers";

const PROVIDER_HINTS: Record<Provider, string> = {
  openrouter: "Strictly free (:free) models, picked live from OpenRouter's catalog.",
  groq: "Strictly free-tier Groq models (llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it, …).",
  deepseek: "deepseek-chat / deepseek-reasoner. Not free — billed to your key.",
  openai: "gpt-4o-mini family. Not free — billed to your key.",
};

export default function SettingsPage() {
  const [cfg, setCfg] = useState<ByokConfig>(() => getByokConfig());
  const [saved, setSaved] = useState(false);

  const setProvider = (value: string | null) => {
    if (!value) return;
    setCfg((c) => ({ ...c, provider: value as Provider }));
    setSaved(false);
  };

  const setKey = (provider: Provider, value: string) => {
    setCfg((c) => ({ ...c, keys: { ...c.keys, [provider]: value } }));
    setSaved(false);
  };

  const save = () => {
    setByokConfig(cfg);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Bring your own API keys, or manage preferences.</p>
          </div>

          {/* BYOK */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> Bring Your Own Key
              </CardTitle>
              <CardDescription>
                Use your own AI provider and keys. Keys are stored in your browser and sent only to
                this app's summarize endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Provider</Label>
                <Select value={cfg.provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {PROVIDER_HINTS[cfg.provider]}
                </p>
              </div>

              {PROVIDERS.map((p) => (
                <div key={p} className="space-y-2">
                  <Label htmlFor={`key-${p}`}>{PROVIDER_LABELS[p]} API Key</Label>
                  <div className="relative">
                    <Input
                      id={`key-${p}`}
                      type="password"
                      autoComplete="off"
                      placeholder={cfg.keys[p] ? "•••••••••••••••••••• (saved)" : `Paste your ${p} key`}
                      value={cfg.keys[p]}
                      onChange={(e) => setKey(p, e.target.value)}
                      className="pr-10 font-mono"
                    />
                    <KeyRound className="w-4 h-4 text-foreground/30 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-4">
                <Button onClick={save}>Save Keys</Button>
                {saved && (
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Saved
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Preferences</CardTitle>
              <CardDescription>Set your default style and length for new summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Length</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~30 seconds)</SelectItem>
                    <SelectItem value="medium">Medium (~2 minutes)</SelectItem>
                    <SelectItem value="long">Long (~5 minutes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Style</Label>
                <Select defaultValue="executive">
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (Simple language)</SelectItem>
                    <SelectItem value="technical">Technical (Detailed)</SelectItem>
                    <SelectItem value="executive">Executive Summary</SelectItem>
                    <SelectItem value="bullets">Bullet Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button>Save Preferences</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>You are currently on the Free plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Free Plan</h3>
                    <p className="text-sm text-muted-foreground">5 summaries per day.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold">5 / 5</span>
                  <p className="text-xs text-muted-foreground">credits remaining</p>
                </div>
              </div>
              <Button className="w-full sm:w-auto" variant="default">Upgrade to Pro ($9/mo)</Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
