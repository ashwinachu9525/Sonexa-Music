import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "Welcome to the Music App API v1",
    status: "healthy",
    endpoints: {
      songs: {
        GET: "/api/v1/songs (Fetch all songs with pagination)",
        POST: "/api/v1/songs (Upload a new song metadata)",
        DELETE: "/api/v1/songs/:id (Delete a song)"
      },
      uploadUrl: {
        POST: "/api/v1/songs/upload-url (Generate Cloudflare R2 presigned URL for audio upload)"
      },
      admin: {
        GET: "/api/v1/admin/stats (Get dashboard analytics and health checks)"
      }
    }
  });
}
