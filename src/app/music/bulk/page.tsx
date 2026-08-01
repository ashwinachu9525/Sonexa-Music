"use client";

import { useState } from "react";
import { Upload, ArrowLeft, CheckCircle2, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type QueuedFile = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  title: string;
};

export default function BulkUploadPage() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalArtist, setGlobalArtist] = useState("");
  const [globalAlbum, setGlobalAlbum] = useState("");

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending' as const,
      // Default title to filename without extension
      title: file.name.replace(/\.[^/.]+$/, "") 
    }));
    
    setQueue(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    if (isUploading) return;
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const processUploads = async () => {
    if (queue.length === 0 || !globalArtist) {
      toast.error("Please add files and provide a global Artist Name.");
      return;
    }
    
    setIsUploading(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed') continue;

      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));

      try {
        const publicUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/v1/songs/upload-direct', true);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const p = Math.round((e.loaded / e.total) * 100);
              setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: p } : q));
            }
          };
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data.fileUrl);
              } catch {
                reject();
              }
            } else {
              reject();
            }
          };
          xhr.onerror = () => reject();
          
          const formData = new FormData();
          formData.append('file', item.file);
          xhr.send(formData);
        });

        // Save to DB
        const dbRes = await fetch('/api/v1/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            artistName: globalArtist,
            albumTitle: globalAlbum || "Unknown Album",
            fileUrl: publicUrl
          })
        });

        if (!dbRes.ok) throw new Error("Failed DB Insert");

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
      } catch (e) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
        toast.error(`Failed to upload ${item.title}`);
      }
    }

    setIsUploading(false);
    toast.success("Bulk upload process finished.");
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <a href="/music">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </a>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload</h1>
          <p className="text-muted-foreground">Upload entire albums quickly</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Drag & Drop Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 transition-colors text-center cursor-pointer relative flex flex-col items-center justify-center min-h-[200px]">
                <Input 
                  type="file" 
                  accept="audio/*" 
                  multiple 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFilesAdded}
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <p className="font-medium text-lg">Select Multiple Files</p>
                  <p className="text-sm text-muted-foreground">or drag and drop them here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {queue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Queue ({queue.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {queue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 pr-4">
                      <Music className="text-muted-foreground shrink-0 w-5 h-5" />
                      <div className="overflow-hidden flex-1">
                        <Input 
                          value={item.title}
                          onChange={(e) => setQueue(prev => prev.map(q => q.id === item.id ? { ...q, title: e.target.value } : q))}
                          className="h-8 mb-1"
                          disabled={isUploading}
                        />
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.status === 'error' ? 'bg-red-500' : 'bg-primary'} transition-all`} 
                            style={{ width: `${item.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      {item.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {item.status === 'pending' && (
                        <Button variant="ghost" size="icon" onClick={() => removeFile(item.id)} disabled={isUploading}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Global Metadata</CardTitle>
              <CardDescription>Applied to all tracks in queue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Artist Name *</label>
                <Input value={globalArtist} onChange={e => setGlobalArtist(e.target.value)} disabled={isUploading} placeholder="e.g. A.R. Rahman" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Album Title (Optional)</label>
                <Input value={globalAlbum} onChange={e => setGlobalAlbum(e.target.value)} disabled={isUploading} placeholder="e.g. Rockstar" />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={processUploads} 
                disabled={isUploading || queue.length === 0 || !globalArtist}
                className="w-full"
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
