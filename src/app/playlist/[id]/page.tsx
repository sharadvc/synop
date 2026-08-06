import Navbar from "@/components/Navbar";
import { Plus, Play, Loader2, ListVideo, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import ytpl from 'ytpl';

export default async function PlaylistPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang = 'English' } = await searchParams;
  
  let playlist;
  try {
    playlist = await ytpl(id, { limit: 50 });
  } catch (error) {
    return <div className="p-12 text-center">Invalid Playlist ID or Private Playlist</div>;
  }

  // Get completed summaries for these videos
  const videoIds = playlist.items.map(i => i.id);
  const completed = await db.summary.findMany({
    where: { videoId: { in: videoIds } },
    select: { videoId: true }
  });
  const completedIds = new Set(completed.map(c => c.videoId));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-12">
         <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
               <ListVideo className="w-8 h-8 text-primary" />
            </div>
            <div>
               <h1 className="text-3xl font-serif font-extrabold">{playlist.title}</h1>
               <p className="text-foreground/50 font-medium mt-1">{playlist.items.length} Videos • Batch Processing</p>
            </div>
         </div>

         <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-foreground/5">
            <div className="p-6 border-b border-border/50 bg-foreground/[0.02] flex items-center justify-between">
               <h3 className="font-bold">Videos in Playlist</h3>
               <button className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                  Summarize All Unprocessed
               </button>
            </div>
            
            <div className="divide-y divide-border/50">
               {playlist.items.map((item, index) => {
                  const isDone = completedIds.has(item.id);
                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors group">
                       <div className="flex items-center gap-4">
                          <span className="text-foreground/30 font-bold w-6 text-right">{index + 1}</span>
                          <img src={item.bestThumbnail.url || ""} className="w-24 h-14 object-cover rounded-lg border border-border/50" />
                          <div>
                             <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h4>
                             <p className="text-xs text-foreground/50 mt-1">{item.author.name}</p>
                          </div>
                       </div>
                       
                       <div>
                          {isDone ? (
                            <Link href={`/summary/${item.id}`}>
                              <button className="flex items-center gap-2 text-xs font-bold bg-green-500/10 text-green-600 px-4 py-2 rounded-lg">
                                <CheckCircle2 className="w-4 h-4" /> View Summary
                              </button>
                            </Link>
                          ) : (
                            <Link href={`/summary/${item.id}?lang=${lang}`}>
                              <button className="flex items-center gap-2 text-xs font-bold bg-accent text-foreground/80 hover:bg-primary hover:text-white transition-colors px-4 py-2 rounded-lg">
                                <Play className="w-3 h-3" /> Summarize Now
                              </button>
                            </Link>
                          )}
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>
    </div>
  );
}
