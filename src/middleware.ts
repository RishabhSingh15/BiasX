import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

const publicRoutes = ['/login', '/signup', '/forgot-password']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  
  const isApiRoute = nextUrl.pathname.startsWith('/api')
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  
  if (isApiRoute) {
    return NextResponse.next()
  }
  
  if (isPublicRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', nextUrl))
    }
    return NextResponse.next()
  }
  
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
