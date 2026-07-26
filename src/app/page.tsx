"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { ArrowRight, Play, Zap, Search, LayoutDashboard, Folder, MessageSquare, FileText, Receipt, Plus, Users, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Hand-drawn SVG components
const CloudLeft = () => (
  <svg className="absolute top-[20%] left-[8%] w-32 h-20 text-foreground/80 hidden lg:block" viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M25 45 C10 45 5 35 15 25 C15 10 35 5 45 15 C55 5 80 5 85 20 C95 20 95 40 85 45 Z" />
    <path d="M20 40 C30 40 40 38 45 35" />
    <path d="M50 40 C65 40 75 35 80 30" />
  </svg>
);

const CloudRight = () => (
  <svg className="absolute top-[45%] right-[10%] w-28 h-16 text-foreground/80 hidden lg:block" viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 40 C10 40 5 30 15 20 C20 10 40 5 50 15 C60 5 85 10 85 25 C95 30 90 40 80 40 Z" />
    <path d="M30 35 C40 33 50 30 55 25" />
  </svg>
);

const SquiggleLeft = () => (
  <svg className="absolute top-[42%] left-[20%] w-20 h-10 text-foreground/80 hidden lg:block" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20 Q 20 5, 35 25 T 65 20 T 95 10" />
  </svg>
);

const SquiggleBottomRight = () => (
  <svg className="absolute bottom-[10%] right-[15%] w-24 h-24 text-foreground/80 hidden lg:block" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M80 10 C 90 30, 70 50, 90 70 C 100 85, 80 95, 60 90" />
    <path d="M80 30 C 60 40, 50 60, 60 80" />
  </svg>
);

const Underline = () => (
  <svg className="absolute -bottom-4 left-0 w-full h-4 text-primary" viewBox="0 0 200 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M5 10 Q 100 15, 195 5 M10 15 Q 100 20, 190 10" />
  </svg>
);

