"use client";

import { ArrowRight, Play, Search, LayoutDashboard, Folder, MessageSquare, FileText, Receipt, Plus, Users, CheckCircle2, Clock, Zap, Loader2, Send, Download, File, Settings, CreditCard, DownloadCloud, Trash, FolderPlus, X, User, Menu, Radio, Cpu, RefreshCw, Sparkles, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getDashboardData } from "@/actions/dashboard";
import { createFolder, deleteFolder, assignToFolder } from "@/actions/folders";
import { useLanguage } from "@/context/LanguageContext";
import ChannelsPanel from "@/components/ChannelsPanel";
import BriefingPanel from "@/components/BriefingPanel";
import { aiHeaders } from "@/lib/client-ai";
import { PERSONAS, PERSONA_LIST, getPersona, savePersona, personaDef, type PersonaId } from "@/lib/persona";

function extractVideoId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return m?.[1] ?? null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const { language, setLanguage } = useLanguage();
  const [customPrompt, setCustomPrompt] = useState("");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Briefing");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("blue");
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Persona (first-run onboarding)
  const [persona, setPersona] = useState<PersonaId>('general');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  
  // API Keys state
  const [keys, setKeys] = useState({ gemini: "", groq: "", openrouter: "", notion: "", notionDb: "", tavily: "" });
  const [keysLoaded, setKeysLoaded] = useState(false);
  // Custom AI providers (any OpenAI-compatible endpoint)
  const [customProviders, setCustomProviders] = useState<{ name: string; baseUrl: string; apiKey: string; models: string }[]>([]);
  const [cpName, setCpName] = useState("");
  const [cpBaseUrl, setCpBaseUrl] = useState("");
  const [cpApiKey, setCpApiKey] = useState("");
  const [cpModels, setCpModels] = useState("");
  const [cpSaved, setCpSaved] = useState(false);
  // Live model picker
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const saveCustomProviders = (next: { name: string; baseUrl: string; apiKey: string; models: string }[]) => {
    setCustomProviders(next);
    localStorage.setItem('custom_llm_providers', JSON.stringify(next));
    setCpSaved(true);
    setTimeout(() => setCpSaved(false), 2000);
  };

  const fetchModels = async () => {
    if (!cpBaseUrl.trim()) { setModelsError('Enter a base URL first.'); return; }
    setFetchingModels(true); setModelsError(null); setAvailableModels([]); setSelectedModels([]);
    try {
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: cpBaseUrl.trim(), apiKey: cpApiKey.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not fetch models');
      setAvailableModels(j.models || []);
      if (!j.models?.length) setModelsError('No models found on that endpoint.');
    } catch (e: any) {
      setModelsError(e.message || 'Could not fetch models');
    } finally {
      setFetchingModels(false);
    }
  };

  const toggleModel = (m: string) => setSelectedModels(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

  const useSelectedModels = () => {
    if (selectedModels.length) setCpModels(selectedModels.join(', '));
    setAvailableModels([]);
    setSelectedModels([]);
  };

  const tabs = [
    { name: "Briefing", icon: <Sun className="w-4 h-4" /> },
    { name: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Summaries", icon: <Folder className="w-4 h-4" /> },
    { name: "Channels", icon: <Radio className="w-4 h-4" /> },
    { name: "Chats", icon: <MessageSquare className="w-4 h-4" /> },
    { name: "Documents", icon: <FileText className="w-4 h-4" /> },
    { name: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const go = () => { 
    let qs = `lang=${encodeURIComponent(language)}`;
    if (customPrompt.trim()) qs += `&prompt=${encodeURIComponent(customPrompt.trim())}`;
    
    if (url.includes('list=')) {
      try {
        const listId = new URL(url).searchParams.get('list');
        if (listId) {
          router.push(`/playlist/${listId}?${qs}`);
          return;
        }
      } catch (e) {}
    }
    const id = extractVideoId(url); 
    if (id) router.push(`/summary/${id}?${qs}`); 
  };

  useEffect(() => {
    getDashboardData(language, persona).then(data => {
      if (data) {
        setSummaries(data.summaries);
        setFolders(data.folders || []);
      }
      setLoading(false);
    });
    
    // Load user name from localStorage
    setUserName(localStorage.getItem('synop_user_name') || '');
    
    // Load keys from localStorage
    setKeys({
      gemini: localStorage.getItem('gemini_key') || "",
      groq: localStorage.getItem('groq_key') || "",
      openrouter: localStorage.getItem('openrouter_key') || "",
      notion: localStorage.getItem('notion_key') || "",
      notionDb: localStorage.getItem('notion_db') || "",
      tavily: localStorage.getItem('tavily_key') || "",
    });
    setKeysLoaded(true);
    try { setCustomProviders(JSON.parse(localStorage.getItem('custom_llm_providers') || '[]')); } catch { setCustomProviders([]); }
    // Persona: show onboarding only when never chosen before.
    const savedPersona = localStorage.getItem('synop_persona');
    setPersona(savedPersona && PERSONAS[savedPersona as PersonaId] ? (savedPersona as PersonaId) : 'general');
    setShowOnboarding(!savedPersona);
  }, [language, persona]);

  const updateKey = (provider: 'gemini' | 'groq' | 'openrouter' | 'notion' | 'notionDb' | 'tavily', val: string) => {
    setKeys(prev => ({ ...prev, [provider]: val }));
    const storageKey = provider === 'notion' ? 'notion_key' : provider === 'notionDb' ? 'notion_db' : `${provider}_key`;
    localStorage.setItem(storageKey, val);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this video summary?")) return;
    
    try {
      const res = await fetch(`/api/summary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSummaries(prev => prev.filter(s => s.id !== id));
      } else {
        showToast("Failed to delete the summary.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting summary.");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder = await createFolder(newFolderName.trim(), folderColor);
    setFolders(prev => [...prev, { ...folder, count: 0 }]);
    setNewFolderName("");
    setShowFolderDialog(false);
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Delete folder "${name}"? Summaries in this folder will be unassigned.`)) return;
    await deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolder === id) setSelectedFolder(null);
  };

  const handleAssignFolder = async (summaryId: string, folderId: string | null) => {
    await assignToFolder(summaryId, folderId);
    const oldFolderId = summaries.find(s => s.id === summaryId)?.folderId;
    setSummaries(prev => prev.map(s => s.id === summaryId ? { ...s, folderId } : s));
    setFolders(prev => prev.map(f => {
      if (f.id === oldFolderId) return { ...f, count: Math.max(0, f.count - 1) };
      if (f.id === folderId) return { ...f, count: f.count + 1 };
      return f;
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = summaries.filter(s => (!selectedFolder || s.folderId === selectedFolder) && (!searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())));
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} summaries?`)) return;
    for (const id of selectedIds) {
      try { await fetch(`/api/summary/${id}`, { method: 'DELETE' }); } catch {}
    }
    setSummaries(prev => prev.filter(s => !selectedIds.has(s.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const batchAssignFolder = async (folderId: string | null) => {
    for (const id of selectedIds) {
      const summary = summaries.find(s => s.id === id);
      if (!summary) continue;
      await handleAssignFolder(id, folderId);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const parseList = (val: string | null | undefined): string[] => {
    if (!val) return [];
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
    catch { return []; }
  };

  const downloadDocument = (summary: any) => {
    const lines: string[] = [];
    lines.push(`# ${summary.title}`);
    lines.push(``);
    lines.push(`**Channel:** ${summary.channel || 'N/A'}  `);
    lines.push(`**Duration:** ${summary.duration || 'N/A'}  `);
    lines.push(`**Date:** ${new Date(summary.date).toLocaleDateString()}  `);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    if (summary.executiveSummary) {
      lines.push(`## Executive Summary`);
      lines.push(``);
      lines.push(summary.executiveSummary);
      lines.push(``);
    }

    const quotes = parseList(summary.quotes);
    if (quotes.length > 0) {
      lines.push(`## Key Quotes`);
      lines.push(``);
      quotes.forEach((q: string) => { lines.push(`> ${q}`); lines.push(``); });
    }

    const resources = parseList(summary.resources);
    if (resources.length > 0) {
      lines.push(`## Resources`);
      lines.push(``);
      resources.forEach((r: string) => { lines.push(`- ${r}`); });
      lines.push(``);
    }

    const biasAnalysis = parseList(summary.biasAnalysis);
    if (biasAnalysis.length > 0) {
      lines.push(`## Bias Analysis`);
      lines.push(``);
      biasAnalysis.forEach((b: string) => { lines.push(`- ${b}`); });
      lines.push(``);
    }

    let frameworks: any[] = [];
    try { frameworks = JSON.parse(summary.frameworks || '[]'); } catch {}
    if (frameworks.length > 0) {
      lines.push(`## Frameworks`);
      lines.push(``);
      frameworks.forEach((f: any) => {
        lines.push(`### ${f.name || ''}`);
        lines.push(``);
        lines.push(f.description || '');
        lines.push(``);
      });
    }

    let entities: any[] = [];
    try { entities = JSON.parse(summary.entities || '[]'); } catch {}
    if (entities.length > 0) {
      lines.push(`## Entities`);
      lines.push(``);
      entities.forEach((e: any) => { lines.push(`- **${e.type || ''}:** ${e.name || ''}`); });
      lines.push(``);
    }

    if (summary.verdict) {
      lines.push(`## Verdict`);
      lines.push(``);
      lines.push(summary.verdict);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`*Generated by Synop on ${new Date().toLocaleString()}*`);

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocumentAsPDF = async (summary: any) => {
    const { default: html2pdf } = await import('html2pdf.js');
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:8.5in;background:white;color:black;font-family:sans-serif;padding:40px;z-index:10000';
    container.innerHTML = `
      <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;color:#111">${summary.title}</h1>
      <p style="font-size:13px;color:#666;margin-bottom:20px">
        <strong>Channel:</strong> ${summary.channel || 'N/A'} &nbsp;•&nbsp;
        <strong>Duration:</strong> ${summary.duration || 'N/A'} &nbsp;•&nbsp;
        <strong>Date:</strong> ${new Date(summary.date).toLocaleDateString()}
      </p>
      <hr style="border:none;border-top:1px solid #ddd;margin-bottom:20px" />
      ${summary.executiveSummary ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Executive Summary</h2><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 16px">${summary.executiveSummary}</p>` : ''}
      ${(() => {
        const ki = parseList(summary.keyInsights);
        return ki.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Key Insights</h2><ul style="font-size:14px;line-height:1.6;color:#333;padding-left:20px">${ki.map((k: string) => `<li style="margin-bottom:4px">${k}</li>`).join('')}</ul>` : '';
      })()}
      ${(() => {
        const ai = parseList(summary.actionItems);
        return ai.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Action Items</h2><ul style="font-size:14px;line-height:1.6;color:#333;padding-left:20px">${ai.map((a: string) => `<li style="margin-bottom:4px">☐ ${a}</li>`).join('')}</ul>` : '';
      })()}
      ${(() => {
        const q = parseList(summary.quotes);
        return q.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Key Quotes</h2>${q.map((qt: string) => `<blockquote style="font-size:14px;line-height:1.6;color:#444;border-left:3px solid #888;padding:8px 16px;margin:8px 0;background:#f9f9f9">${qt}</blockquote>`).join('')}` : '';
      })()}
      ${(() => {
        let ts: any[] = [];
        try { ts = JSON.parse(summary.timestamps || '[]'); } catch {}
        return ts.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Timestamps</h2><table style="width:100%;border-collapse:collapse;font-size:13px;color:#333;margin-bottom:16px"><tr style="background:#f5f5f5"><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Time</th><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Topic</th><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Details</th></tr>${ts.map((t: any) => `<tr><td style="padding:6px 8px;border:1px solid #ddd">${t.time || ''}</td><td style="padding:6px 8px;border:1px solid #ddd">${t.topic || ''}</td><td style="padding:6px 8px;border:1px solid #ddd">${t.details || ''}</td></tr>`).join('')}</table>` : '';
      })()}
      ${(() => {
        const r = parseList(summary.resources);
        return r.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Resources</h2><ul style="font-size:14px;line-height:1.6;color:#333;padding-left:20px">${r.map((res: string) => `<li style="margin-bottom:4px">${res}</li>`).join('')}</ul>` : '';
      })()}
      ${summary.verdict ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Verdict</h2><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 16px">${summary.verdict}</p>` : ''}
      ${(() => {
        const ba = parseList(summary.biasAnalysis);
        return ba.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Bias Analysis</h2><ul style="font-size:14px;line-height:1.6;color:#333;padding-left:20px">${ba.map((b: string) => `<li style="margin-bottom:4px">${b}</li>`).join('')}</ul>` : '';
      })()}
      ${(() => {
        let fw: any[] = [];
        try { fw = JSON.parse(summary.frameworks || '[]'); } catch {}
        return fw.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Frameworks</h2>${fw.map((f: any) => `<h3 style="font-size:15px;font-weight:600;margin:12px 0 4px;color:#333">${f.name || ''}</h3><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 12px">${f.description || ''}</p>`).join('')}` : '';
      })()}
      ${(() => {
        let en: any[] = [];
        try { en = JSON.parse(summary.entities || '[]'); } catch {}
        return en.length ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Entities</h2><ul style="font-size:14px;line-height:1.6;color:#333;padding-left:20px">${en.map((e: any) => `<li style="margin-bottom:4px"><strong>${e.type || ''}:</strong> ${e.name || ''}</li>`).join('')}</ul>` : '';
      })()}
      ${summary.blogPost ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Blog Post</h2><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 16px">${summary.blogPost}</p>` : ''}
      ${summary.twitterThread ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">Twitter Thread</h2><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 16px">${summary.twitterThread}</p>` : ''}
      ${summary.linkedinPost ? `<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px;color:#222">LinkedIn Post</h2><p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 16px">${summary.linkedinPost}</p>` : ''}
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0" />
      <p style="font-size:11px;color:#999">Generated by Synop on ${new Date().toLocaleString()}</p>
    `;
    document.body.appendChild(container);
    try {
      await html2pdf().set({
        margin: 0.5,
        filename: `${summary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: container.scrollWidth, height: container.scrollHeight },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      }).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const renderSidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-8 pl-2 cursor-pointer" onClick={() => router.push('/')}>
        <img src="/logo.svg" alt="Synop Logo" className="w-8 h-8" />
        <span className="font-extrabold text-2xl tracking-tight">Synop</span>
      </div>

      <div className="space-y-1 mb-8">
        {tabs.map(tab => (
          <div
            key={tab.name}
            onClick={() => { setActiveTab(tab.name); setSidebarOpen(false); }}
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

      {/* Folders Section */}
      <div className="mb-8 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-4">
          <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Folders</span>
          <button onClick={() => setShowFolderDialog(true)} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <FolderPlus className="w-4 h-4 text-foreground/50 hover:text-foreground" />
          </button>
        </div>
        <div className="space-y-1">
          <div
            onClick={() => { setSelectedFolder(null); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${selectedFolder === null ? 'bg-accent text-foreground' : 'text-foreground/70 hover:bg-accent/50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>All Summaries</span>
          </div>
          {folders.length === 0 ? (
            <div className="px-3 text-xs text-foreground/40 font-medium mt-2">No folders yet.</div>
          ) : (
            folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => { setSelectedFolder(folder.id); setSidebarOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg cursor-pointer group transition-colors ${
                  selectedFolder === folder.id ? 'bg-accent text-foreground' : 'text-foreground/70 hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`w-2.5 h-2.5 rounded-full ${folder.color === 'gray' ? 'bg-gray-400' : 'bg-primary'}`} />
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/40">{folder.count}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                    className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-border/50">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center font-bold text-xs">Me</div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">Local User</span>
            <span className="text-xs font-medium text-foreground/50">Localhost Mode</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
       {/* Sidebar (desktop) */}
       <aside className="w-64 border-r border-border glass flex flex-col p-4 shrink-0 hidden md:flex z-10 animate-appear">
          {renderSidebarInner()}
       </aside>

       {/* Sidebar (mobile drawer) */}
       {sidebarOpen && (
         <div className="fixed inset-0 z-50 md:hidden">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
           <aside className="absolute left-0 top-0 h-full w-64 glass flex flex-col p-4 shadow-2xl animate-appear">
             <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-accent transition-colors">
               <X className="w-4 h-4" />
             </button>
             {renderSidebarInner()}
           </aside>
         </div>
       )}

       {/* Main Dashboard Panel */}
       <div className="flex-1 bg-background/50 p-6 md:p-12 overflow-y-auto relative">
          {/* Mobile Header (Visible only on small screens) */}
          <div className="flex md:hidden items-center justify-between mb-8 pb-4 border-b border-border animate-rise stagger-1">
             <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors" aria-label="Open menu">
                   <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                   <img src="/logo.svg" alt="Synop Logo" className="w-6 h-6" />
                   <span className="font-extrabold text-xl tracking-tight">Synop</span>
                </div>
             </div>
             <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center font-bold text-xs">Me</div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-rise stagger-1">
             <div className="hidden md:block text-[11px] font-bold text-foreground/40 uppercase tracking-[0.2em]">{today}</div>
             
             {/* Input Bar inside header */}
             <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="flex-1 md:w-96 h-12 border border-border/60 rounded-2xl glass flex items-center px-4 shadow-sm focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all hover:border-border">
                    <Play className="w-4 h-4 text-foreground/30 mr-3 shrink-0" strokeWidth={1.5} />
                    <input 
                       type="url" 
                       placeholder="Paste YouTube Link..." 
                       value={url}
                       onChange={e => setUrl(e.target.value)}
                       onKeyDown={e => e.key === "Enter" && go()}
                       className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-foreground placeholder:text-foreground/30"
                    />
                    <div className="h-8 border-l border-border/60 mx-2"></div>
                    <select
                       value={language}
                       onChange={e => setLanguage(e.target.value)}
                       className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground cursor-pointer shrink-0 w-28 md:w-auto appearance-none"
                    >
                       <option value="English">English</option>
                       <option value="Spanish">Spanish</option>
                       <option value="French">French</option>
                       <option value="German">German</option>
                       <option value="Italian">Italian</option>
                       <option value="Portuguese">Portuguese</option>
                       <option value="Hindi">Hindi</option>
                       <option value="Arabic">Arabic</option>
                       <option value="Japanese">Japanese</option>
                       <option value="Korean">Korean</option>
                       <option value="Chinese (Mandarin)">Chinese</option>
                       <option value="Russian">Russian</option>
                    </select>
                 </div>
                 <button onClick={go} className="h-12 px-6 bg-foreground text-background rounded-2xl text-[14px] font-bold shadow-xl shadow-foreground/10 hover:shadow-foreground/20 hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap group shrink-0">
                    Summarize <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                 </button>
              </div>
              <div className="w-full md:w-auto mt-3">
                 <input 
                    type="text" 
                    placeholder="Custom instruction (optional, e.g., 'Focus on AI tips', 'Summarize for a 5 year old')" 
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && go()}
                    className="w-full md:w-[500px] h-10 px-4 bg-foreground/5 border border-transparent focus:border-primary/30 focus:bg-background rounded-xl text-[12px] font-medium text-foreground placeholder:text-foreground/40 transition-all outline-none"
                 />
              </div>
           </div>
          
          <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-12 tracking-tight animate-rise stagger-2">
              Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}{userName ? `, ${userName}` : ''}
          </h2>

          {persona !== 'general' && (
            <div className="mb-8 glass border border-primary/20 bg-primary/5 rounded-2xl px-5 py-4 flex items-center gap-3 animate-rise stagger-2">
              <span className="text-2xl shrink-0">{personaDef(persona).emoji}</span>
              <div>
                <p className="text-sm font-bold text-foreground">{personaDef(persona).label} mode</p>
                <p className="text-xs text-foreground/60 mt-0.5">{personaDef(persona).dashboardHint}</p>
              </div>
              <button onClick={() => setActiveTab('Settings')} className="ml-auto shrink-0 text-[11px] font-bold text-primary hover:underline">Change</button>
            </div>
          )}

          {activeTab === "Briefing" && (
            <BriefingPanel summaries={summaries} />
          )}

          {activeTab === "Dashboard" && (
            <>
              <div className="flex flex-wrap items-center gap-4 mb-12 animate-rise stagger-3">
                 <div className="px-6 py-3 glass border border-border/50 rounded-2xl flex items-center gap-3 text-[13px] font-bold text-foreground shadow-sm hover:-translate-y-0.5 transition-transform cursor-default">
                    <Clock className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> 12hrs <span className="text-foreground/40 font-medium">Time Saved</span>
                 </div>
                 <div className="px-6 py-3 glass border border-border/50 rounded-2xl flex items-center gap-3 text-[13px] font-bold text-foreground shadow-sm hover:-translate-y-0.5 transition-transform cursor-default">
                    <CheckCircle2 className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> {summaries.length} <span className="text-foreground/40 font-medium">Videos Analyzed</span>
                 </div>
              </div>

              <div className="border border-border/50 rounded-3xl glass overflow-hidden shadow-xl shadow-foreground/5 animate-rise stagger-4">
                 <div className="flex items-center justify-between p-6 border-b border-border/50 bg-foreground/[0.02]">
                    <div className="flex items-center gap-2 text-[14px] font-bold">
                       <LayoutDashboard className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> Recent Videos
                    </div>
                    {summaries.length > 5 && (
                      <button onClick={() => setActiveTab("Summaries")} className="text-xs font-bold text-foreground/60 cursor-pointer hover:text-foreground transition-colors">See All</button>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-bold text-foreground/50 bg-background uppercase tracking-wider">
                    <div className="col-span-10 md:col-span-7 flex items-center gap-2"><FileText className="w-3 h-3" /> Video Title</div>
                    <div className="col-span-5 hidden md:flex items-center gap-2"><Users className="w-3 h-3" /> Channel</div>
                 </div>

                 {loading ? (
                   <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                   </div>
                 ) : summaries.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-16 text-foreground/50 text-sm font-medium">
                      <Play className="w-12 h-12 text-border mb-4" />
                      No videos summarized yet. Paste a link above to get started!
                   </div>
                 ) : (
                    summaries.slice(0, 5).map((row) => (
                       <div 
                          key={row.id} 
                          onClick={() => router.push(`/summary/${row.videoId}`)}
                          className="grid grid-cols-12 gap-4 p-5 border-b border-border last:border-0 items-center text-sm font-medium hover:bg-accent/50 transition-colors cursor-pointer group"
                       >
                          <div className="col-span-10 md:col-span-7 flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-foreground/50 shrink-0">
                                <Play className="w-3 h-3" />
                             </div>
                             <div className="min-w-0">
                                <div className="truncate">{row.title}</div>
                                <div className="text-xs text-foreground/50 md:hidden mt-0.5 truncate">{row.channel}</div>
                             </div>
                          </div>
                          <div className="col-span-5 hidden md:flex items-center gap-2 text-foreground/70 min-w-0">
                             <span className="truncate">{row.channel}</span>
                          </div>
                       </div>
                    ))
                 )}
              </div>
            </>
          )}

          {activeTab === "Summaries" && (
            <>
              {selectedFolder && (
                <div className="mb-4 px-1 text-sm font-bold text-foreground/60 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  {folders.find(f => f.id === selectedFolder)?.name || "Folder"}
                  <button onClick={() => setSelectedFolder(null)} className="ml-2 text-xs text-foreground/40 hover:text-foreground transition-colors">Clear filter</button>
                </div>
              )}

              {/* Search bar */}
              <div className="mb-4 animate-rise stagger-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                    <input
                      type="text"
                      placeholder="Search summaries by title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 glass border border-border/50 rounded-2xl text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setSelectMode(!selectMode)}
                    className={`h-12 px-5 rounded-2xl text-sm font-bold transition-all ${selectMode ? 'bg-primary text-white' : 'glass border border-border/50 text-foreground/70 hover:bg-accent'}`}
                  >
                    {selectMode ? 'Done' : 'Select'}
                  </button>
                </div>
              </div>

              {/* Batch actions bar */}
              {selectMode && selectedIds.size > 0 && (
                <div className="mb-4 p-4 glass border border-primary/30 rounded-2xl flex items-center gap-4 animate-rise">
                  <span className="text-sm font-bold text-foreground">{selectedIds.size} selected</span>
                  <div className="h-6 w-px bg-border/50" />
                  <button onClick={batchDelete} className="text-sm font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-2">
                    <Trash className="w-4 h-4" /> Delete
                  </button>
                  <div className="h-6 w-px bg-border/50" />
                  <select
                    onChange={(e) => batchAssignFolder(e.target.value || null)}
                    className="text-sm font-bold bg-transparent border border-border/30 rounded-lg px-3 py-1.5 text-foreground outline-none cursor-pointer"
                  >
                    <option value="">Move to folder...</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}

              <div className="border border-border/50 rounded-3xl glass overflow-hidden shadow-xl shadow-foreground/5 animate-rise stagger-4">
                 <div className="flex items-center justify-between p-6 border-b border-border/50 bg-foreground/[0.02]">
                    <div className="flex items-center gap-2 text-[14px] font-bold">
                       <Folder className="w-4 h-4 text-foreground/40" strokeWidth={1.5} /> All Summaries
                    </div>
                    <span className="text-xs text-foreground/40 font-medium">{
                      summaries.filter(s => (!selectedFolder || s.folderId === selectedFolder) && (!searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))).length
                    } videos</span>
                 </div>
                 
                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-bold text-foreground/50 bg-background uppercase tracking-wider">
                    {selectMode && (
                      <div className="col-span-1 flex items-center">
                        <input type="checkbox" checked={selectedIds.size > 0 && summaries.filter(s => (!selectedFolder || s.folderId === selectedFolder) && (!searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))).every(s => selectedIds.has(s.id))} onChange={toggleSelectAll} className="w-4 h-4 rounded border-border/50 accent-primary cursor-pointer" />
                      </div>
                    )}
                    <div className={`${selectMode ? 'col-span-9 md:col-span-4' : 'col-span-10 md:col-span-5'} flex items-center gap-2`}><FileText className="w-3 h-3" /> Video Title</div>
                    <div className="col-span-3 hidden md:flex items-center gap-2"><Users className="w-3 h-3" /> Channel</div>
                    <div className="col-span-2 hidden md:flex items-center gap-2"><Folder className="w-3 h-3" /> Folder</div>
                    <div className="col-span-2 md:col-span-2 flex justify-end items-center gap-2"></div>
                 </div>

                 {loading ? (
                   <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                   </div>
                 ) : summaries.filter(s => (!selectedFolder || s.folderId === selectedFolder) && (!searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-16 text-foreground/50 text-sm font-medium">
                      <Folder className="w-12 h-12 text-border mb-4" />
                      {searchQuery ? "No summaries match your search." : selectedFolder ? "No videos in this folder." : "No videos summarized yet. Paste a link above to get started!"}
                   </div>
                 ) : (
                    summaries.filter(s => (!selectedFolder || s.folderId === selectedFolder) && (!searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))).map((row) => (
                       <div 
                          key={row.id} 
                          onClick={() => !selectMode && router.push(`/summary/${row.videoId}`)}
                          className={`grid grid-cols-12 gap-4 p-5 border-b border-border last:border-0 items-center text-sm font-medium transition-colors ${selectMode ? 'cursor-default' : 'cursor-pointer hover:bg-accent/50 group'}`}
                       >
                          {selectMode && (
                            <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="w-4 h-4 rounded border-border/50 accent-primary cursor-pointer" />
                            </div>
                          )}
                          <div className={`${selectMode ? 'col-span-9 md:col-span-4' : 'col-span-10 md:col-span-5'} flex items-center gap-4`}>
                             <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-foreground/50 shrink-0">
                                <Play className="w-3 h-3" />
                             </div>
                             <div className="min-w-0">
                                <div className="truncate text-foreground">{row.title}</div>
                                <div className="text-xs text-foreground/50 md:hidden mt-0.5 truncate">{row.channel}</div>
                             </div>
                          </div>
                          <div className="col-span-3 hidden md:flex items-center gap-2 text-foreground/70 min-w-0">
                             <span className="truncate">{row.channel}</span>
                          </div>
                          <div className="col-span-2 hidden md:flex items-center gap-1">
                            <select
                              value={row.folderId || ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleAssignFolder(row.id, e.target.value || null)}
                              className="text-[10px] bg-transparent border border-border/30 rounded-md px-1.5 py-1 text-foreground/60 outline-none cursor-pointer hover:border-border transition-colors"
                            >
                              <option value="">No folder</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2 md:col-span-2 flex justify-end items-center gap-1">
                             <button
                                onClick={(e) => { e.stopPropagation(); downloadDocument(row); }}
                                className="w-8 h-8 rounded-lg bg-foreground/5 hover:bg-primary text-foreground/50 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Download as Markdown"
                             >
                                <Download className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={(e) => handleDelete(row.id, e)} 
                                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Delete Summary"
                             >
                                <Trash className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
            </>
          )}

          {activeTab === "Channels" && (
            <ChannelsPanel language={language} />
          )}

          {activeTab === "Chats" && (
            <DashboardChat summaries={summaries} />
          )}

          {activeTab === "Documents" && (
             <div className="space-y-6 animate-rise stagger-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Your Documents</h3>
                  <span className="text-xs text-foreground/40 font-medium">{summaries.length} document{summaries.length !== 1 ? 's' : ''}</span>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : summaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-foreground/50 text-sm font-medium">
                    <FileText className="w-12 h-12 text-border mb-4" />
                    No documents yet. Summarize a video first!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {summaries.map((summary, idx) => (
                      <div
                        key={summary.id}
                        style={{ animationDelay: `${150 + (idx * 50)}ms` }}
                        className="glass border border-border/50 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5 transition-all group animate-rise"
                      >
                        <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-foreground group-hover:text-background transition-all shadow-sm">
                          <File className="w-6 h-6 text-foreground/50 group-hover:text-background transition-colors" strokeWidth={1.25} />
                        </div>
                        <h3 className="font-bold text-[14px] text-foreground truncate" title={summary.title}>{summary.title}.md</h3>
                        <p className="text-[11px] text-foreground/40 mt-1.5 font-medium">
                          {summary.channel} • {new Date(summary.date).toLocaleDateString()}
                        </p>
                        <div className="mt-6 pt-5 border-t border-border/30 flex justify-center items-center gap-3">
                          <button
                            onClick={() => downloadDocument(summary)}
                            className="text-[11px] font-bold text-foreground/60 hover:text-primary transition-colors tracking-wider uppercase flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all"
                            title="Download as Markdown"
                          >
                            <Download className="w-3 h-3" strokeWidth={2} /> .md
                          </button>
                          <span className="text-[10px] text-foreground/20">|</span>
                          <button
                            onClick={() => downloadDocumentAsPDF(summary)}
                            className="text-[11px] font-bold text-foreground/60 hover:text-primary transition-colors tracking-wider uppercase flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all"
                            title="Download as PDF"
                          >
                            <File className="w-3 h-3" strokeWidth={2} /> PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}

          {activeTab === "Settings" && keysLoaded && (
             <div className="max-w-2xl animate-rise stagger-3 space-y-6">
                <div className="glass border border-border/50 rounded-3xl p-8 shadow-xl shadow-foreground/5">
                   <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                     <User className="w-5 h-5 text-primary" /> Profile
                   </h3>
                   <div className="space-y-4">
                     <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Your Name</label>
                     <div className="flex items-center gap-3">
                       <input
                         type="text"
                         placeholder="Enter your name"
                         value={userName}
                         onChange={(e) => {
                           setUserName(e.target.value);
                           localStorage.setItem('synop_user_name', e.target.value);
                         }}
                         className="flex-1 h-12 glass border border-border/50 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                       />
                        <button
                          onClick={() => {
                            localStorage.setItem('synop_user_name', userName);
                            showToast('Name saved!');
                          }}
                         className="h-12 px-6 bg-foreground text-background rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform shrink-0"
                       >
                         Save
                       </button>
                     </div>
                     <p className="text-xs text-foreground/50">This name will appear in the dashboard greeting.</p>
                   </div>
                </div>
                <div className="glass border border-border/50 rounded-3xl p-8 shadow-xl shadow-foreground/5">
                   <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                     <Zap className="w-5 h-5 text-primary" /> Bring Your Own Keys
                   </h3>
                   <p className="text-sm text-foreground/50 mb-8 leading-relaxed">
                     Bypass the server rate limits by providing your own API keys. 
                     Keys are stored securely in your browser's local storage and sent directly to the API route.
                   </p>
                   
                   <div className="space-y-6">
                      <div>
                         <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Gemini API Key</label>
                         <input 
                            type="password"
                            placeholder="AIzaSy..."
                            value={keys.gemini}
                            onChange={e => updateKey('gemini', e.target.value)}
                            className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Groq API Key</label>
                         <input 
                            type="password"
                            placeholder="gsk_..."
                            value={keys.groq}
                            onChange={e => updateKey('groq', e.target.value)}
                            className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                         />
                      </div>
                       <div>
                          <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2 block">OpenRouter API Key (Global Fallback)</label>
                          <input 
                            type="password" 
                            value={keys.openrouter}
                            onChange={(e) => updateKey('openrouter', e.target.value)}
                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="sk-or-v1-..."
                          />
                       </div>
                      
                      <div className="pt-6 border-t border-border/50">
                         <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-foreground/50" /> Integrations
                         </h4>
                         <div className="space-y-4">
                            <div>
                               <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Tavily API Key (optional — for Freshness fact-checks)</label>
                               <input
                                  type="password"
                                  placeholder="tvly-..."
                                  value={keys.tavily}
                                  onChange={e => updateKey('tavily', e.target.value)}
                                  className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Notion API Key</label>
                               <input 
                                  type="password"
                                  placeholder="secret_..."
                                  value={keys.notion}
                                  onChange={e => updateKey('notion', e.target.value)}
                                  className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Notion Database ID</label>
                               <input 
                                  type="text"
                                  placeholder="abcdef123456..."
                                  value={keys.notionDb}
                                  onChange={e => updateKey('notionDb', e.target.value)}
                                  className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Your Role (persona) */}
                <div className="glass border border-border/50 rounded-3xl p-8 shadow-xl shadow-foreground/5">
                   <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                     <Users className="w-5 h-5 text-primary" /> Your Role
                   </h3>
                   <p className="text-sm text-foreground/50 mb-5">Which workflow do you want Synop tuned for?</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {PERSONA_LIST.map(p => (
                       <button
                         key={p.id}
                         onClick={() => { savePersona(p.id); setPersona(p.id); }}
                         className={`text-left p-4 rounded-2xl border transition-all ${persona === p.id ? 'bg-primary/10 border-primary/40' : 'bg-foreground/5 border-border/40 hover:border-border/70'}`}
                       >
                         <div className="flex items-center gap-2 font-bold text-sm">
                           <span className="text-xl">{p.emoji}</span> {p.label}
                         </div>
                         <p className="text-[11px] text-foreground/50 mt-1 leading-relaxed">{p.tagline}</p>
                       </button>
                     ))}
                   </div>
                </div>

                {/* Custom AI Providers */}
                <div className="glass border border-border/50 rounded-3xl p-8 shadow-xl shadow-foreground/5">
                   <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                     <Cpu className="w-5 h-5 text-primary" /> Custom AI Providers
                   </h3>
                   <p className="text-sm text-foreground/50 mb-6 leading-relaxed">
                     Add any OpenAI-compatible endpoint — OpenAI, DeepSeek, Ollama, Together, your own server.
                     Custom providers are tried <strong>first</strong>, then the keys above.
                   </p>

                   {customProviders.length > 0 && (
                     <div className="space-y-2 mb-6">
                       {customProviders.map((p, i) => (
                         <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-foreground/5 border border-border/40">
                           <div className="min-w-0">
                             <div className="font-bold text-sm truncate">{p.name}</div>
                             <div className="text-[11px] text-foreground/50 truncate">{p.baseUrl} · {p.models}</div>
                           </div>
                           <button onClick={() => saveCustomProviders(customProviders.filter((_, idx) => idx !== i))} className="text-foreground/40 hover:text-red-500 text-xs font-bold shrink-0">Remove</button>
                         </div>
                       ))}
                     </div>
                   )}

                   <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Provider Name</label>
                          <input type="text" placeholder="e.g. My DeepSeek" value={cpName} onChange={e => setCpName(e.target.value)} className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Base URL</label>
                          <input type="text" placeholder="https://api.deepseek.com/v1" value={cpBaseUrl} onChange={e => setCpBaseUrl(e.target.value)} className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
                       </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">API Key</label>
                        <input type="password" placeholder="sk-..." value={cpApiKey} onChange={e => setCpApiKey(e.target.value)} className="w-full h-12 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Models (tried in order)</label>
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={fetchModels}
                            disabled={fetchingModels || !cpBaseUrl.trim()}
                            className="h-10 px-4 bg-primary text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {fetchingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {fetchingModels ? 'Fetching…' : 'Fetch live models'}
                          </button>
                          <button onClick={useSelectedModels} disabled={selectedModels.length === 0} className="h-10 px-4 bg-foreground/10 text-foreground rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Use selected ({selectedModels.length})
                          </button>
                        </div>
                        {modelsError && <p className="text-xs font-medium text-red-500 mb-2">{modelsError}</p>}
                        {availableModels.length > 0 && (
                          <div className="mb-2 max-h-44 overflow-y-auto border border-border/50 rounded-xl p-2 space-y-0.5 bg-background/40">
                            {availableModels.map(m => (
                              <label key={m} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-foreground/5 cursor-pointer">
                                <input type="checkbox" checked={selectedModels.includes(m)} onChange={() => toggleModel(m)} className="accent-primary w-4 h-4" />
                                <span className="text-[13px] font-medium text-foreground/80 truncate">{m}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {cpModels && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {cpModels.split(',').map(m => m.trim()).filter(Boolean).map((m, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary">{m}</span>
                            ))}
                          </div>
                        )}
                        <input type="text" placeholder="…or type manually, comma-separated" value={cpModels} onChange={e => setCpModels(e.target.value)} className="w-full h-11 glass border border-border/50 rounded-xl px-4 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
                     </div>
                     <button
                       onClick={() => {
                         const models = cpModels.split(',').map(m => m.trim()).filter(Boolean);
                         if (!cpName.trim() || !cpBaseUrl.trim() || !cpApiKey.trim() || models.length === 0) return;
                         saveCustomProviders([...customProviders, { name: cpName.trim(), baseUrl: cpBaseUrl.trim(), apiKey: cpApiKey.trim(), models: models.join(', ') }]);
                         setCpName(""); setCpBaseUrl(""); setCpApiKey(""); setCpModels("");
                       }}
                       className="w-full h-12 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                     >
                       <Plus className="w-4 h-4" /> Add Provider
                     </button>
                     {cpSaved && <p className="text-xs font-bold text-green-600">Saved — new requests will use this provider first.</p>}
                   </div>
                </div>
              </div>
           )}

           {/* Toast */}
           {toast && (
             <div className="fixed bottom-8 right-8 z-[999] animate-rise">
               <div className="px-6 py-4 bg-foreground text-background rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3">
                 <CheckCircle2 className="w-4 h-4" /> {toast}
               </div>
             </div>
           )}

           {/* First-run Persona Onboarding */}
          {showOnboarding && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="glass border border-border/50 rounded-3xl p-8 shadow-2xl w-full max-w-2xl animate-rise max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-3xl font-serif font-extrabold text-foreground">Who are you?</h3>
                  <p className="text-sm text-foreground/50 mt-2 max-w-md mx-auto">Synop reshapes itself around your workflow. Pick the closest fit — you can change it anytime in Settings.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERSONA_LIST.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { savePersona(p.id); setPersona(p.id); setShowOnboarding(false); showToast(`${p.label} mode activated`); }}
                      className="group text-left glass border border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{p.emoji}</span>
                        <span className="font-bold text-foreground">{p.label}</span>
                      </div>
                      <p className="text-xs text-foreground/50 leading-relaxed">{p.onboardingBlurb}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

           {/* Folder Creation Dialog */}
          {showFolderDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="glass border border-border/50 rounded-3xl p-8 shadow-2xl w-full max-w-md mx-4 animate-rise">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">New Folder</h3>
                  <button onClick={() => setShowFolderDialog(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-foreground/60" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  className="w-full h-12 glass border border-border/50 rounded-2xl px-5 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all mb-4"
                  autoFocus
                />
                <div className="flex items-center gap-3 mb-6">
                  {["blue", "green", "purple", "orange", "pink", "gray"].map(color => (
                    <button
                      key={color}
                      onClick={() => setFolderColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        color === "blue" ? "bg-blue-500" :
                        color === "green" ? "bg-green-500" :
                        color === "purple" ? "bg-purple-500" :
                        color === "orange" ? "bg-orange-500" :
                        color === "pink" ? "bg-pink-500" :
                        "bg-gray-400"
                      } ${folderColor === color ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground/40 scale-110' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFolderDialog(false)}
                    className="flex-1 h-12 border border-border/50 rounded-2xl text-sm font-bold text-foreground/60 hover:bg-accent transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 h-12 bg-foreground text-background rounded-2xl text-sm font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
       </div>
    </div>
  );
}

// ---- Fully functional Dashboard Chat component ----
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function DashboardChat({ summaries }: { summaries: any[] }) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>('global');
  const [messages, setMessages] = useState<{id: string; role: 'user' | 'assistant'; content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSummary = selectedVideoId === 'global' ? { title: 'Global Search', channel: 'Search across your entire library' } : summaries.find(s => s.videoId === selectedVideoId);

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    setMessages([]);
    setError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !selectedVideoId) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          videoId: selectedVideoId,
          persona: getPersona(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat request failed');
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-260px)] min-h-[500px] animate-rise stagger-3">
      {/* Chats List Pane */}
      <div className="w-full lg:w-80 flex flex-col glass border border-border/50 rounded-3xl shadow-xl shadow-foreground/5 overflow-hidden shrink-0">
        <div className="p-6 border-b border-border/50 bg-foreground/[0.02] font-bold flex justify-between items-center text-sm">
          Your Summaries
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {summaries.length === 0 && (
            <div className="text-center text-foreground/40 text-sm mt-10 px-4">
              No summaries yet. Summarize a video first to start chatting!
            </div>
          )}
          <div
            onClick={() => handleSelectVideo('global')}
            className={`p-4 rounded-2xl cursor-pointer transition-all ${
              selectedVideoId === 'global'
                ? 'bg-primary/10 border border-primary/20 shadow-sm'
                : 'hover:bg-foreground/5 border border-transparent'
            }`}
          >
            <div className="text-[13px] font-bold text-primary truncate flex items-center gap-2">
              <Search className="w-3 h-3" /> Global Search
            </div>
            <div className="text-[11px] text-foreground/50 mt-1.5 truncate font-medium">Ask about all videos</div>
          </div>
          {summaries.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelectVideo(s.videoId)}
              className={`p-4 rounded-2xl cursor-pointer transition-all ${
                selectedVideoId === s.videoId
                  ? 'bg-foreground/5 border border-border/50 shadow-sm'
                  : 'hover:bg-foreground/5 border border-transparent'
              }`}
            >
              <div className="text-[13px] font-bold text-foreground truncate">{s.title}</div>
              <div className="text-[11px] text-foreground/50 mt-1.5 truncate font-medium">{s.channel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window Pane */}
      <div className="flex-1 flex flex-col glass border border-border/50 rounded-3xl shadow-xl shadow-foreground/5 overflow-hidden relative">
        {selectedSummary ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50 bg-foreground/[0.02]">
              <div className="text-[13px] font-bold truncate">{selectedSummary.title}</div>
              <div className="text-[11px] text-foreground/50 font-medium">{selectedSummary.channel}</div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-foreground/30 text-sm mt-16">
                  <Zap className="w-8 h-8 mx-auto mb-4 text-foreground/20" />
                  <p className="font-bold text-foreground/40">Ask anything about this video</p>
                  <p className="mt-1">Timestamps, key points, deeper analysis...</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                    m.role === 'user'
                      ? 'glass border border-border/50'
                      : 'bg-foreground text-background shadow-lg shadow-foreground/20'
                  }`}>
                    {m.role === 'user' ? 'U' : <Zap className="w-4 h-4" strokeWidth={2} />}
                  </div>
                  <div className={`p-5 rounded-3xl rounded-tl-sm text-[14px] font-medium max-w-[80%] shadow-sm ${
                    m.role === 'user'
                      ? 'bg-foreground/5 border border-border/20 text-foreground'
                      : 'glass border border-border/50 text-foreground leading-relaxed prose prose-sm prose-p:leading-relaxed'
                  }`}>
                    {m.role === 'user' ? m.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center shrink-0 text-background shadow-lg shadow-foreground/20">
                    <Zap className="w-4 h-4 animate-pulse" strokeWidth={2} />
                  </div>
                  <div className="glass border border-border/50 p-5 rounded-3xl rounded-tl-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl p-4 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border/50 bg-foreground/[0.02]">
              <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything about this summary..."
                  className="w-full h-14 glass border border-border/50 rounded-2xl pl-5 pr-14 text-[14px] font-medium outline-none focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5 shadow-sm transition-all placeholder:text-foreground/30"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-2 w-10 h-10 bg-foreground rounded-xl flex items-center justify-center text-background hover:scale-105 transition-transform shadow-lg shadow-foreground/10 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/30 text-sm">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-foreground/15" />
              <p className="font-bold text-foreground/40">Select a summary to start chatting</p>
              <p className="mt-1">Pick a video from the left panel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
