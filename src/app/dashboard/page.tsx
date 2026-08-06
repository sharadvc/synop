"use client";

import { ArrowRight, Play, Search, LayoutDashboard, Folder, MessageSquare, FileText, Receipt, Plus, Users, CheckCircle2, Clock, Zap, Loader2, Send, Download, File, Settings, CreditCard, DownloadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getDashboardData } from "@/actions/dashboard";

function extractVideoId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return m?.[1] ?? null;
}

export default function DashboardPage() {
  // Clerk muted for local dev — fixed dev user.
  const user = { fullName: 'Dev User', firstName: 'Dev' };
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const tabs = [
    { name: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Summaries", icon: <Folder className="w-4 h-4" /> },
    { name: "My History", icon: <FileText className="w-4 h-4" /> },
    { name: "Chats", icon: <MessageSquare className="w-4 h-4" /> },
    { name: "Documents", icon: <FileText className="w-4 h-4" /> },
    { name: "Receipts", icon: <Receipt className="w-4 h-4" /> },
  ];

  const go = () => { const id = extractVideoId(url); if (id) router.push(`/summary/${id}`); };

  useEffect(() => {
    getDashboardData().then(data => {
      if (data) {
        setSummaries(data.summaries);
        setCredits(data.credits);
      }
      setLoading(false);
    });
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
       {/* Sidebar */}
       <div className="w-64 border-r border-border bg-card/50 flex flex-col p-4 shrink-0 hidden md:flex">
          <div className="font-extrabold text-xl tracking-tight mb-8 pl-2 cursor-pointer" onClick={() => router.push('/')}>Gist</div>
          
          <div className="space-y-1 mb-8">
             {tabs.map(tab => (
                <div 
                   key={tab.name}
                   onClick={() => setActiveTab(tab.name)}
                   className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition-colors ${
                      activeTab === tab.name 
                      ? "text-white bg-primary" 
                      : "text-foreground/60 hover:text-foreground hover:bg-accent"
                   }`}
                >
                   {tab.icon} {tab.name}
                </div>
             ))}
          </div>

          <div className="mt-auto pt-6 border-t border-border/50">
             <div className="flex items-center gap-3 px-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-xs font-bold">D</div>
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-foreground">{user?.fullName || 'My Account'}</span>
                   <span className="text-xs font-medium text-foreground/50">Manage Profile</span>
                </div>
             </div>
          </div>
       </div>

       {/* Main Dashboard Panel */}
       <div className="flex-1 bg-background p-6 md:p-10 overflow-y-auto">
          {/* Mobile Header (Visible only on small screens) */}
          <div className="flex md:hidden items-center justify-between mb-8 pb-4 border-b border-border">
             <div className="font-extrabold text-xl tracking-tight cursor-pointer" onClick={() => router.push('/')}>Gist</div>
             <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-xs font-bold">D</div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div className="hidden md:block text-xs font-semibold text-foreground/50 uppercase tracking-wider">{today}</div>
             
             {/* Input Bar inside header */}
             <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-96 h-12 border border-border rounded-xl bg-card flex items-center px-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                   <Play className="w-5 h-5 text-foreground/40 mr-3 shrink-0" />
                   <input 
                      type="url" 
                      placeholder="Paste YouTube Link..." 
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && go()}
                      className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-foreground placeholder:text-foreground/40"
                   />
                </div>
                <button onClick={go} className="h-12 px-6 bg-primary hover:bg-blue-700 text-white rounded-xl text-[15px] font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap">
                   Summarize <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-8">Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}, {user?.firstName || 'John'}</h2>

          {["Dashboard", "Summaries", "My History"].includes(activeTab) && (
            <>
              {/* Metric Pills */}
              <div className="flex flex-wrap items-center gap-3 mb-10">
                 <div className="px-5 py-2.5 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80 shadow-sm">
                    <Clock className="w-4 h-4 text-primary" /> 12hrs <span className="text-foreground/50 font-medium">Time Saved</span>
                 </div>
                 <div className="px-5 py-2.5 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> {summaries.length} <span className="text-foreground/50 font-medium">Videos Analyzed</span>
                 </div>
                 <div className="px-5 py-2.5 bg-accent/50 border border-border rounded-full flex items-center gap-2 text-sm font-bold text-foreground/80 shadow-sm">
                    <Zap className="w-4 h-4 text-primary" /> {credits !== null ? credits : '...'} <span className="text-foreground/50 font-medium">Credits Left</span>
                 </div>
              </div>

              {/* Table Area */}
              <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm min-h-[300px]">
                 <div className="flex items-center justify-between p-5 border-b border-border bg-accent/30">
                    <div className="flex items-center gap-2 text-sm font-bold">
                       <LayoutDashboard className="w-4 h-4 text-primary" /> My Videos
                       <span className="text-xs font-medium text-foreground/50 ml-3 bg-background border border-border px-2.5 py-1 rounded-md shadow-sm cursor-pointer hover:bg-accent transition-colors">This Week ▼</span>
                    </div>
                    <span className="text-xs font-bold text-primary cursor-pointer hover:underline">See All</span>
                 </div>
                 
                 {/* Table Header */}
                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-bold text-foreground/50 bg-background uppercase tracking-wider">
                    <div className="col-span-12 md:col-span-6 flex items-center gap-2"><FileText className="w-3 h-3" /> Video Title</div>
                    <div className="col-span-4 hidden md:flex items-center gap-2"><Users className="w-3 h-3" /> Channel</div>
                    <div className="col-span-2 hidden md:flex items-center gap-2"><Zap className="w-3 h-3" /> Status</div>
                 </div>

                 {/* Table Rows */}
                 {loading ? (
                   <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                   </div>
                 ) : summaries.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-48 text-foreground/50 text-sm font-medium">
                      <Play className="w-12 h-12 text-border mb-4" />
                      No videos summarized yet. Paste a link above to get started!
                   </div>
                 ) : (
                    summaries.map((row) => (
                       <div 
                          key={row.id} 
                          onClick={() => router.push(`/summary/${row.videoId}`)}
                          className="grid grid-cols-12 gap-4 p-5 border-b border-border last:border-0 items-center text-sm font-medium hover:bg-accent/50 transition-colors cursor-pointer group"
                       >
                          <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-foreground/50 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                <Play className="w-3 h-3" />
                             </div>
                             <div className="min-w-0">
                                <div className="truncate group-hover:text-primary transition-colors">{row.title}</div>
                                <div className="text-xs text-foreground/50 md:hidden mt-0.5 truncate">{row.channel}</div>
                             </div>
                          </div>
                          <div className="col-span-4 hidden md:flex items-center gap-2 text-foreground/70 min-w-0">
                             <span className="truncate">{row.channel}</span>
                          </div>
                          <div className="col-span-2 hidden md:flex justify-start">
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`}>
                                {row.status}
                             </span>
                          </div>
                       </div>
                    ))
                 )}
              </div>
            </>
          )}

          {activeTab === "Chats" && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-260px)] min-h-[500px]">
               {/* Chats List Pane */}
               <div className="w-full lg:w-80 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden shrink-0">
                  <div className="p-4 border-b border-border bg-accent/30 font-bold flex justify-between items-center text-sm">
                     Recent Chats <Plus className="w-4 h-4 text-primary cursor-pointer" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                     {[1,2,3].map(i => (
                        <div key={i} className={`p-3 rounded-lg cursor-pointer ${i===1 ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent border border-transparent'}`}>
                           <div className="text-sm font-bold text-foreground truncate">{i === 1 ? 'Discussion on AI Models' : i === 2 ? 'Lex Fridman Breakdown' : 'React 19 Changes'}</div>
                           <div className="text-xs text-foreground/50 mt-1 truncate">What were the key takeaways?</div>
                        </div>
                     ))}
                  </div>
               </div>
               
               {/* Chat Window Pane */}
               <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold">{user?.firstName?.[0] || 'U'}</div>
                        <div className="bg-accent/50 p-4 rounded-2xl rounded-tl-sm text-sm font-medium text-foreground max-w-[80%]">What were the main points of the video?</div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white shadow-sm"><Zap className="w-4 h-4"/></div>
                        <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl rounded-tl-sm text-sm font-medium text-foreground max-w-[80%] leading-relaxed">The video discussed the future of AGI and focused heavily on scalability laws. It also touched upon the necessity of alignment and safety guardrails.</div>
                     </div>
                  </div>
                  <div className="p-4 border-t border-border bg-accent/20">
                     <div className="relative">
                        <input type="text" placeholder="Ask anything about this summary..." className="w-full h-12 bg-background border border-border rounded-xl pl-4 pr-12 text-sm font-medium outline-none focus:border-primary shadow-sm" />
                        <button className="absolute right-2 top-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white hover:bg-blue-600 transition-colors shadow-sm">
                           <Send className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "Documents" && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4,5].map(i => (
                   <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                         <File className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground truncate">{i === 1 ? 'Q3_Earnings_Transcript.pdf' : i === 2 ? 'Lex_Podcast_Summary.pdf' : `Meeting_Transcript_${i}.pdf`}</h3>
                      <p className="text-xs text-foreground/50 mt-1">2.4 MB • Edited yesterday</p>
                      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                         <span>Download</span> <Download className="w-3 h-3" />
                      </div>
                   </div>
                ))}
             </div>
          )}

          {activeTab === "Receipts" && (
             <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-accent/30 flex justify-between items-center">
                   <div>
                      <h3 className="font-bold text-lg text-foreground">Billing History</h3>
                      <p className="text-sm font-medium text-foreground/50">Manage your invoices and billing details.</p>
                   </div>
                   <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-bold shadow-sm">
                      <CreditCard className="w-4 h-4 text-primary" /> Pro Plan
                   </div>
                </div>
                <div className="p-0 overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-background text-xs uppercase font-bold text-foreground/50 border-b border-border">
                         <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Invoice</th>
                         </tr>
                      </thead>
                      <tbody className="font-medium text-foreground/80">
                         {[
                           { date: "Jul 01, 2026", desc: "Pro Plan Subscription", amt: "$19.00", status: "Paid" },
                           { date: "Jun 01, 2026", desc: "Pro Plan Subscription", amt: "$19.00", status: "Paid" },
                           { date: "May 01, 2026", desc: "Pro Plan Subscription", amt: "$19.00", status: "Paid" },
                         ].map((rec, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                               <td className="p-4 whitespace-nowrap">{rec.date}</td>
                               <td className="p-4">{rec.desc}</td>
                               <td className="p-4 font-bold">{rec.amt}</td>
                               <td className="p-4">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                     {rec.status}
                                  </span>
                               </td>
                               <td className="p-4 text-right">
                                  <button className="text-primary hover:text-blue-700 hover:underline inline-flex items-center gap-1 text-xs font-bold">
                                     PDF <DownloadCloud className="w-3 h-3" />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}
