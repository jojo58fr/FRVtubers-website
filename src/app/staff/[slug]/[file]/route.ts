import { serveUpload } from '@/lib/serve-upload'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  const { slug, file } = await params
  return serveUpload('staff', slug, file)
}
