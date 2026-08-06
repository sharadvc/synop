"use client";

import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { User, Save } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem('synop_user_name') || '');
  }, []);

  const saveName = () => {
    localStorage.setItem('synop_user_name', name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">Manage your preferences.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Set your display name for the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-foreground/60" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 h-12 glass border border-border/50 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <Button onClick={saveName} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saved ? "Saved!" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This name will appear in the dashboard greeting.</p>
              </div>
            </CardContent>
          </Card>

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

        </div>
      </main>
    </div>
  );
}
