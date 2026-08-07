"use client";

import Navbar from "@/components/Navbar";
import { Copy, Download, Share2, Clock, CheckCircle2, Loader2, AlertCircle, FileText, ArrowLeft, Lightbulb, ListTodo, Bookmark, Cpu, Quote, BrainCircuit, Boxes, Scale, Target, PenTool, Video, GraduationCap, Gauge, Tags, Gavel, ShieldCheck, Database, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState, useRef, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { aiHeaders } from "@/lib/client-ai";
import { getPersona, personaDef, type PersonaId } from "@/lib/persona";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import YouTube from 'react-youtube';

import { MessageSquare, Send, X, ExternalLink, Play, Pause, Network } from 'lucide-react';
import dynamic from 'next/dynamic';

const MermaidGraph = dynamic(() => import('@/components/MermaidGraph'), { ssr: false });
const FrameworkDiagram = dynamic(() => import('@/components/FrameworkDiagram'), { ssr: false });
const HandwrittenNotes = dynamic(() => import('@/components/HandwrittenNotes'), { ssr: false });
import { entityGraphToMermaid } from '@/lib/phase2/entityGraph';

interface SummaryData {
  executiveSummary: string;
  quotes: string[];
  resources: string[];
  biasAnalysis?: string[];
  frameworks?: { name: string; description: string }[];
  entities?: { type: string; name: string }[];
  mindMap?: string;
  verdict: string;
}

interface ApiResponse {
  videoId: string;
  meta: { title: string; author_name: string; thumbnail_url: string } | null;
  transcript: string | null;
  summary: SummaryData | null;
  notes: string | null;
  signalDensity?: SignalDensityData | null;
  topicClusters?: TopicClusterData[] | null;
  debateMatrix?: DebateMatrixData | null;
  freshness?: FreshnessData[] | null;
  entityGraph?: EntityGraphData | null;
  aiError: string | null;
  error?: string;
}

interface EntityGraphData {
  nodes: { id: string; name: string; type: string; degree: number; mentions: number; kind: 'entity' | 'topic' }[];
  edges: { source: string; target: string; weight: number; kind: 'cooccur' | 'membership' }[];
}

// ── Phase 2 (next-gen) payload shapes ─────────────────────────────────────
interface SignalDensityData {
  density_score: number;
  value_minutes: number;
  total_minutes: number;
  high_signal_transcript: string;
  removed_segments: { type: string; count: number; approx_minutes: number }[];
}

interface TopicClusterData {
  topic: string;
  summary: string;
  count: number;
}

interface DebateMatrixData {
  multiSpeaker: boolean;
  speakers: { name: string; stance: string; claims: string[] }[];
  contentions: {
    topic: string;
    speaker_a: string;
    speaker_b: string;
    point_of_contention: string;
    alignment: 'AGREE' | 'DISAGREE';
  }[];
}

interface FreshnessData {
  claim: string;
  entity: string;
  status: 'VALIDATED' | 'CONTEXT_CHANGED' | 'DEBUNKED_OUTDATED';
  note: string;
  sources: string[];
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
       onClick={onClick} 
       className={`relative px-5 py-3 text-[13px] tracking-wide uppercase font-bold transition-all whitespace-nowrap cursor-pointer rounded-2xl flex items-center gap-2 ${active ? "bg-foreground text-background shadow-xl shadow-foreground/10 hover:-translate-y-0.5" : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}

const ALL_TABS = [
  { id: "mindmap", label: "Knowledge Graph", icon: <Network className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "topics", label: "Topics", icon: <Tags className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "debate", label: "Debate", icon: <Gavel className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "frameworks", label: "Frameworks", icon: <Boxes className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "bias", label: "Bias & Critique", icon: <Scale className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "quotes", label: "Quotes", icon: <Quote className="w-4 h-4" strokeWidth={1.5} /> },
  { id: "notes", label: "Study Mode", icon: <GraduationCap className="w-4 h-4" strokeWidth={1.5} /> }
];

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { language: contextLanguage } = useLanguage();
  // Context language wins (set globally via Navbar); fall back to URL ?lang= param
  const language = contextLanguage || searchParams.get('lang') || 'English';
  const customPrompt = searchParams.get('prompt') || '';
  
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("mindmap");
  // Persona (from onboarding): reshapes which tabs lead.
  const [persona, setPersona] = useState<PersonaId>('general');

  useEffect(() => {
    const p = getPersona();
    setPersona(p);
    setActiveTab(personaDef(p).defaultTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportingNotion, setExportingNotion] = useState(false);
  const [notionResult, setNotionResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  // Study Mode (flashcards + quiz)
  const [studyMode, setStudyMode] = useState<'cards' | 'quiz' | 'notes'>('cards');
  const [cardIdx, setCardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  // Handwritten notes (Phase 3)
  const [handwrittenNotes, setHandwrittenNotes] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const loadHandwrittenNotes = async () => {
    if (handwrittenNotes || notesLoading) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          ...aiHeaders(),
        },
        body: JSON.stringify({ videoId: id, language, persona: getPersona() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to generate notes');
      setHandwrittenNotes(j.notes);
    } catch (err: any) {
      console.error('[notes]', err);
      setNotesError(err.message || 'Failed to generate notes');
    } finally {
      setNotesLoading(false);
    }
  };
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // ── Phase 2: progressive enrichment state ───────────────────────────────
  const [signalDensity, setSignalDensity] = useState<SignalDensityData | null>(null);
  const [topicClusters, setTopicClusters] = useState<TopicClusterData[] | null>(null);
  const [debateMatrix, setDebateMatrix] = useState<DebateMatrixData | null>(null);
  const [freshness, setFreshness] = useState<FreshnessData[] | null>(null);
  const [entityGraph, setEntityGraph] = useState<EntityGraphData | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const enrichStartedRef = useRef<string>('');

  // ── Sync-to-Knowledge-Base modal state ──────────────────────────────────
  const [showSync, setShowSync] = useState(false);
  const [syncingObsidian, setSyncingObsidian] = useState(false);
  const [obsidianResult, setObsidianResult] = useState<string | null>(null);

  const runEnrich = async () => {
    setEnriching(true);
    setEnrichError(null);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: {
          ...aiHeaders(),
        },
        body: JSON.stringify({ videoId: id, language, persona: getPersona() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Enrichment failed');
      setSignalDensity(j.signalDensity ?? null);
      setTopicClusters(j.topicClusters ?? null);
      setDebateMatrix(j.debateMatrix ?? null);
      setFreshness(j.freshness ?? null);
      setEntityGraph(j.entityGraph ?? null);
    } catch (err: any) {
      console.error('[enrich]', err);
      setEnrichError(err.message || 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // After the core summary loads, progressively compute the Phase 2 features.
  useEffect(() => {
    if (loading || !data) return;
    const allPresent = signalDensity && topicClusters && debateMatrix && freshness;
    if (allPresent) return;
    if (enrichStartedRef.current === id + '|' + language) return;
    enrichStartedRef.current = id + '|' + language;
    runEnrich();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, id, language]);

  // YouTube Player State
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const requestRef = useRef<number | undefined>(undefined);

  const updateTime = () => {
    if (youtubePlayer) {
      setCurrentVideoTime(youtubePlayer.getCurrentTime() || 0);
    }
    requestRef.current = requestAnimationFrame(updateTime);
  };

  useEffect(() => {
    if (youtubePlayer) {
      requestRef.current = requestAnimationFrame(updateTime);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [youtubePlayer]);

  // Chat state (no SDK dependency)
  const [chatMessages, setChatMessages] = useState<{id: string; role: 'user' | 'assistant'; content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...aiHeaders(),
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          videoId: id,
          language,
          persona: getPersona(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: data.reply };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setChatError(err.message || 'Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const generateMarkdown = () => {
    if (!data?.summary) return "";
    const s = data.summary;
    let md = `# ${data.meta?.title || 'Summary'}\n\n## Executive Summary\n${s.executiveSummary || ''}\n\n`;
    if (signalDensity) {
      md += `## Signal Density: ${signalDensity.density_score}%\n`;
      md += `> ${signalDensity.value_minutes} minutes of real value from a ${signalDensity.total_minutes}-minute video.\n\n`;
      if (signalDensity.removed_segments.length) {
        md += signalDensity.removed_segments.map(r => `- Removed ${r.approx_minutes} min of ${r.type.replace(/_/g, ' ').toLowerCase()}`).join('\n') + '\n\n';
      }
    }
    if (topicClusters && topicClusters.length > 0) {
      md += `## Topics\n`;
      topicClusters.forEach(t => { md += `### ${t.topic}\n${t.summary}\n\n`; });
    }
    if (freshness && freshness.length > 0) {
      md += `## Freshness Check\n`;
      freshness.forEach(f => {
        const badge = f.status === 'DEBUNKED_OUTDATED' ? '🔴' : f.status === 'CONTEXT_CHANGED' ? '🟡' : '🟢';
        md += `- ${badge} ${f.claim} — ${f.note}\n`;
      });
      md += `\n`;
    }
    if (s.quotes && Array.isArray(s.quotes)) {
      md += `## Quotes\n${s.quotes.map(q => `> ${q}`).join('\n\n')}\n\n`;
    }
    if (s.resources && Array.isArray(s.resources)) {
      md += `## Resources\n${s.resources.map(r => `- ${r}`).join('\n')}\n\n`;
    }
    if (s.frameworks && Array.isArray(s.frameworks)) {
      md += `## Frameworks\n${s.frameworks.map(f => `- **${f.name}**: ${f.description}`).join('\n')}\n\n`;
    }
    if (s.biasAnalysis && Array.isArray(s.biasAnalysis)) {
      md += `## Bias & Critique\n${s.biasAnalysis.map(b => `- ${b}`).join('\n')}\n\n`;
    }
    md += `## Verdict\n${s.verdict || ''}`;
    return md;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      showToast("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownload = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Summary-${(data?.meta?.title || 'summary').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!data?.summary) return;
    setIsExportingPDF(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const s = data.summary;
      const title = data.meta?.title || 'Summary';
      const channel = data.meta?.author_name || '';

      const esc = (str: string) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const renderList = (arr: string[] | undefined) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
        return arr.map(i => `<li style="margin-bottom:6px">${esc(i)}</li>`).join('');
      };

      let bodyHtml = `<div style="width:7.5in;background:#fff;color:#111;font-family:Georgia,serif;padding:40px">`;
      bodyHtml += `<h1 style="font-size:28px;font-weight:700;margin-bottom:6px;color:#000">${esc(title)}</h1>`;
      bodyHtml += `<p style="font-size:14px;color:#555;margin-bottom:24px"><strong>Channel:</strong> ${esc(channel)}</p>`;

      if (s.executiveSummary) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Executive Summary</h2>`;
        bodyHtml += `<p style="font-size:14px;line-height:1.7;margin-bottom:20px">${esc(s.executiveSummary)}</p>`;
      }
      if (s.quotes && s.quotes.length > 0) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Quotes</h2>`;
        bodyHtml += s.quotes.map(q => `<blockquote style="font-size:14px;line-height:1.6;color:#444;border-left:3px solid #888;padding:10px 16px;margin:10px 0;background:#f5f5f5">${esc(q)}</blockquote>`).join('');
      }
      if (s.resources && s.resources.length > 0) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Resources</h2>`;
        bodyHtml += `<ul style="padding-left:20px">${renderList(s.resources)}</ul>`;
      }
      if (s.biasAnalysis && s.biasAnalysis.length > 0) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Bias Analysis</h2>`;
        bodyHtml += `<ul style="padding-left:20px">${renderList(s.biasAnalysis)}</ul>`;
      }
      if (s.verdict) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Verdict</h2>`;
        bodyHtml += `<p style="font-size:15px;font-weight:600;font-style:italic;color:#333;margin-bottom:20px">${esc(s.verdict)}</p>`;
      }
      if (s.frameworks && s.frameworks.length > 0) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Frameworks</h2>`;
        bodyHtml += s.frameworks.map(f => `<h3 style="font-size:16px;font-weight:600;margin:14px 0 4px;color:#222">${esc(f.name || '')}</h3><p style="font-size:14px;line-height:1.6;margin:0 0 12px">${esc(f.description || '')}</p>`).join('');
      }
      if (s.entities && s.entities.length > 0) {
        bodyHtml += `<h2 style="font-size:20px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;margin:24px 0 12px">Entities</h2>`;
        bodyHtml += `<ul style="padding-left:20px">${s.entities.map(e => `<li style="margin-bottom:4px"><strong>${esc(e.type || '')}:</strong> ${esc(e.name || '')}</li>`).join('')}</ul>`;
      }
      bodyHtml += `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />`;
      bodyHtml += `<p style="font-size:11px;color:#999">Generated by Synop on ${new Date().toLocaleString()}</p>`;
      bodyHtml += `</div>`;

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:0;top:0;width:8.5in;height:11in;border:none;z-index:-1;pointer-events:none';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(`<html><head><style>body{margin:0;background:#fff}</style></head><body>${bodyHtml}</body></html>`);
      iframeDoc.close();

      await new Promise(r => setTimeout(r, 200));

      const opt = {
        margin: 1,
        filename: `Summary-${(data?.meta?.title || 'summary').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: iframeDoc.body.scrollWidth, height: iframeDoc.body.scrollHeight },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(iframeDoc.body).save();
      document.body.removeChild(iframe);
    } catch (err) {
      console.error("PDF generation failed:", err);
      const mdContent = generateMarkdown();
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Summary-${(data?.meta?.title || 'summary').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportNotion = async () => {
    setExportingNotion(true);
    setNotionResult(null);
    try {
      const res = await fetch('/api/export/notion', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-notion-key': localStorage.getItem('notion_key') || '',
          'x-notion-db': localStorage.getItem('notion_db') || ''
        },
        body: JSON.stringify({ videoId: id, language })
      });
      const data = await res.json();
      if (data.success) {
        setNotionResult('Exported to Notion!');
      } else {
        setNotionResult(data.error || 'Export failed');
      }
    } catch (err: any) {
      setNotionResult(err.message || 'Export failed');
    } finally {
      setExportingNotion(false);
    }
  };

  const handleSyncObsidian = async () => {
    setSyncingObsidian(true);
    setObsidianResult(null);
    try {
      const res = await fetch('/api/export/obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id, language, persona: getPersona() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Obsidian export failed');

      if (data.wroteToVault) {
        setObsidianResult(`Saved to vault → ${data.path}`);
      } else {
        // No server-side vault path configured → download the .md file.
        const blob = new Blob([data.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || 'summary.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setObsidianResult('Downloaded — drop it into any Obsidian vault folder.');
      }
    } catch (err: any) {
      setObsidianResult(err.message || 'Obsidian export failed');
    } finally {
      setSyncingObsidian(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!data?.summary?.executiveSummary) return;
    
    if (isPlayingAudio) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }
    
    setIsPlayingAudio(true);
    setAudioProgress('Generating realistic audio...');
    
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: data.summary.executiveSummary })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate audio');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.onended = () => setIsPlayingAudio(false);
      }
      
      audioElementRef.current.src = url;
      audioElementRef.current.play();
      setAudioProgress('');
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setIsPlayingAudio(false);
      setAudioProgress('');
    }
  };

  const seekTo = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    
    if (youtubePlayer) {
      youtubePlayer.seekTo(seconds, true);
      youtubePlayer.playVideo();
    }
  };

  useEffect(() => {
    setLoading(true); setError(null);

    fetch(`/api/summarize`, {
       method: 'POST',
       headers: aiHeaders(),
       body: JSON.stringify({ url: `https://youtube.com/watch?v=${id}`, language, customPrompt, persona: getPersona() })
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error);
        else {
          setData(j);
          setSignalDensity(j.signalDensity ?? null);
          setTopicClusters(j.topicClusters ?? null);
          setDebateMatrix(j.debateMatrix ?? null);
          setFreshness(j.freshness ?? null);
          setEntityGraph(j.entityGraph ?? null);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, language, customPrompt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + E for Export PDF
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleDownloadPDF();
      }
      // Cmd/Ctrl + D for Download MD
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDownload();
      }
      // Cmd/Ctrl + C for Copy Markdown (only if nothing is selected)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (window.getSelection()?.toString() === '') {
          e.preventDefault();
          handleCopy();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data]);

  const meta = data?.meta;
  const videoId = data?.videoId;
  const title = meta?.title ?? `Video ${id}`;
  const channel = meta?.author_name ?? "";
  const thumbnail = meta?.thumbnail_url ? meta.thumbnail_url.replace("hqdefault", "maxresdefault") : `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  const summary = data?.summary;
  const transcript = data?.transcript;

  // Study Mode deck (flashcards) + quiz, built once per summary from
  // quotes, frameworks, and bias/critique (Phase 2 will also feed topic clusters).
  const studyDeck = useMemo(() => {
    if (!summary) return [] as { front: string; back: string }[];
    return [
      ...(topicClusters ?? []).map((t) => ({ front: `Topic: ${t.topic}`, back: t.summary })),
      ...(summary.frameworks ?? []).map(f => ({ front: f.name, back: f.description })),
      ...summary.quotes.map((q, i) => ({ front: `Quote ${i + 1}`, back: q })),
      ...(summary.biasAnalysis ?? []).map((b, i) => ({ front: `Critique ${i + 1}`, back: b })),
    ];
  }, [summary, topicClusters]);

  const studyQuiz = useMemo(() => {
    if (!summary) return [] as { question: string; correct: string; options: string[] }[];
    const fw = summary.frameworks ?? [];
    return fw
      .map((f, i) => {
        const others = fw.filter((_, j) => j !== i).map(x => x.name).slice(0, 4);
        return { question: f.description, correct: f.name, options: [f.name, ...others].sort(() => Math.random() - 0.5) };
      })
      .filter(q => q.options.length >= 2);
  }, [summary]);

  const tabs = personaDef(persona).tabOrder
    .map(id => ALL_TABS.find(t => t.id === id))
    .filter((t): t is (typeof ALL_TABS)[number] => !!t);

  const [selectedTopic, setSelectedTopic] = useState(0);

  // Real entity knowledge graph — rendered deterministically from co-occurrence
  // data computed at enrich time (no LLM hallucination).
  const entityMermaid = useMemo(
    () => entityGraphToMermaid(entityGraph?.nodes ?? [], entityGraph?.edges ?? []),
    [entityGraph]
  );

  // Keep the selected topic in range if the cluster list shrinks.
  const activeTopicIdx = Math.min(selectedTopic, Math.max(0, (topicClusters?.length || 1) - 1));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">

          {loading && (
            <div className="space-y-10 animate-pulse mt-4">
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
                   <p className="text-sm font-medium text-foreground/50 mt-1 max-w-sm">Extracting transcript and running extreme analytical summarization.</p>
                 </div>
               </div>

               {/* Skeleton Exec Summary */}
               <div className="h-64 bg-accent/50 rounded-2xl border border-border" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-lg font-bold text-foreground">Failed to process video</p>
              <p className="text-sm font-medium text-foreground/60 max-w-xs text-center">{error}</p>
              <Link href="/"><button className="mt-4 h-10 px-6 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors">Try another video</button></Link>
            </div>
          )}

          {data && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              
              {/* Header Navigation */}
              <div className="flex items-center gap-4 animate-rise stagger-1">
                <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-all glass px-4 py-2 rounded-xl hover:-translate-y-0.5 shadow-sm">
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back to Dashboard
                </Link>
                {summary && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all border border-transparent hover:border-border/50"><Copy className="w-3.5 h-3.5" strokeWidth={2} /> Copy</button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all border border-transparent hover:border-border/50"><Download className="w-3.5 h-3.5" strokeWidth={2} /> MD</button>
                    <button 
                      onClick={handleDownloadPDF} 
                      disabled={isExportingPDF}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-primary hover:bg-blue-600 shadow-md rounded-xl transition-all border border-transparent disabled:opacity-50"
                    >
                      {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : <FileText className="w-3.5 h-3.5" strokeWidth={2} />}
                      PDF Report
                    </button>
                    <button
                      onClick={() => setShowSync(true)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all border border-transparent hover:border-border/50"
                    >
                      <Database className="w-3.5 h-3.5" strokeWidth={2} />
                      Sync
                    </button>
                  </div>
                )}
              </div>

              {/* Video Meta Hero with Embed */}
              <div className="flex flex-col md:flex-row gap-10 glass border border-border/50 p-6 md:p-8 rounded-3xl shadow-xl shadow-foreground/5 animate-rise stagger-2">
                <div className="shrink-0 w-full md:w-[480px]">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-lg shadow-foreground/10 bg-black">
                    {videoId && (
                      <YouTube
                        videoId={videoId}
                        opts={{
                          width: '100%',
                          height: '100%',
                          playerVars: {
                            autoplay: 0,
                            modestbranding: 1,
                            rel: 0,
                          },
                        }}
                        onReady={(event) => setYoutubePlayer(event.target)}
                        className="w-full h-full"
                        iframeClassName="w-full h-full"
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-foreground/5 border border-foreground/10 rounded-full text-xs font-bold uppercase tracking-wider text-foreground/70 mb-6 w-fit shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" /> {channel}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-serif text-foreground leading-[1.1] tracking-tight">{title}</h1>
                </div>
              </div>

              {/* Phase 2: Signal-to-Noise Density badge */}
              {(signalDensity || enriching || enrichError) && (
                <div className="animate-rise stagger-3">
                  {signalDensity ? (
                    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 shadow-lg shadow-primary/5">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Gauge className="w-8 h-8 text-primary" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">Signal Density</p>
                            <div className="flex items-end gap-2">
                              <span className="text-5xl font-extrabold font-serif text-foreground leading-none">{signalDensity.density_score}%</span>
                              <span className="text-xs font-bold text-foreground/50 pb-1">high-signal</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-[15px] font-medium text-foreground/80">
                            We extracted the <span className="font-bold text-foreground">{signalDensity.value_minutes}</span> minutes of actual value
                            from this <span className="font-bold text-foreground">{signalDensity.total_minutes}</span>-minute video.
                          </p>
                          {signalDensity.removed_segments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {signalDensity.removed_segments.map((seg, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full bg-foreground/5 border border-border/50 text-[11px] font-bold text-foreground/60">
                                  {seg.type.replace(/_/g, ' ').toLowerCase()}: {seg.approx_minutes} min saved
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : enriching ? (
                    <div className="h-24 rounded-3xl border border-border/50 bg-foreground/5 animate-pulse flex items-center gap-3 px-6">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-sm font-bold text-foreground/50">Calculating signal density...</span>
                    </div>
                  ) : (
                    <div className="h-24 rounded-3xl border border-dashed border-border/60 bg-foreground/5 flex items-center gap-3 px-6">
                      <AlertCircle className="w-5 h-5 text-destructive/70 shrink-0" />
                      <span className="text-sm font-medium text-foreground/60">Signal density couldn't be computed right now.</span>
                      <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="ml-auto shrink-0 h-9 px-4 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {data.aiError && <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center space-y-4">
                      <AlertCircle className="w-12 h-12 text-destructive/50" />
                      <div>
                        <p className="text-lg font-medium text-destructive">AI Analysis Failed</p>
                        <p className="text-sm">
                          {data.aiError || "An unknown error occurred during AI analysis."}
                        </p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Please ensure your dev server is restarted and API keys are loaded.
                        </p>
                      </div>
                    </div>
                }

              {summary && (
                <>
                  {/* Executive Summary Section */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-foreground text-background shadow-2xl p-8 md:p-12 animate-rise stagger-3">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-background/5 rounded-bl-full blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                       <div className="flex items-center gap-4 mb-8">
                         <div className="w-12 h-12 rounded-2xl bg-background/10 flex items-center justify-center backdrop-blur-md shadow-inner border border-background/20">
                           <Cpu className="w-6 h-6 text-background" strokeWidth={1.5} />
                         </div>
                         <h2 className="text-3xl font-serif text-background">Executive Summary</h2>
                         <div className="ml-auto flex items-center gap-3">
                           {audioProgress && (
                             <span className="text-xs font-mono text-background/70 flex items-center gap-2">
                               <Loader2 className="w-3.5 h-3.5 animate-spin" /> {audioProgress}
                             </span>
                           )}
                           <button 
                             onClick={handlePlayAudio}
                             className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${isPlayingAudio ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-background/10 hover:bg-background/20 text-background'}`}
                           >
                             {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                             {isPlayingAudio ? "Stop Audio" : "Play Podcast"}
                           </button>
                         </div>
                       </div>
                       <div className="text-[16px] md:text-[18px] font-medium leading-relaxed text-background/80 space-y-6 whitespace-pre-wrap tracking-wide">
                          {summary.executiveSummary}
                       </div>
                       
                       <div className="mt-12 pt-8 border-t border-background/20">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/50 mb-3">The Verdict</p>
                          <p className="text-lg md:text-xl font-bold text-background leading-relaxed">{summary.verdict}</p>
                       </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide animate-rise stagger-4">
                    {tabs.map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} icon={t.icon} label={t.label} />)}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px] animate-rise stagger-5">
                    {activeTab === "mindmap" && (
                      <div className="w-full flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold uppercase w-fit tracking-wide shadow-md">Knowledge Graph</div>
                            <p className="text-sm text-foreground/50 mt-3 max-w-xl">Semantic topics (purple) linked to the entities mentioned in each — plus entity↔entity co-occurrence edges. Every link is grounded in the actual content, not hallucinated.</p>
                          </div>
                          {enrichError && !entityGraph && (
                            <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="h-9 px-4 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
                            </button>
                          )}
                        </div>

                        {!entityGraph && enriching && (
                          <div className="h-64 rounded-2xl bg-foreground/5 border border-border/50 animate-pulse flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <span className="text-sm font-bold text-foreground/50">Mapping entity relationships...</span>
                          </div>
                        )}

                        {entityGraph && entityGraph.nodes.length === 0 && (
                          <div className="p-12 text-center glass border border-border/50 rounded-3xl">
                            <Network className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                            <p className="font-bold text-foreground">No connected concepts found</p>
                            <p className="text-sm text-foreground/50 mt-1 max-w-md mx-auto">This video didn't surface enough distinct topics or entities that connect to draw a meaningful graph.</p>
                          </div>
                        )}

                        {entityMermaid && (
                          <div className="flex flex-col gap-4">
                            <MermaidGraph chart={entityMermaid} />
                            <div className="flex flex-col items-center gap-2">
                              {entityGraph!.nodes.some(n => n.kind === 'topic') && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {entityGraph!.nodes.filter(n => n.kind === 'topic').map((n, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-bold text-purple-600">
                                      {n.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {entityGraph!.nodes.some(n => n.kind === 'entity') && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {entityGraph!.nodes.filter(n => n.kind === 'entity').slice(0, 12).map((n, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full bg-foreground/5 border border-border/50 text-[11px] font-bold text-foreground/60">
                                      {n.name} <span className="text-foreground/30 font-medium">×{n.mentions}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "topics" && (
                      <div className="w-full space-y-8">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Tags className="w-5 h-5 text-primary" /> Topic Clusters</h3>
                            <p className="text-sm text-foreground/50 mt-1">Content grouped by theme — not by timestamp. Click a topic to read its combined summary.</p>
                          </div>
                          {enrichError && (
                            <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="h-9 px-4 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
                            </button>
                          )}
                        </div>

                        {!topicClusters && enriching && (
                          <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="h-14 rounded-2xl bg-foreground/5 border border-border/50 animate-pulse" />
                            ))}
                          </div>
                        )}

                        {!topicClusters && !enriching && enrichError && (
                          <div className="p-10 text-center glass border border-dashed border-border/60 rounded-3xl">
                            <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-4" />
                            <p className="font-bold text-foreground">Couldn't cluster this video's topics</p>
                            <p className="text-sm text-foreground/50 mt-1 max-w-md mx-auto">{enrichError}</p>
                            <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="mt-5 h-10 px-5 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto">
                              <RefreshCw className="w-4 h-4" /> Try again
                            </button>
                          </div>
                        )}

                        {topicClusters && topicClusters.length === 0 && (
                          <div className="p-10 text-center text-foreground/50 italic glass border border-border/50 rounded-3xl">No distinct topics detected in this video.</div>
                        )}

                        {topicClusters && topicClusters.length > 0 && (
                          <>
                            <div className="flex flex-wrap gap-2.5">
                              {topicClusters.map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedTopic(i)}
                                  className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${activeTopicIdx === i ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70 border border-border/40'}`}
                                >
                                  {t.topic}
                                </button>
                              ))}
                            </div>
                            {topicClusters[activeTopicIdx] && (
                              <div className="glass border border-border/50 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                  <h4 className="text-2xl font-bold font-serif text-foreground">{topicClusters[activeTopicIdx].topic}</h4>
                                  <span className="text-[11px] font-bold text-foreground/40 px-2.5 py-1 rounded-full bg-foreground/5">{topicClusters[activeTopicIdx].count} chunks</span>
                                </div>
                                <p className="text-[15px] font-medium leading-relaxed text-foreground/80">{topicClusters[activeTopicIdx].summary}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeTab === "debate" && (
                      <div className="w-full space-y-8">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Gavel className="w-5 h-5 text-primary" /> Debate Matrix</h3>
                            <p className="text-sm text-foreground/50 mt-1">Map each speaker's stance and see exactly where they agree or disagree.</p>
                          </div>
                          {enrichError && (
                            <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="h-9 px-4 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
                            </button>
                          )}
                        </div>

                        {!debateMatrix && enriching && (
                          <div className="space-y-4">
                            {[1, 2].map(i => (
                              <div key={i} className="h-32 rounded-2xl bg-foreground/5 border border-border/50 animate-pulse" />
                            ))}
                          </div>
                        )}

                        {!debateMatrix && !enriching && enrichError && (
                          <div className="p-10 text-center glass border border-dashed border-border/60 rounded-3xl">
                            <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-4" />
                            <p className="font-bold text-foreground">Couldn't analyze the speakers</p>
                            <p className="text-sm text-foreground/50 mt-1 max-w-md mx-auto">{enrichError}</p>
                            <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="mt-5 h-10 px-5 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto">
                              <RefreshCw className="w-4 h-4" /> Try again
                            </button>
                          </div>
                        )}

                        {debateMatrix && !debateMatrix.multiSpeaker && (
                          <div className="p-10 text-center glass border border-border/50 rounded-3xl">
                            <MessageSquare className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                            <p className="font-bold text-foreground">Single speaker detected</p>
                            <p className="text-sm text-foreground/50 mt-1 max-w-md mx-auto">This appears to be a solo monologue, so there's no debate to map. Videos with two or more speakers will get a full matrix here.</p>
                          </div>
                        )}

                        {debateMatrix && debateMatrix.multiSpeaker && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {debateMatrix.speakers.map((sp, i) => (
                                <div key={i} className="glass border border-border/50 rounded-3xl p-7 shadow-sm">
                                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-extrabold">{sp.name.charAt(0)}</div>
                                    {sp.name}
                                  </h4>
                                  <p className="mt-3 text-sm font-medium text-foreground/70 leading-relaxed">{sp.stance}</p>
                                  {sp.claims.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                      {sp.claims.map((c, j) => (
                                        <li key={j} className="flex gap-2.5 text-[13px] font-medium text-foreground/70 leading-relaxed">
                                          <Quote className="w-3.5 h-3.5 text-primary/60 mt-0.5 shrink-0" />
                                          <span>{c}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>

                            {debateMatrix.contentions.length > 0 && (
                              <div className="glass border border-border/50 rounded-3xl overflow-hidden shadow-sm">
                                <div className="px-7 py-5 border-b border-border/50 bg-foreground/[0.02] font-bold text-sm flex items-center gap-2">
                                  <Scale className="w-4 h-4 text-primary" /> Points of Contention
                                </div>
                                <div className="divide-y divide-border/40">
                                  {debateMatrix.contentions.map((c, i) => (
                                    <div key={i} className="px-7 py-5">
                                      <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <h5 className="text-[15px] font-bold text-foreground">{c.topic}</h5>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.alignment === 'AGREE' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                                          {c.alignment}
                                        </span>
                                      </div>
                                      <div className="mt-3 rounded-2xl bg-foreground/5 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-1">{c.speaker_a} vs {c.speaker_b}</p>
                                        <p className="text-[13px] font-medium text-foreground/80 leading-relaxed">{c.point_of_contention}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeTab === "frameworks" && summary.frameworks && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {summary.frameworks.map((fw, i) => (
                          <div key={i} className="glass border border-border/50 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                            <FrameworkDiagram name={fw.name} description={fw.description} />
                            <h3 className="text-xl font-bold font-serif text-foreground mb-2 mt-2">{fw.name}</h3>
                            <p className="text-[15px] font-medium leading-relaxed text-foreground/80">{fw.description}</p>
                          </div>
                        ))}
                        {summary.frameworks.length === 0 && (
                           <div className="col-span-full p-8 text-center text-foreground/50 italic glass border border-border/50 rounded-[2rem]">No explicit frameworks were detected in this video.</div>
                        )}
                      </div>
                    )}

                    {activeTab === "bias" && summary.biasAnalysis && (
                      <div className="space-y-6">
                        {summary.biasAnalysis.map((bias, i) => (
                          <div key={i} className="flex gap-5 p-6 md:p-8 glass border border-red-500/20 bg-red-500/5 rounded-3xl shadow-sm items-start hover:shadow-md transition-shadow">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                               <Scale className="w-4 h-4 text-red-500" strokeWidth={2} />
                            </div>
                            <p className="text-[16px] font-medium leading-relaxed text-foreground/90">{bias}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "quotes" && (
                      <div className="space-y-10">
                        {/* Phase 2: Freshness Check */}
                        {(freshness || enriching || enrichError) && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-[0.2em]">Freshness Check</h3>
                              {enriching && !freshness && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/60" />}
                            </div>
                            {freshness && freshness.length > 0 ? (
                              <div className="space-y-3">
                                {freshness.map((f, i) => {
                                  const badge =
                                    f.status === 'DEBUNKED_OUTDATED'
                                      ? { label: 'Outdated', cls: 'bg-red-500/10 text-red-500 border-red-500/30', dot: 'bg-red-500' }
                                      : f.status === 'CONTEXT_CHANGED'
                                        ? { label: 'Context changed', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', dot: 'bg-yellow-500' }
                                        : { label: 'Validated', cls: 'bg-green-500/10 text-green-600 border-green-500/30', dot: 'bg-green-500' };
                                  return (
                                    <div key={i} className="p-5 glass border border-border/50 rounded-2xl">
                                      <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <p className="text-[14px] font-semibold text-foreground leading-relaxed flex-1">{f.claim}</p>
                                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${badge.cls}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} /> {badge.label}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-[13px] font-medium text-foreground/60 leading-relaxed">{f.note}</p>
                                      {f.sources && f.sources.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {f.sources.map((src, j) => (
                                            <a key={j} href={src} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                              <ExternalLink className="w-3 h-3" /> source {j + 1}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : enriching ? null : enrichError ? (
                              <div className="p-5 glass border border-dashed border-border/60 rounded-2xl text-[13px] font-medium text-foreground/50 flex items-center justify-between gap-3 flex-wrap">
                                <span>Couldn't fact-check claims right now.</span>
                                <button onClick={() => { enrichStartedRef.current = ''; runEnrich(); }} className="h-8 px-3 rounded-lg text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors flex items-center gap-1.5">
                                  <RefreshCw className="w-3 h-3" /> Retry
                                </button>
                              </div>
                            ) : (
                              <div className="p-5 glass border border-border/50 rounded-2xl text-[13px] font-medium text-foreground/50">
                                No factual claims could be verified for this video.
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Quote className="w-4 h-4" strokeWidth={1.5} /> Notable Quotes</h3>
                          {summary.quotes.map((quote, i) => (
                            <blockquote key={i} className="relative p-8 glass border border-border/50 rounded-3xl shadow-sm">
                               <div className="absolute top-4 left-4 text-6xl text-foreground/5 font-serif leading-none">"</div>
                               <p className="relative z-10 text-[16px] italic font-medium leading-relaxed text-foreground/80 pt-4">
                                  {quote}
                               </p>
                               <button
                                 onClick={async () => {
                                   await navigator.clipboard.writeText(`"${quote}"\n— ${title} (${channel})\nhttps://youtube.com/watch?v=${id}`);
                                   showToast('Quote copied!');
                                 }}
                                 className="mt-4 relative z-10 h-8 px-3 rounded-lg bg-foreground/5 hover:bg-foreground hover:text-background transition-colors text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                               >
                                 <Copy className="w-3 h-3" /> Copy quote
                               </button>
                            </blockquote>
                          ))}
                        </div>

                        <div className="space-y-8">
                          <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Bookmark className="w-4 h-4" strokeWidth={1.5} /> Mentioned Resources</h3>
                          <div className="space-y-4">
                             {summary.resources.map((res, i) => (
                               <div key={i} className="flex items-center gap-5 p-5 glass border border-border/50 rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform cursor-pointer group">
                                 <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                                    <FileText className="w-5 h-5 text-foreground/50 group-hover:text-background" strokeWidth={1.5} />
                                 </div>
                                 <span className="text-[15px] font-medium text-foreground/90">{res}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      </div>
                      </div>
                    )}

                    {activeTab === "notes" && (
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                          <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Study Mode</h3>
                            <p className="text-sm text-foreground/50 mt-1">Active recall from this video — flip cards, then quiz yourself.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setStudyMode('cards'); setCardFlipped(false); }}
                              className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${studyMode === 'cards' ? 'bg-primary text-white' : 'bg-foreground/5 hover:bg-foreground/10'}`}
                            >Flashcards</button>
                            <button
                              onClick={() => { setStudyMode('quiz'); setQuizIdx(0); setQuizScore(0); setQuizChoice(null); setQuizDone(false); }}
                              className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${studyMode === 'quiz' ? 'bg-primary text-white' : 'bg-foreground/5 hover:bg-foreground/10'}`}
                            >Quiz</button>
                            <button
                              onClick={() => { setStudyMode('notes'); loadHandwrittenNotes(); }}
                              className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${studyMode === 'notes' ? 'bg-primary text-white' : 'bg-foreground/5 hover:bg-foreground/10'}`}
                            >Notes</button>
                            <button
                              onClick={async () => {
                                const lines = studyDeck.map(d => `${d.front}\t${d.back}`);
                                await navigator.clipboard.writeText(lines.join('\n'));
                                showToast('Anki deck copied!');
                              }}
                              className="h-9 px-4 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                            >Copy Anki</button>
                          </div>
                        </div>

                        {studyMode === 'cards' && (
                          <div className="max-w-xl mx-auto">
                            <div onClick={() => setCardFlipped(f => !f)} className="cursor-pointer min-h-[280px]">
                              <div className={`relative w-full min-h-[280px] glass border rounded-3xl shadow-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center ${cardFlipped ? 'bg-primary text-white border-primary' : 'border-border/50'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-4">{cardFlipped ? 'Back' : 'Front'} · tap to flip</span>
                                {studyDeck[cardIdx] ? (
                                  <p className={`text-xl md:text-2xl font-bold leading-snug whitespace-pre-wrap ${cardFlipped ? 'text-white' : 'text-foreground'}`}>{cardFlipped ? studyDeck[cardIdx].back : studyDeck[cardIdx].front}</p>
                                ) : (
                                  <p className="text-foreground/50">Not enough content for cards yet.</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-6">
                              <button onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setCardFlipped(false); }} disabled={cardIdx === 0} className="h-10 px-5 bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">← Prev</button>
                              <span className="text-sm font-bold text-foreground/50">{studyDeck.length ? cardIdx + 1 : 0} / {studyDeck.length}</span>
                              <button onClick={() => { setCardIdx(i => Math.min(studyDeck.length - 1, i + 1)); setCardFlipped(false); }} disabled={cardIdx >= studyDeck.length - 1} className="h-10 px-5 bg-foreground text-background hover:opacity-90 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors">Next →</button>
                            </div>
                          </div>
                        )}

                        {studyMode === 'quiz' && (
                          <div className="max-w-xl mx-auto">
                            {quizDone ? (
                              <div className="text-center p-10 glass border border-border/50 rounded-3xl">
                                <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
                                <h4 className="text-2xl font-bold mb-2">Quiz complete!</h4>
                                <p className="text-lg text-foreground/70 mb-6">You got <span className="font-bold text-primary">{quizScore}</span> / {studyQuiz.length} correct</p>
                                <button onClick={() => { setQuizIdx(0); setQuizScore(0); setQuizChoice(null); setQuizDone(false); }} className="bg-primary text-white px-6 py-3 rounded-full font-bold">Restart Quiz</button>
                              </div>
                            ) : studyQuiz.length === 0 ? (
                              <div className="text-center p-10 glass rounded-3xl"><p className="text-foreground/60">Not enough chapters to build a quiz.</p></div>
                            ) : (
                              <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-foreground/50">Question {quizIdx + 1} / {studyQuiz.length}</span>
                                  <span className="text-sm font-bold text-foreground/50">Score: {quizScore}</span>
                                </div>
                                <div className="glass border border-border/50 rounded-3xl p-8">
                                  <h4 className="text-lg font-bold mb-2">Which chapter covers this?</h4>
                                  <p className="text-[15px] font-medium text-foreground/70 leading-relaxed mb-6">"{studyQuiz[quizIdx]?.question}"</p>
                                  <div className="space-y-3">
                                    {studyQuiz[quizIdx]?.options.map(opt => {
                                      const isCorrect = opt === studyQuiz[quizIdx].correct;
                                      const isChosen = quizChoice === opt;
                                      return (
                                        <button
                                          key={opt}
                                          onClick={() => {
                                            if (quizChoice) return;
                                            setQuizChoice(opt);
                                            if (isCorrect) setQuizScore(s => s + 1);
                                            setTimeout(() => {
                                              if (quizIdx + 1 >= studyQuiz.length) setQuizDone(true);
                                              else { setQuizIdx(i => i + 1); setQuizChoice(null); }
                                            }, 800);
                                          }}
                                          className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all ${quizChoice === null ? 'bg-foreground/5 hover:bg-foreground/10 border-border/50' : isCorrect ? 'bg-green-500/10 border-green-500/50 text-green-700' : isChosen ? 'bg-red-500/10 border-red-500/50 text-red-700' : 'bg-foreground/5 border-border/50 opacity-50'}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {studyMode === 'notes' && (
                          <HandwrittenNotes text={handwrittenNotes} loading={notesLoading} error={notesError} onLoad={loadHandwrittenNotes} />
                        )}
                      </div>
                    )}

                  </div>
                </>
              )}

              {!summary && transcript && (
                <div className="glass border border-border/50 rounded-3xl shadow-xl shadow-foreground/5 overflow-hidden animate-rise stagger-4">
                  <div className="flex items-center gap-4 p-8 border-b border-border/50 bg-foreground/[0.02]">
                    <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-foreground/60" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-serif text-foreground">Raw Transcript</h2>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto p-8 bg-background/50">
                     <p className="text-[13px] font-mono text-foreground/70 whitespace-pre-wrap leading-[1.8]">{transcript}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Extreme Floating Chat Panel */}
      {summary && (
        <div className="fixed bottom-6 right-6 z-50">
          {isChatOpen ? (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-background border border-foreground/10 rounded-3xl shadow-2xl w-[380px] h-[600px] max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-foreground/5 bg-foreground/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Synop</h3>
                    <p className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">Ask anything about this video</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-foreground/40 text-sm mt-10">
                    Ask me for specific timestamps, detailed explanations, or to synthesize ideas from the video!
                  </div>
                )}
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-foreground text-background rounded-br-none' : 'bg-foreground/5 rounded-bl-none prose prose-sm prose-p:leading-relaxed prose-pre:bg-foreground/10'}`}>
                      {m.role === 'user' ? (
                        m.content
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({node, ...props}) => {
                              if (props.href?.startsWith('#seek:')) {
                                const time = props.href.split('#seek:')[1];
                                return (
                                  <button 
                                    onClick={() => seekTo(time)}
                                    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer border border-primary/20 mx-1 font-mono font-bold align-middle"
                                  >
                                    <Play className="w-2 h-2 mr-1 inline" /> {time}
                                  </button>
                                )
                              }
                              return <a {...props} className="text-primary hover:underline" />
                            }
                          }}
                        >
                          {m.content.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, '[$1](#seek:$1)')}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-foreground/5 rounded-2xl rounded-bl-none p-3 px-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                {chatError && (
                  <div className="flex justify-start mt-2">
                    <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl p-3 text-xs">
                      Failed to connect: {chatError}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-foreground/5">
                <form onSubmit={sendChatMessage} className="relative flex items-center">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask about the video..."
                    className="w-full bg-foreground/5 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-foreground/30 font-medium"
                  />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()} className="absolute right-2 p-2 bg-foreground text-background rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.button 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsChatOpen(true)}
              className="w-14 h-14 bg-foreground text-background rounded-full shadow-2xl shadow-foreground/20 flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <MessageSquare className="w-6 h-6" />
            </motion.button>
          )}
        </div>
      )}

      {/* Sync to Knowledge Base Modal */}
      {showSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass border border-border/50 rounded-3xl p-8 shadow-2xl w-full max-w-lg mx-4 animate-rise">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Sync to Knowledge Base
              </h3>
              <button onClick={() => setShowSync(false)} className="w-8 h-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-foreground/60" />
              </button>
            </div>
            <p className="text-sm text-foreground/50 mb-6">Push this summary into your personal knowledge graph — entities become [[Wiki-Links]].</p>

            <div className="space-y-3">
              <div className="p-5 glass border border-border/50 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center"><FileText className="w-5 h-5 text-foreground/60" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Export to Obsidian Vault</h4>
                    <p className="text-xs text-foreground/50">Markdown with [[Wiki-Links]] — saved to your vault or downloaded.</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncObsidian}
                  disabled={syncingObsidian}
                  className="mt-3 w-full h-11 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {syncingObsidian ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {syncingObsidian ? 'Exporting...' : 'Export to Obsidian'}
                </button>
                {obsidianResult && <p className="mt-2 text-xs font-bold text-primary">{obsidianResult}</p>}
              </div>

              <div className="p-5 glass border border-border/50 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center"><ExternalLink className="w-5 h-5 text-foreground/60" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Create Notion Database</h4>
                    <p className="text-xs text-foreground/50">Full dossier (topics, entities, freshness) pushed to your Notion DB.</p>
                  </div>
                </div>
                <button
                  onClick={handleExportNotion}
                  disabled={exportingNotion}
                  className="mt-3 w-full h-11 bg-foreground/5 border border-border/50 rounded-xl text-sm font-bold hover:bg-foreground/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {exportingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {exportingNotion ? 'Exporting...' : 'Export to Notion'}
                </button>
                {notionResult && <p className="mt-2 text-xs font-bold text-primary">{notionResult}</p>}
              </div>
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
    </div>
  );
}
