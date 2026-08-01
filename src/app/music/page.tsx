"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Upload, Plus, Music, Trash2, CheckCircle2, Play, Pencil, X, ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Song = {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  fileUrl: string;
  coverImage?: string;
  musicBy?: string;
  starring?: string;
  directedBy?: string;
  label?: string;
};

export default function MusicManager() {
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [musicBy, setMusicBy] = useState("");
  const [starring, setStarring] = useState("");
  const [directedBy, setDirectedBy] = useState("");
  const [labelName, setLabelName] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data, error, isLoading: loading, mutate } = useSWR(
    debouncedQuery ? `/api/v1/songs?search=${encodeURIComponent(debouncedQuery)}` : '/api/v1/songs',
    fetcher,
    { keepPreviousData: true }
  );
  
  const songs: Song[] = data?.data || [];

  const [playingSong, setPlayingSong] = useState<Song | null>(null);
  
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editCoverProgress, setEditCoverProgress] = useState(0);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setCoverProgress(0);

      // 1. Upload & Compress Song File
      let publicUrl = "";
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/v1/songs/upload-direct', true);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Note: This only tracks the upload to the Next.js server.
            // Compression time will happen after this reaches 100%.
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const res = JSON.parse(xhr.responseText);
              publicUrl = res.url;
              resolve(true);
            } catch (err) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error('Upload and compression failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        const formData = new FormData();
        formData.append('file', file);
        // Optional: you can add a checkbox in the UI later and append its value here
        // formData.append('isLossless', isLossless ? 'true' : 'false');
        
        xhr.send(formData);
      });

      // 2. Upload Cover Image (if selected)
      let coverPublicUrl = undefined;
      if (coverFile) {
        const imgRes = await fetch('/api/v1/songs/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: coverFile.name, contentType: coverFile.type, folder: 'images' })
        });
        if (!imgRes.ok) throw new Error("Failed to get upload URL for image");
        const imgData = await imgRes.json();
        coverPublicUrl = imgData.publicUrl;

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', imgData.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', coverFile.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setCoverProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => xhr.status === 200 ? resolve(true) : reject(new Error('Image Upload failed'));
          xhr.onerror = () => reject(new Error('Image Upload failed'));
          xhr.send(coverFile);
        });
      }

      // 3. Save song metadata to database
      const createRes = await fetch('/api/v1/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artistName: artistName.trim() || undefined,
          albumTitle: albumTitle.trim() || undefined,
          fileUrl: publicUrl,
          coverImage: coverPublicUrl,
          musicBy: musicBy.trim() || undefined,
          starring: starring.trim() || undefined,
          directedBy: directedBy.trim() || undefined,
          label: labelName.trim() || undefined,
          duration: 0, 
        })
      });
      
      if (createRes.ok) {
        toast.success("Song uploaded successfully!");
        setFile(null);
        setCoverFile(null);
        setTitle("");
        setArtistName("");
        setAlbumTitle("");
        setMusicBy("");
        setStarring("");
        setDirectedBy("");
        setLabelName("");
        mutate(); 
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Upload failed. Check R2 credentials in .env");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCoverProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    try {
      if (playingSong?.id === id) setPlayingSong(null);
      const res = await fetch(`/api/v1/songs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Song deleted!");
        mutate();
      }
      else toast.error("Failed to delete song.");
    } catch (e) {
      console.error(e);
      toast.error("Error deleting song");
    }
  };

  const startEdit = (song: Song) => {
    setEditingSong(song);
    setEditCoverFile(null);
    setEditForm({
      title: song.title,
      musicBy: song.musicBy || "",
      starring: song.starring || "",
      directedBy: song.directedBy || "",
      label: song.label || "",
      coverImage: song.coverImage || "",
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;
    
    setSavingEdit(true);
    setEditCoverProgress(0);
    try {
      let finalCoverImage = editForm.coverImage;

      // If a new cover image is selected, upload it first
      if (editCoverFile) {
        const imgRes = await fetch('/api/v1/songs/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: editCoverFile.name, contentType: editCoverFile.type, folder: 'images' })
        });
        if (!imgRes.ok) throw new Error("Failed to get upload URL for new image");
        const imgData = await imgRes.json();
        
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', imgData.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', editCoverFile.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setEditCoverProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => xhr.status === 200 ? resolve(true) : reject(new Error('Image Upload failed'));
          xhr.onerror = () => reject(new Error('Image Upload failed'));
          xhr.send(editCoverFile);
        });

        finalCoverImage = imgData.publicUrl;
      }

      const res = await fetch(`/api/v1/songs/${editingSong.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, coverImage: finalCoverImage })
      });
      
      if (res.ok) {
        toast.success("Song updated successfully!");
        setEditingSong(null);
        setEditCoverFile(null);
        mutate();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update song");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error updating song");
    } finally {
      setSavingEdit(false);
      setEditCoverProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Music Manager</h1>
        <p className="text-muted-foreground">Upload, monitor, and remove songs from your platform's library.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Upload New Song</CardTitle>
            <CardDescription>
              Add a new track to the library with rich metadata and cover art.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpload}>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artistName">Primary Singer / Artist</Label>
                  <Input id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="albumTitle">Album / Movie Title</Label>
                  <Input id="albumTitle" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="musicBy">Music By (Composer)</Label>
                  <Input id="musicBy" value={musicBy} onChange={(e) => setMusicBy(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starring">Starring (Cast)</Label>
                  <Input id="starring" value={starring} onChange={(e) => setStarring(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="directedBy">Video Directed By</Label>
                  <Input id="directedBy" value={directedBy} onChange={(e) => setDirectedBy(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="labelName">Music Label</Label>
                  <Input id="labelName" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="audio-file">Audio File *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative h-32 flex flex-col items-center justify-center">
                    <Input 
                      id="audio-file" type="file" accept="audio/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => setFile(e.target.files?.[0] || null)} required
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      {file ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                      {file ? <p className="font-medium text-primary text-sm truncate max-w-[150px]">{file.name}</p> : <p className="text-sm font-medium">Select Audio</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover-file">Cover Image (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative h-32 flex flex-col items-center justify-center">
                    <Input 
                      id="cover-file" type="file" accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      {coverFile ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                      {coverFile ? <p className="font-medium text-primary text-sm truncate max-w-[150px]">{coverFile.name}</p> : <p className="text-sm font-medium">Select Image</p>}
                    </div>
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="space-y-3 animate-in fade-in pt-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Uploading & Compressing Audio... (Please wait)</span>
                      <span className="text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}/></div>
                  </div>
                  {coverFile && (
                     <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">Uploading Cover...</span>
                        <span className="text-muted-foreground">{coverProgress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${coverProgress}%` }}/></div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={uploading || !file || !title}>
                {uploading ? "Processing..." : <><Plus className="w-4 h-4 mr-2" /> Upload Song</>}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Existing Songs List */}
        <Card className="lg:col-span-5 flex flex-col h-full border-primary/10 shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4">
            <div>
              <CardTitle>Library</CardTitle>
              <CardDescription>Preview, edit, and manage tracks.</CardDescription>
            </div>
            <div className="relative w-full sm:w-[250px] md:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-transparent focus:bg-background"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[700px] pt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-card animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-3 w-20 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-muted rounded-full"></div>
                      <div className="w-8 h-8 bg-muted rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : songs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-10">No songs uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {songs.map((song) => (
                  <div key={song.id} className="flex items-center justify-between p-3 border border-transparent rounded-lg bg-secondary/30 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt="Cover" className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-lg shrink-0 flex items-center justify-center shadow-sm">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="truncate pr-2">
                        <p className="font-medium text-sm truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.musicBy || "Unknown Composer"}</p>
                      </div>
                    </div>
                    <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => setPlayingSong(song)} className="text-primary hover:text-primary hover:bg-primary/10 shrink-0 h-8 w-8">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(song)} className="text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(song.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingSong && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <CardHeader className="flex flex-row items-start justify-between border-b pb-4 mb-2 shrink-0">
              <div className="pr-4">
                <CardTitle className="text-xl">Edit Song</CardTitle>
                <CardDescription className="line-clamp-1">Update metadata for '{editingSong.title}'</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingSong(null)} className="shrink-0 -mt-1 -mr-1">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleEditSave} className="flex flex-col overflow-hidden">
              <CardContent className="space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-2">
                  <Label>Song Title *</Label>
                  <Input value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Music By</Label>
                    <Input value={editForm.musicBy || ''} onChange={e => setEditForm({...editForm, musicBy: e.target.value})} placeholder="Composer name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Starring</Label>
                    <Input value={editForm.starring || ''} onChange={e => setEditForm({...editForm, starring: e.target.value})} placeholder="Actors / Cast" />
                  </div>
                  <div className="space-y-2">
                    <Label>Directed By</Label>
                    <Input value={editForm.directedBy || ''} onChange={e => setEditForm({...editForm, directedBy: e.target.value})} placeholder="Video Director" />
                  </div>
                  <div className="space-y-2">
                    <Label>Music Label</Label>
                    <Input value={editForm.label || ''} onChange={e => setEditForm({...editForm, label: e.target.value})} placeholder="e.g. Sony Music" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Update Cover Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative h-28 flex flex-col items-center justify-center">
                    <Input 
                      type="file" accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => setEditCoverFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      {editCoverFile ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                      {editCoverFile ? <p className="font-medium text-primary text-sm truncate max-w-[150px]">{editCoverFile.name}</p> : <p className="text-sm font-medium">Select New Image</p>}
                    </div>
                  </div>
                </div>

                {savingEdit && editCoverFile && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Uploading Cover...</span>
                      <span className="text-muted-foreground">{editCoverProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${editCoverProgress}%` }}/></div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 bg-muted/20">
                <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={() => setEditingSong(null)}>Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Changes"}</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Floating Bottom Music Player */}
      {playingSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-3 md:p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] z-50 animate-in slide-in-from-bottom-5">
          <div className="container max-w-5xl flex flex-col md:flex-row items-center gap-3 md:gap-6 relative">
            {/* Mobile Close Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setPlayingSong(null)} 
              className="absolute -top-1 right-0 md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3 w-full md:w-auto pr-8 md:pr-0">
              {playingSong.coverImage ? (
                <img src={playingSong.coverImage} className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover shadow-sm border border-border/50" />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-md flex items-center justify-center shrink-0 border border-primary/20">
                  <Music className="text-primary w-5 h-5 md:w-6 md:h-6" />
                </div>
              )}
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-sm truncate">{playingSong.title}</p>
                <p className="text-xs text-muted-foreground truncate">{playingSong.musicBy || "Admin Preview"}</p>
              </div>
            </div>
            
            {/* Audio Element with custom class to make it smaller on mobile */}
            <div className="w-full flex-1">
              <audio controls autoPlay src={playingSong.fileUrl} className="w-full h-10 md:h-12 outline-none" />
            </div>
            
            {/* Desktop Close Button */}
            <Button variant="ghost" size="sm" onClick={() => setPlayingSong(null)} className="hidden md:flex shrink-0">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
