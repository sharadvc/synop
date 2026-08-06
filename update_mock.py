import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Make sure we import MousePointer2
if 'MousePointer2' not in content:
    content = content.replace('Clock, Settings }', 'Clock, Settings, MousePointer2, Loader2 }')

# We need to inject the demo logic
hook_logic = """
  const [mockActiveTab, setMockActiveTab] = useState("Dashboard");
  const [demoPhase, setDemoPhase] = useState(0);

  useEffect(() => {
    if (mockActiveTab !== "Dashboard") return;
    
    // Animation sequence
    let timeouts = [];
    
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
"""

# Replace the existing useState lines with the new ones
content = re.sub(r'const \[scrollY, setScrollY\] = useState\(0\);\n\s*const \[mockActiveTab, setMockActiveTab\] = useState\("Dashboard"\);', 
                 'const [scrollY, setScrollY] = useState(0);' + hook_logic, 
                 content)

# We need to replace the dashboard tab content specifically
dashboard_start = '{mockActiveTab === "Dashboard" && ('
dashboard_end = '{mockActiveTab === "Summaries" && ('

# We'll replace the main dashboard panel content inside the `Dashboard` tab
# And also the input/button part at the top of the main panel because we want to animate it.
# Actually, the input/button is currently outside the `mockActiveTab` check. Let's move it inside the Dashboard tab or just wrap it in conditional logic.
# Wait, the input/button is currently visible on all tabs. That's fine, but the animation only happens when mockActiveTab === "Dashboard".

# Let's completely replace the entire `Main Dashboard Panel` down to `</motion.div>`
panel_start_marker = '{/* Main Dashboard Panel */}'
panel_end_marker = '</motion.div>\n\n        {/* ───── MARQUEE ───── */}'

start_idx = content.find(panel_start_marker)
end_idx = content.find(panel_end_marker)

new_panel = """{/* Main Dashboard Panel */}
             <div className="flex-1 bg-background/50 p-6 md:p-12 overflow-y-auto relative overflow-hidden">
                
                {mockActiveTab === "Dashboard" && (
                   <motion.div 
                     className="absolute z-50 text-foreground"
                     initial={{ x: "20vw", y: "40vh", opacity: 0 }}
                     animate={
                       demoPhase === 0 ? { x: "20vw", y: "40vh", opacity: 0 } :
                       demoPhase === 1 || demoPhase === 2 ? { x: "5vw", y: "8vh", opacity: 1 } :
                       demoPhase === 3 ? { x: "28vw", y: "8vh", opacity: 1 } :
                       demoPhase === 4 ? { x: "28vw", y: "8vh", scale: 0.9, opacity: 1 } :
                       { opacity: 0 }
                     }
                     transition={{ type: "spring", stiffness: 100, damping: 20 }}
                   >
                     <MousePointer2 className="w-8 h-8 drop-shadow-xl fill-foreground stroke-background stroke-2" />
                   </motion.div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                   <div className="hidden md:block text-[11px] font-bold text-foreground/40 uppercase tracking-[0.2em]">Thursday, 20th February</div>
                   
                   <div className="flex items-center gap-3 w-full md:w-auto relative">
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
                
                {mockActiveTab === "Dashboard" && demoPhase < 6 && (
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
"""

content = content[:start_idx] + new_panel + "\n" + content[end_idx:]

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
print("done")
