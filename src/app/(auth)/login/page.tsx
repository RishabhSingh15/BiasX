'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { BiasXLogo } from '@/components/ui/biasx-logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      if (res?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
      <CardHeader className="space-y-2 text-center flex flex-col items-center">
        <div className="h-12 w-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center shadow-lg mb-1">
          <BiasXLogo size={28} />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">BiasX</CardTitle>
        <CardDescription className="text-zinc-400">
          Sign in to your trading terminal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-emerald-500"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Link href="/forgot-password" className="text-xs text-emerald-500 hover:text-emerald-400">
                Forgot Password?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-emerald-500"
              required
            />
          </div>
          {error && (
            <div className="text-sm text-rose-500 font-medium">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-emerald-500 hover:text-emerald-400 font-medium">
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
