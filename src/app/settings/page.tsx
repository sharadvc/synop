import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">Manage your preferences and subscription.</p>
          </div>

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
                <div>
                  <h3 className="font-semibold">Free Plan</h3>
                  <p className="text-sm text-muted-foreground">5 summaries per day.</p>
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
