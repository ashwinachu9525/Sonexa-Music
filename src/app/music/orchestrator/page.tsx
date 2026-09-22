"use client";

import { useState } from "react";
import { Search, Music, Play, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrchestratorTestPage() {
  const [query, setQuery] = useState("arijit");
  const [source, setSource] = useState<"all" | "local" | "jiosaavn">("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [lyricsData, setLyricsData] = useState<any>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // AI Vibe State
  const [vibePrompt, setVibePrompt] = useState("Chill rainy evening acoustic drive");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeResult, setVibeResult] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLyricsData(null);
    try {
      const res = await fetch(`/api/v1/music/search?q=${encodeURIComponent(query)}&source=${source}&limit=20`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Failed to fetch orchestrator search", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVibe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVibeLoading(true);
    try {
      const res = await fetch("/api/v1/music/ai-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: vibePrompt, limit: 15 }),
      });
      const data = await res.json();
      setVibeResult(data?.data);
    } catch (err) {
      console.error("Failed to generate AI vibe", err);
    } finally {
      setVibeLoading(false);
    }
  };

  const fetchLyrics = async (song: any) => {
    setLyricsLoading(true);
    setLyricsData(null);
    try {
      const res = await fetch(`/api/v1/music/${song.source}/${encodeURIComponent(song.id)}/lyrics`);
      const data = await res.json();
      setLyricsData(data?.data);
    } catch (err) {
      console.error("Failed to fetch lyrics", err);
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleSelectSong = (song: any) => {
    setSelectedSong(song);
    fetchLyrics(song);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            Music Orchestrator API
          </h1>
          <p className="text-muted-foreground mt-1">
            Test and inspect unified search, audio stream proxying, LRCLib lyrics fallback, and Gemini/NVIDIA AI Vibe Assistant.
          </p>
        </div>
      </div>

      {/* AI Vibe Assistant Section */}
      <Card className="border-primary/30 bg-primary/5 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl text-primary">
            <Sparkles className="h-5 w-5" />
            AI Vibe Assistant Engine (Gemini 2.5 / NVIDIA AI)
          </CardTitle>
          <CardDescription>
            Input any vibe or mood description. The Orchestrator calls Gemini AI to extract targeted search terms, queries providers, and returns a playable normalized playlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateVibe} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g. Upbeat gym workout hits, Late night romantic drive..."
              value={vibePrompt}
              onChange={(e) => setVibePrompt(e.target.value)}
              className="flex-1 bg-background"
            />
            <Button type="submit" disabled={vibeLoading} className="bg-primary text-primary-foreground">
              {vibeLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate AI Playlist
            </Button>
          </form>

          {vibeResult && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-border/60 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{vibeResult.title}</h3>
                  <p className="text-xs text-muted-foreground">{vibeResult.description}</p>
                </div>
                {vibeResult.aiProviderUsed && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Engine: {vibeResult.aiProviderUsed}
                  </span>
                )}
              </div>

              <div className="divide-y divide-border/40 max-h-60 overflow-y-auto">
                {vibeResult.songs?.map((song: any) => (
                  <div key={`${song.source}-${song.id}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <span className="font-semibold text-foreground">{song.title}</span>
                      <span className="text-muted-foreground"> — {song.artist?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted">
                        {song.source}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSelectSong(song)}>
                        <Play className="h-3 w-3 mr-1" /> Play & Lyrics
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Search Tester Card */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle>Unified Search Tester</CardTitle>
          <CardDescription>
            Query the orchestrator abstraction layer. Results are normalized regardless of source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search song title, artist, or album..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={source === "all" ? "default" : "outline"}
                onClick={() => setSource("all")}
                size="sm"
              >
                All Sources
              </Button>
              <Button
                type="button"
                variant={source === "local" ? "default" : "outline"}
                onClick={() => setSource("local")}
                size="sm"
              >
                Local Only
              </Button>
              <Button
                type="button"
                variant={source === "jiosaavn" ? "default" : "outline"}
                onClick={() => setSource("jiosaavn")}
                size="sm"
              >
                JioSaavn Only
              </Button>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </form>

          {/* Provider Status Indicator */}
          {results?.data?.providers && (
            <div className="mt-4 p-3 bg-muted/40 rounded-lg flex flex-wrap gap-4 text-xs font-medium">
              <span className="text-muted-foreground">Provider Status:</span>
              {Object.entries(results.data.providers).map(([provider, info]: [string, any]) => (
                <div key={provider} className="flex items-center gap-1.5">
                  {info.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className="capitalize">{provider}:</span>
                  <span className={info.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {info.success ? "Available" : info.error || "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results & Selected Item Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Songs List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>Normalized Search Results</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {results?.data?.items?.length || 0} items found
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!results ? (
                <div className="py-12 text-center text-muted-foreground">
                  Click Search to query the Orchestrator API
                </div>
              ) : results.data?.items?.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No matching songs found across selected providers
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {results.data.items.map((song: any) => (
                    <div
                      key={`${song.source}-${song.id}`}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {song.images?.cover ? (
                          <img
                            src={song.images.cover}
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                            <Music className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-sm truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            song.source === "local"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {song.source}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSelectSong(song)}
                          title="Play & Fetch Lyrics"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSelectSong(song)}
                          title="Fetch Lyrics"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details & Audio Player Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Song Inspector</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSong ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {selectedSong.images?.cover && (
                      <img
                        src={selectedSong.images.cover}
                        alt={selectedSong.title}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                    )}
                    <div>
                      <p className="font-bold">{selectedSong.title}</p>
                      <p className="text-sm text-muted-foreground">{selectedSong.artist?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedSong.album?.title}</p>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Stream Preview</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono uppercase font-bold">
                        {selectedSong.source}
                      </span>
                    </div>
                    <audio
                      key={`${selectedSong.source}-${selectedSong.id}`}
                      controls
                      autoPlay
                      src={selectedSong.audio?.url || `/api/v1/music/${selectedSong.source}/${encodeURIComponent(selectedSong.id)}/stream`}
                      className="w-full h-10 outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="truncate max-w-[220px]" title={selectedSong.audio?.url}>
                        Source: {selectedSong.audio?.url ? "Direct CDN Stream" : "Proxy Route"}
                      </span>
                      <a
                        href={selectedSong.audio?.url || `/api/v1/music/${selectedSong.source}/${encodeURIComponent(selectedSong.id)}/stream`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono text-[10px]"
                      >
                        Open Direct Audio ↗
                      </a>
                    </div>
                  </div>

                  {/* Raw JSON inspection */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Normalized Payload</p>
                    <pre className="p-3 bg-slate-950 text-slate-50 text-[11px] rounded-lg overflow-x-auto max-h-60 font-mono">
                      {JSON.stringify(selectedSong, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Select a song from search results to test playback and inspect payload
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lyrics Inspector */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Lyrics Inspector</CardTitle>
              {selectedSong && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fetchLyrics(selectedSong)}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${lyricsLoading ? "animate-spin" : ""}`} /> Reload Lyrics
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {lyricsLoading ? (
                <div className="py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Fetching lyrics via Orchestrator...
                </div>
              ) : lyricsData ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Provider:</span>
                      <span className="font-bold text-foreground capitalize">
                        {lyricsData.provider || lyricsData.source}
                      </span>
                      {lyricsData.isFallback && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          LRCLib Fallback
                        </span>
                      )}
                    </div>
                  </div>
                  <pre className="p-3 bg-muted rounded-lg text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {lyricsData.lyrics || "No lyrics available for this song."}
                  </pre>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Select any song to fetch & view lyrics automatically
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
