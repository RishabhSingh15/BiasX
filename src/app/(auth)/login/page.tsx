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
    <Card className="w-full max-w-md bg-[#E0E5EC] rounded-[32px] neu-raised border-0 text-[#3D4852] p-4 md:p-6">
      <CardHeader className="space-y-3 text-center flex flex-col items-center">
        <div className="h-16 w-16 rounded-[22px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF] mb-1">
          <BiasXLogo size={32} />
        </div>
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-[#3D4852]">BiasX</CardTitle>
        <CardDescription className="text-sm text-[#6B7280] font-body">
          Sign in to your trading terminal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] border-0 text-[#3D4852] placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-[#6C63FF] py-3 text-sm font-medium"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Password</Label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#6C63FF] hover:text-[#584edb]">
                Forgot Password?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] border-0 text-[#3D4852] placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-[#6C63FF] py-3 text-sm font-medium"
              required
            />
          </div>
          {error && (
            <div className="text-xs text-[#FF6B6B] font-semibold bg-[#FF6B6B]/10 p-3 rounded-[16px] border border-[#FF6B6B]/20">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full neu-btn-primary py-3 rounded-[22px] text-white font-semibold text-sm cursor-pointer" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <p className="text-sm text-[#6B7280] font-body">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#6C63FF] hover:text-[#584edb] font-bold">
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