export default function Home() {
  const router = useRouter();
  // Clerk muted for local dev — always show the landing page.
  const isSignedIn = false;
  const isLoaded = true;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden relative">
      <Navbar />
      
      {/* Background Doodles */}
      <CloudLeft />
      <CloudRight />
      <SquiggleLeft />
      <SquiggleBottomRight />
      
      <main className="pt-32 pb-20 px-6 flex flex-col items-center">
        
        {/* Promo Pill */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 bg-card border border-border shadow-sm rounded-full px-1.5 py-1.5 pr-4">
            <div className="w-6 h-6 flex items-center justify-center text-primary">
              <Zap className="w-4 h-4 fill-primary/20" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground/90">🚀 Introducing Gist 2.0: The Ultimate Video AI</span>
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white ml-2 cursor-pointer hover:bg-blue-700 transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center max-w-3xl mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-[#0f172a] dark:text-white">
            Easily Summarise Your <br/>Video. <span className="relative inline-block">Start Free.<Underline /></span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[17px] text-foreground/70 text-center max-w-xl mb-12 font-medium leading-relaxed">
          We're excited to offer you an exclusive promotion to save 20% off our Starter or Advanced plans.*
        </motion.p>

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 mb-24">
          <button onClick={() => router.push('/dashboard')} className="h-12 px-8 rounded-full bg-primary hover:bg-blue-700 text-white font-bold text-[15px] shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all">
            Get Started
          </button>
          <button onClick={() => router.push('/pricing')} className="h-12 px-8 rounded-full bg-card border border-border hover:bg-accent text-foreground font-bold text-[15px] shadow-sm flex items-center gap-2 transition-all">
            Try For Free <ArrowRight className="w-4 h-4 text-foreground/50" />
          </button>
        </motion.div>

        {/* Safari Browser Mockup */}
        <motion.div 
           initial={{ opacity: 0, y: 40 }} 
           animate={{ opacity: 1, y: 0 }} 
           transition={{ delay: 0.5, duration: 0.8 }} 
           className="w-full max-w-[1000px] mx-auto bg-card rounded-2xl border border-border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative z-10"
        >
          {/* Browser Top Bar */}
          <div className="h-12 border-b border-border bg-background flex items-center px-4 justify-between relative">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
             </div>
             
             {/* URL Bar */}
             <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-80 h-7 bg-accent rounded-md text-[11px] font-medium text-foreground/60 gap-2">
                <Search className="w-3 h-3" /> app.gist.io
             </div>

             <div className="flex items-center gap-4 text-foreground/40">
                <ArrowRight className="w-4 h-4 rotate-180" />
                <ArrowRight className="w-4 h-4" />
                <div className="flex items-center gap-2 ml-4">
                   <div className="w-5 h-5 rounded bg-accent flex items-center justify-center"><Plus className="w-3 h-3" /></div>
                </div>
             </div>
          </div>

          {/* Browser Content Area */}
          <div className="flex h-[600px] bg-background">
             {/* Sidebar */}
             <div className="w-64 border-r border-border bg-card/50 flex flex-col p-4">
                <div className="font-extrabold text-xl tracking-tight mb-8 pl-2">Synop</div>
                
                <div className="space-y-1 mb-8">
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-foreground/60 hover:bg-accent rounded-lg cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-foreground/60 hover:bg-accent rounded-lg cursor-pointer">
                      <Folder className="w-4 h-4" /> Summaries
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm cursor-pointer">
                      <FileText className="w-4 h-4" /> My History
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-foreground/60 hover:bg-accent rounded-lg cursor-pointer">
                      <MessageSquare className="w-4 h-4" /> Chats
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-foreground/60 hover:bg-accent rounded-lg cursor-pointer">
                      <FileText className="w-4 h-4" /> Documents
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-foreground/60 hover:bg-accent rounded-lg cursor-pointer">
                      <Receipt className="w-4 h-4" /> Receipts
                   </div>
                </div>

                <div className="mt-auto">
                   <div className="flex items-center justify-between px-3 mb-4">
                      <span className="text-xs font-bold text-foreground/50">Projects</span>
                      <Plus className="w-3 h-3 text-foreground/50" />
                   </div>
                   <div className="space-y-3 px-3">
                      <div className="flex items-center gap-3 text-sm font-medium text-foreground/70"><div className="w-2 h-2 rounded bg-purple-400" /> Podcast Summaries</div>
                      <div className="flex items-center gap-3 text-sm font-medium text-foreground/70"><div className="w-2 h-2 rounded bg-green-400" /> Tech Lectures</div>
                   </div>
                </div>
             </div>

             {/* Main Dashboard Panel */}
             <div className="flex-1 bg-background p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                   <div className="text-xs font-semibold text-foreground/50">Thursday, 20th February</div>
                   <div className="flex items-center gap-2">
                      <button className="h-8 px-4 border border-border rounded-md text-xs font-semibold flex items-center gap-2 hover:bg-accent text-foreground/80">
                         <Search className="w-3 h-3" /> Share
                      </button>
                      <button className="h-8 px-4 border border-border rounded-md text-xs font-semibold flex items-center gap-2 hover:bg-accent text-foreground/80">
                         <Plus className="w-3 h-3" /> Add Video
                      </button>
                   </div>
                </div>
                
                <h2 className="text-3xl font-bold text-foreground mb-8">Good Evening! John,</h2>

                {/* Metric Pills */}
                <div className="flex items-center gap-3 mb-10">
                   <div className="px-4 py-2 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80">
                      <Clock className="w-4 h-4 text-foreground/60" /> 12hrs <span className="text-foreground/50 font-medium">Time Saved</span>
                   </div>
                   <div className="px-4 py-2 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-foreground/60" /> 24 <span className="text-foreground/50 font-medium">Videos Analyzed</span>
                   </div>
                   <div className="px-4 py-2 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80">
                      <Users className="w-4 h-4 text-foreground/60" /> 7 <span className="text-foreground/50 font-medium">In-progress</span>
                   </div>
                </div>

                {/* Table Area */}
                <div className="border border-border rounded-xl bg-card overflow-hidden">
                   <div className="flex items-center justify-between p-4 border-b border-border bg-accent/30">
                      <div className="flex items-center gap-2 text-sm font-bold">
                         <LayoutDashboard className="w-4 h-4" /> My Videos
                         <span className="text-xs font-medium text-foreground/50 ml-2 bg-background border border-border px-2 py-1 rounded">This Week ▼</span>
                      </div>
                      <span className="text-xs font-bold text-foreground/50 cursor-pointer">See All</span>
                   </div>
                   
                   {/* Table Header */}
                   <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-bold text-foreground/50 bg-background">
                      <div className="col-span-6 flex items-center gap-2"><FileText className="w-3 h-3" /> Video Title</div>
                      <div className="col-span-4 flex items-center gap-2"><Users className="w-3 h-3" /> Channel</div>
                      <div className="col-span-2 flex items-center gap-2"><Zap className="w-3 h-3" /> Status</div>
                   </div>

                   {/* Table Rows */}
                   {[
                      { title: "Lex Fridman: AI and the Future of Humanity", channel: "Lex Fridman", status: "In Progress", statusColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", id: 1 },
                      { title: "YCombinator: How to get your first 10 customers", channel: "YCombinator", status: "Pending", statusColor: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", id: 2 },
                      { title: "Stanford CS229: Machine Learning Lecture 1", channel: "Stanford", status: "Completed", statusColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", id: 3 }
                   ].map((row) => (
                      <div key={row.id} className="grid grid-cols-12 gap-4 p-4 border-b border-border last:border-0 items-center text-sm font-medium hover:bg-accent/30 transition-colors">
                         <div className="col-span-6 flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-foreground/50"><Play className="w-3 h-3" /></div>
                            <span className="truncate">{row.title}</span>
                         </div>
                         <div className="col-span-4 flex items-center gap-2 text-foreground/70">
                            <div className="w-5 h-5 rounded-full bg-accent" />
                            <span className="truncate">{row.channel}</span>
                         </div>
                         <div className="col-span-2 flex justify-start">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${row.statusColor}`}>
                               {row.status}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </motion.div>

        {/* ───── MARQUEE ───── */}
        <div className="w-[110%] mt-24 overflow-hidden bg-primary text-white py-4 relative transform -rotate-2 shadow-sm -mx-6">
           <div className="absolute inset-0 bg-black/10" />
           <motion.div 
             animate={{ x: ["0%", "-50%"] }} 
             transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
             className="flex whitespace-nowrap gap-16 relative z-10 font-bold tracking-widest uppercase text-sm md:text-base"
           >
             {/* Duplicate items for infinite scroll effect */}
             {[...Array(3)].map((_, idx) => (
                <div key={idx} className="flex gap-16 items-center">
                   <span>Summarize 2h podcast in 30s</span>
                   <span className="text-white/50">•</span>
                   <span>Chat with your video</span>
                   <span className="text-white/50">•</span>
                   <span>Extract Action Items</span>
                   <span className="text-white/50">•</span>
                   <span>Export to Notion</span>
                   <span className="text-white/50">•</span>
                   <span>Generate Timestamps</span>
                   <span className="text-white/50">•</span>
                </div>
             ))}
           </motion.div>
        </div>

      </main>

      {/* ───── SERVICES ───── */}
      <section id="services" className="py-24 px-6 bg-accent/30 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Powerful Features for Productivity</h2>
            <p className="text-foreground/70 font-medium max-w-2xl mx-auto">Everything you need to extract signal from noise and reclaim your time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[ 
              { icon: Clock, title: "Save Hundreds of Hours", desc: "Skip the fluff. Get to the core message of any 2-hour lecture in 30 seconds." },
              { icon: MessageSquare, title: "Chat with Video", desc: "Ask specific questions to the AI about the video content and get precise answers with timestamps." },
              { icon: FileText, title: "Export Anywhere", desc: "Export your beautifully formatted notes to Notion, Markdown, PDF, or just copy to clipboard." }
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">{feature.title}</h3>
                <p className="text-foreground/70 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── USE CASES ───── */}
      <section id="use-case" className="py-32 px-6 relative">
        <SquiggleLeft />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-6">Built for those who value their time.</h2>
            <p className="text-foreground/70 font-medium mb-8 leading-relaxed">
              Whether you are a student cramming for exams, a researcher analyzing hours of interviews, or a professional staying up-to-date with industry trends, Synop is your unfair advantage.
            </p>
            <ul className="space-y-4">
              {['Students & Educators', 'Researchers & Analysts', 'Productivity Enthusiasts'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-foreground/80">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary"><CheckCircle2 className="w-4 h-4" /></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-primary/5 rounded-3xl transform rotate-3" />
             <div className="bg-card border border-border p-8 rounded-3xl relative z-10 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                   <div>
                      <div className="font-bold">Sarah Jenkins</div>
                      <div className="text-xs font-medium text-foreground/50">Stanford Researcher</div>
                   </div>
                </div>
                <p className="italic text-foreground/80 font-medium leading-relaxed">
                  "I analyze dozens of tech lectures every week. What used to take me 15 hours now takes me exactly 45 minutes. Synop's AI is literal magic."
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* ───── SERVER / TECH ───── */}
      <section id="server" className="py-24 px-6 bg-accent/30 text-center">
        <div className="max-w-3xl mx-auto">
           <h2 className="text-4xl font-extrabold tracking-tight mb-6">Powered by the best.</h2>
           <p className="text-foreground/70 font-medium mb-12">We use a custom fleet of enterprise-grade AI models, including GPT-4o and Claude 3.5, to ensure your summaries are flawless.</p>
           <div className="flex flex-wrap justify-center gap-8 text-2xl font-black text-foreground/20 uppercase tracking-widest">
              <span>OpenAI</span>
              <span>Anthropic</span>
              <span>Vercel</span>
              <span>Stripe</span>
           </div>
        </div>
      </section>

      {/* ───── PRICING ───── */}
      <section id="pricing" className="py-32 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16 relative">
          <CloudRight />
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Simple, transparent pricing.</h2>
          <p className="text-foreground/70 font-medium">Start for free. Upgrade when you need more power.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="bg-card border border-border p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <div className="flex items-end gap-1 mb-6">
               <span className="text-5xl font-extrabold tracking-tight">$0</span>
               <span className="text-foreground/50 font-medium mb-1">/mo</span>
            </div>
            <p className="text-sm font-medium text-foreground/70 mb-8 pb-8 border-b border-border">Perfect for trying out Gist and summarizing short videos.</p>
            <ul className="space-y-4 mb-10">
               <li className="flex items-center gap-3 text-sm font-bold text-foreground/80"><CheckCircle2 className="w-5 h-5 text-primary" /> 5 summaries per month</li>
               <li className="flex items-center gap-3 text-sm font-bold text-foreground/80"><CheckCircle2 className="w-5 h-5 text-primary" /> Up to 30 min videos</li>
               <li className="flex items-center gap-3 text-sm font-bold text-foreground/80"><CheckCircle2 className="w-5 h-5 text-primary" /> Basic exports</li>
            </ul>
            <button className="w-full h-12 rounded-full bg-accent text-foreground font-bold hover:bg-border transition-colors">Start for free</button>
          </div>
          <div className="bg-primary text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full" />
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="flex items-end gap-1 mb-6">
               <span className="text-5xl font-extrabold tracking-tight">$12</span>
               <span className="text-white/70 font-medium mb-1">/mo</span>
            </div>
            <p className="text-sm font-medium text-white/90 mb-8 pb-8 border-b border-white/20">For heavy users who need unlimited power and AI chat.</p>
            <ul className="space-y-4 mb-10">
               <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="w-5 h-5 text-white/90" /> Unlimited summaries</li>
               <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="w-5 h-5 text-white/90" /> Up to 4 hour videos</li>
               <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="w-5 h-5 text-white/90" /> "Chat with Video" access</li>
               <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="w-5 h-5 text-white/90" /> GPT-4o & Claude 3.5</li>
            </ul>
            <button className="w-full h-12 rounded-full bg-white text-primary font-bold hover:bg-gray-100 transition-colors shadow-lg">Upgrade to Pro</button>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border bg-background py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-foreground">Synop</span>
           </div>
           <div className="flex gap-8 text-sm font-semibold text-foreground/60">
              <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
           </div>
           <p className="text-xs font-medium text-foreground/40">© 2026 Synop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
