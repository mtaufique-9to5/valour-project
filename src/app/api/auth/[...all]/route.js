// Better Auth HTTP endpoints (/api/auth/*).
import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/server/auth/auth.js'
import { withoutTrailingSlash } from '@/server/auth/request-path.js'

const handlers = toNextJsHandler(auth)

export const GET = (request) => handlers.GET(withoutTrailingSlash(request))
export const POST = (request) => handlers.POST(withoutTrailingSlash(request))
