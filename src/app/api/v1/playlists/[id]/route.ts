import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playlistId } = await context.params;

    // Delete playlist songs first to maintain referential integrity if cascade delete isn't configured
    await prisma.playlistSong.deleteMany({
      where: { playlistId }
    });

    await prisma.playlist.delete({
      where: { id: playlistId }
    });

    return NextResponse.json({ message: 'Playlist deleted successfully' });
  } catch (error: any) {
    console.error('Delete playlist error:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
