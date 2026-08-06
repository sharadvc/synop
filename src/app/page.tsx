"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { ArrowRight, Play, Zap, Search, LayoutDashboard, Folder, MessageSquare, FileText, Receipt, Plus, Users, CheckCircle2, Clock, Settings, MousePointer2, Loader2, Globe, Database, PenTool, Share2, Scissors, Key, Terminal, Code2, Shield } from "lucide-react";
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

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const TypewriterLine = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 40);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <span>{displayedText}</span>;
}

const LiveTerminal = () => {
  const [step, setStep] = useState(0);

  const commands = [
    "git clone https://github.com/sharadvc/synop.git",
    "cd synop",
    "npm install",
    "npx prisma db push",
    "npm run dev"
  ];

  useEffect(() => {
    if (step === commands.length) {
      const t = setTimeout(() => setStep(0), 5000);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="space-y-4 text-gray-300 min-h-[220px] font-mono">
       {commands.map((cmd, i) => (
         step >= i && (
           <div key={i} className="flex items-center gap-4">
             <span className="text-green-400 shrink-0">~</span> 
             <span className="text-gray-100">
               {step === i ? (
                 <TypewriterLine text={cmd} onComplete={() => setStep(i + 1)} />
               ) : (
                 cmd
               )}
             </span>
           </div>
         )
       ))}
       {step === commands.length && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 pt-4 text-primary font-bold animate-pulse">
           Ready on localhost:3000 🚀
         </motion.div>
       )}
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [mockActiveTab, setMockActiveTab] = useState("Dashboard");
  const [demoPhase, setDemoPhase] = useState(0);

  useEffect(() => {
    if (mockActiveTab !== "Dashboard") return;
    
    // Animation sequence
    let timeouts: NodeJS.Timeout[] = [];
    
    const runSequence = () => {
      setDemoPhase(0);
      timeouts.push(setTimeout(() => setDemoPhase(1), 1000)); // pointer moves to input
      timeouts.push(setTimeout(() => setDemoPhase(2), 2000)); // paste link
      timeouts.push(setTimeout(() => setDemoPhase(3), 3000)); // pointer moves to button
      timeouts.push(setTimeout(() => setDemoPhase(4), 4000)); // click button
      timeouts.push(setTimeout(() => setDemoPhase(5), 4500)); // loading
      timeouts.push(setTimeout(() => setDemoPhase(6), 6000)); // show summary
      timeouts.push(setTimeout(() => runSequence(), 12000)); // loop after 6s of viewing
    };

    runSequence();

    return () => timeouts.forEach(clearTimeout);
  }, [mockActiveTab]);
  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden relative">
      <Navbar />
      
      {/* Background Doodles */}
      <CloudLeft />
      <CloudRight />
      <SquiggleLeft />
      <SquiggleBottomRight />
      
      <main className="pt-32 pb-20 px-6 flex flex-col items-center">
        
        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center max-w-3xl mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-[#0f172a] dark:text-white">
            Easily Summarise Your <br/>Video. <span className="relative inline-block">Start Free.<Underline /></span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[17px] text-foreground/70 text-center max-w-xl mb-12 font-medium leading-relaxed">
          The 100% free, open-source tool to extract signal from noise and reclaim your time.
        </motion.p>

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 mb-24">
          <a href="https://github.com/sharadvc/synop" target="_blank" rel="noopener noreferrer" className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-[15px] shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all flex items-center gap-2">
            Clone Repository <Terminal className="w-4 h-4" />
          </a>
          <a href="https://github.com/sharadvc/synop" target="_blank" rel="noopener noreferrer" className="h-12 px-8 rounded-full bg-foreground text-background font-bold text-[15px] shadow-lg transition-all hover:-translate-y-0.5 flex items-center gap-2">
            <GithubIcon className="w-4 h-4" /> Star on GitHub
          </a>
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
                <Search className="w-3 h-3" /> app.synop.ai
             </div>

             <div className="flex items-center gap-4 text-foreground/40">
                <ArrowRight className="w-4 h-4 rotate-180" />
                <ArrowRight className="w-4 h-4" />
                <div className="flex items-center gap-2 ml-4">
                   <div className="w-5 h-5 rounded bg-accent flex items-center justify-center"><Plus className="w-3 h-3" /></div>
                </div>
             </div>
          </div>

          {/* Browser Content Area (True Dashboard Replica) */}
          <div className="flex h-[600px] bg-background text-left">
             {/* Sidebar */}
             <div className="w-64 border-r border-border glass flex flex-col p-4 shrink-0 hidden md:flex z-10">
                 <div className="flex items-center gap-2 mb-8 pl-2">
                    <img src="/logo.svg" alt="Synop Logo" className="w-8 h-8" />
                    <span className="font-extrabold text-2xl tracking-tight">Synop</span>
                 </div>
                 
                <div className="space-y-1 mb-8">
                   {[
                      { name: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
                      { name: "Summaries", icon: <Folder className="w-4 h-4" /> },
                      { name: "Chats", icon: <MessageSquare className="w-4 h-4" /> },
                      { name: "Documents", icon: <FileText className="w-4 h-4" /> },
                      { name: "Settings", icon: <Settings className="w-4 h-4" /> },
                   ].map(tab => (
                     <div 
                        key={tab.name}
                        onClick={() => setMockActiveTab(tab.name)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition-colors ${
                           mockActiveTab === tab.name ? 'text-white bg-primary' : 'text-foreground/60 hover:text-foreground hover:bg-accent'
                        }`}
                     >
                        {tab.icon} {tab.name}
                     </div>
                   ))}
                </div>
                
                <div className="mb-8 flex-1 overflow-y-auto">
                   <div className="flex items-center justify-between px-3 mb-4">
                      <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Folders</span>
                   </div>
                   <div className="space-y-1">
                      <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-accent text-foreground cursor-pointer hover:bg-accent/80 transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>All Summaries</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-foreground/70 cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span className="truncate">Tech Podcasts</span>
                        </div>
                      </div>
                   </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-border/50">
                    <div className="flex items-center gap-3 px-3">
                      <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center font-bold text-xs">Me</div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-foreground">Local User</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Main Dashboard Panel */}
             <div className="flex-1 bg-background/50 p-6 md:p-12 overflow-y-auto relative overflow-hidden">
                


                {!(mockActiveTab === "Dashboard" && demoPhase >= 5) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                   <div className="hidden md:block text-[11px] font-bold text-foreground/40 uppercase tracking-[0.2em]">Thursday, 20th February</div>
                   
                   <div className="flex items-center gap-3 w-full md:w-auto relative">
                      {mockActiveTab === "Dashboard" && (
                         <motion.div 
                           className="absolute z-50 text-foreground pointer-events-none -translate-x-1/2 -translate-y-1/2"
                           initial={{ top: "400%", left: "40%", opacity: 0 }}
                           animate={
                             demoPhase === 0 ? { top: "400%", left: "40%", opacity: 0 } :
                             demoPhase === 1 || demoPhase === 2 ? { top: "60%", left: "40%", opacity: 1 } :
                             demoPhase === 3 ? { top: "60%", left: "88%", opacity: 1 } :
                             demoPhase === 4 ? { top: "60%", left: "88%", scale: 0.9, opacity: 1 } :
                             { opacity: 0 }
                           }
                           transition={{ type: "spring", stiffness: 100, damping: 20 }}
                         >
                           <MousePointer2 className="w-8 h-8 drop-shadow-xl fill-foreground stroke-background stroke-2" />
                         </motion.div>
                      )}
                       <div className={`flex-1 md:w-96 h-12 border border-border/60 rounded-2xl glass flex items-center px-4 shadow-sm transition-colors cursor-text ${demoPhase >= 1 && demoPhase < 5 ? 'border-primary/50 ring-4 ring-primary/10' : ''}`}>
                          <Play className="w-4 h-4 text-foreground/30 mr-3 shrink-0" strokeWidth={1.5} />
                          <div className={`text-[14px] font-medium w-full ${demoPhase >= 2 ? 'text-foreground' : 'text-foreground/30'}`}>
                             {demoPhase >= 2 ? 'https://youtube.com/watch?v=dQw4w9WgXcQ' : 'Paste YouTube Link...'}
                          </div>
                       </div>
                       <button className={`h-12 px-6 bg-foreground text-background rounded-2xl text-[14px] font-bold shadow-xl shadow-foreground/10 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${demoPhase === 4 ? 'scale-95 bg-primary text-white' : 'hover:-translate-y-0.5'}`}>
                          {demoPhase >= 5 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Summarize'} 
                          {demoPhase < 5 && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
                       </button>
                    </div>
                </div>
                )}

                {mockActiveTab === "Dashboard" && demoPhase < 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-12 tracking-tight">Good Evening!</h2>

                    <div className="flex flex-wrap items-center gap-4 mb-12">
                       <div className="px-6 py-3 glass border border-border/50 rounded-2xl flex items-center gap-3 text-[13px] font-bold text-foreground shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                          <Clock className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> 12hrs <span className="text-foreground/40 font-medium">Time Saved</span>
                       </div>
                       <div className="px-6 py-3 glass border border-border/50 rounded-2xl flex items-center gap-3 text-[13px] font-bold text-foreground shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                          <CheckCircle2 className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> 24 <span className="text-foreground/40 font-medium">Videos Analyzed</span>
                       </div>
                    </div>

                    <div className="border border-border/50 rounded-3xl glass overflow-hidden shadow-xl shadow-foreground/5 group hover:border-border transition-colors">
                       <div className="flex items-center justify-between p-6 border-b border-border/50 bg-foreground/[0.02]">
                          <div className="flex items-center gap-2 text-[14px] font-bold">
                             <LayoutDashboard className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> Recent Videos
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-bold text-foreground/50 bg-background uppercase tracking-wider">
                          <div className="col-span-7 flex items-center gap-2"><FileText className="w-3 h-3" /> Video Title</div>
                          <div className="col-span-5 flex items-center gap-2"><Users className="w-3 h-3" /> Channel</div>
                       </div>

                       {[
                          { title: "Lex Fridman: AI and the Future of Humanity", channel: "Lex Fridman", id: 1 },
                          { title: "YCombinator: How to get your first 10 customers", channel: "YCombinator", id: 2 },
                          { title: "Stanford CS229: Machine Learning Lecture 1", channel: "Stanford", id: 3 }
                       ].map((row) => (
                          <div key={row.id} className="grid grid-cols-12 gap-4 p-5 border-b border-border last:border-0 items-center text-sm font-medium hover:bg-accent/50 transition-colors cursor-pointer">
                             <div className="col-span-7 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-foreground/50 shrink-0">
                                   <Play className="w-3 h-3" />
                                </div>
                                <span className="truncate">{row.title}</span>
                             </div>
                             <div className="col-span-5 flex items-center gap-2 text-foreground/70">
                                <span className="truncate">{row.channel}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                  </motion.div>
                )}

                {mockActiveTab === "Dashboard" && demoPhase === 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-10 animate-pulse mt-4 max-w-4xl mx-auto"
                  >
                     {/* Skeleton Header */}
                     <div className="flex items-center gap-4">
                        <div className="w-40 h-10 bg-accent rounded-lg" />
                        <div className="flex items-center gap-2 ml-auto">
                           <div className="w-24 h-10 bg-accent rounded-lg" />
                           <div className="w-24 h-10 bg-accent rounded-lg" />
                        </div>
                     </div>

                     {/* Skeleton Video Meta */}
                     <div className="flex flex-col md:flex-row gap-8 bg-card border border-border p-6 rounded-2xl shadow-sm">
                        <div className="shrink-0 w-full md:w-72 h-[180px] bg-accent/50 rounded-xl" />
                        <div className="flex flex-col justify-center gap-5 w-full">
                           <div className="w-32 h-6 bg-accent rounded-full" />
                           <div className="w-3/4 h-10 bg-accent rounded-lg" />
                           <div className="w-1/2 h-8 bg-accent rounded-lg" />
                        </div>
                     </div>

                     {/* Loader Indicator */}
                     <div className="flex flex-col items-center justify-center py-16 gap-6 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
                       <div className="relative">
                         <Loader2 className="w-10 h-10 animate-spin text-primary" />
                         <div className="absolute inset-0 w-10 h-10 rounded-full blur-xl bg-primary/20" />
                       </div>
                       <div className="text-center relative z-10">
                         <p className="text-lg font-bold text-foreground">Analyzing Video Deeply...</p>
                         <p className="text-sm font-medium text-foreground/50 mt-1 max-w-sm mx-auto">Extracting transcript and running extreme analytical summarization.</p>
                       </div>
                     </div>

                     {/* Skeleton Exec Summary */}
                     <div className="h-64 bg-accent/50 rounded-2xl border border-border" />
                  </motion.div>
                )}

                {mockActiveTab === "Dashboard" && demoPhase >= 6 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                     <div className="flex items-center gap-4 mb-8">
                       <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                         <Play className="w-8 h-8 text-primary" />
                       </div>
                       <div>
                         <h2 className="text-2xl font-bold font-serif text-foreground">Rick Astley - Never Gonna Give You Up (Official Music Video)</h2>
                         <p className="text-sm text-foreground/50 mt-1">Rick Astley • 1.5B views</p>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="md:col-span-2 space-y-6">
                         <div className="p-6 glass border border-border/50 rounded-3xl shadow-sm">
                           <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> Executive Summary</h3>
                           <p className="text-sm text-foreground/70 leading-relaxed">
                             This is the official music video for Rick Astley's hit 1987 song "Never Gonna Give You Up". 
                             The video features Astley performing the song in various settings, including an empty warehouse, 
                             while dancers perform energetic routines. It has since become a massive internet meme known as "Rickrolling".
                           </p>
                         </div>
                         <div className="p-6 glass border border-border/50 rounded-3xl shadow-sm">
                           <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Key Insights</h3>
                           <ul className="space-y-3 text-sm text-foreground/70 list-disc pl-5">
                             <li>The song was a global number-one hit, topping charts in 25 countries.</li>
                             <li>The music video sparked the "Rickroll" internet meme in the late 2000s.</li>
                             <li>Rick Astley's distinctive baritone voice contrasts with his youthful appearance in the video.</li>
                           </ul>
                         </div>
                       </div>
                       <div className="space-y-6">
                         <div className="p-6 glass border border-border/50 rounded-3xl shadow-sm">
                           <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-foreground/50">Action Items</h3>
                           <ul className="space-y-3 text-sm text-foreground/70">
                             <li className="flex items-start gap-2"><div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" /> Never give you up</li>
                             <li className="flex items-start gap-2"><div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" /> Never let you down</li>
                             <li className="flex items-start gap-2"><div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" /> Never run around and desert you</li>
                           </ul>
                         </div>
                       </div>
                     </div>
                  </motion.div>
                )}

                {mockActiveTab === "Summaries" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-serif text-foreground mb-8">All Summaries</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 rounded-xl border border-border/50 glass hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center"><Folder className="w-4 h-4" /></div>
                             <div className="font-bold text-sm">Tech Lectures {i}</div>
                          </div>
                          <div className="text-xs text-foreground/50">4 videos • Last updated today</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mockActiveTab === "Chats" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-64 text-center">
                    <MessageSquare className="w-12 h-12 text-foreground/20 mb-4" />
                    <h3 className="text-lg font-bold">Chat with your Videos</h3>
                    <p className="text-sm text-foreground/50 max-w-sm mt-2">Ask questions, extract action items, and brainstorm ideas based on your video library.</p>
                  </div>
                )}

                {mockActiveTab === "Documents" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-serif text-foreground mb-8">Your Documents</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-6 rounded-2xl border border-border/50 glass flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group">
                           <FileText className="w-8 h-8 text-foreground/40 group-hover:text-primary transition-colors mb-4" />
                           <div className="font-bold text-sm">Summary_0{i}.md</div>
                           <div className="text-xs text-foreground/50 mt-1">PDF & Markdown</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mockActiveTab === "Settings" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
                    <h2 className="text-3xl font-serif text-foreground mb-8">Settings</h2>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-border/50 glass hover:border-border transition-colors cursor-pointer">
                         <div className="font-bold text-sm">AI Provider Keys</div>
                         <div className="text-xs text-foreground/50 mt-1">Configure Gemini, Groq, OpenRouter</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border/50 glass hover:border-border transition-colors cursor-pointer">
                         <div className="font-bold text-sm">Notion Integration</div>
                         <div className="text-xs text-foreground/50 mt-1">Sync summaries automatically</div>
                      </div>
                    </div>
                  </div>
                )}
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
      <section id="services" className="py-32 px-6 bg-accent/30 relative border-t border-b border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6">
                <Zap className="w-4 h-4" /> Everything You Need
             </div>
            <h2 className="text-5xl font-extrabold tracking-tight mb-6 font-serif">A powerhouse for content digestion.</h2>
            <p className="text-foreground/70 font-medium max-w-2xl mx-auto text-lg">Stop skimming through bloated videos. Synop extracts exactly what you need in seconds, with zero compromises.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[ 
              { icon: PenTool, title: "Multi-Page Notes", desc: "Get highly structured, exhaustive handwritten notes covering every single minute, quote, and action item of the video." },
              { icon: MessageSquare, title: "Chat with the AI", desc: "Have a conversation directly with the video's transcript. Ask specific questions and get precise, timestamped answers instantly." },
              { icon: Share2, title: "Marketing Assets", desc: "Instantly repurpose any video into ready-to-publish SEO blog posts, Twitter threads, and LinkedIn posts with one click." },
              { icon: Scissors, title: "Viral Clips Generator", desc: "Automatically identify the most engaging and controversial moments with exact timestamps for easy Shorts & Reels creation." },
              { icon: Globe, title: "Global Languages", desc: "Summarize and chat with videos in over 12 languages. Break down language barriers and consume global content effortlessly." },
              { icon: Database, title: "Local-First Privacy", desc: "Your library, your rules. All folders, histories, and summaries are stored securely in your own local SQLite database." }
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center text-foreground mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <feature.icon className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-4 font-serif">{feature.title}</h3>
                <p className="text-foreground/60 text-[15px] font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── OPEN SOURCE / DEVELOPER SECTION ───── */}
      <section id="open-source" className="py-32 px-6 relative bg-background">
        <SquiggleLeft />
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 text-foreground font-bold text-sm mb-6 border border-border">
                   <GithubIcon className="w-4 h-4" /> 100% Open Source
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 font-serif">Bring Your Own Key (BYOK). <br/>Zero monthly subscriptions.</h2>
                <p className="text-foreground/70 font-medium mb-8 leading-relaxed text-lg">
                  Most AI summarization tools charge you $20/month for basic features. Since Synop is completely open-source and runs locally, you just plug in your own API keys (Gemini, Groq, or OpenRouter) and pay literally fractions of a cent per video—or use free tiers for $0.
                </p>
                <ul className="space-y-4">
                  {[
                     { icon: Shield, text: 'No hidden tracking or telemetry.' },
                     { icon: Database, text: 'SQLite database sits entirely on your machine.' },
                     { icon: Code2, text: 'MIT Licensed. Fork it and build upon it.' }
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 font-bold text-foreground/80">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><item.icon className="w-4 h-4" /></div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                 <div className="bg-[#0f111a] border border-gray-800 p-8 rounded-3xl relative z-10 shadow-2xl font-mono text-sm">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                       <div className="w-3 h-3 rounded-full bg-red-500" />
                       <div className="w-3 h-3 rounded-full bg-yellow-500" />
                       <div className="w-3 h-3 rounded-full bg-green-500" />
                       <span className="ml-2 text-gray-500 font-medium text-xs">Terminal</span>
                    </div>
                    <LiveTerminal />
                 </div>
              </div>
           </div>
        </div>
      </section>



      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border bg-background py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Synop Logo" className="w-8 h-8" />
              <span className="font-extrabold text-2xl tracking-tight text-foreground">Synop</span>
           </div>
           <div className="flex gap-8 text-sm font-semibold text-foreground/60">
              <Link href="https://github.com/sharadvc/synop" target="_blank" className="hover:text-primary transition-colors flex items-center gap-2"><GithubIcon className="w-4 h-4"/> GitHub Repository</Link>
              <Link href="https://github.com/sharadvc/synop/issues" target="_blank" className="hover:text-primary transition-colors">Issues & Ideas</Link>
              <Link href="https://github.com/sharadvc/synop/blob/main/LICENSE" target="_blank" className="hover:text-primary transition-colors">MIT License</Link>
           </div>
           <p className="text-xs font-medium text-foreground/40">© {new Date().getFullYear()} Synop. Open source.</p>
        </div>
      </footer>
    </div>
  );
}
