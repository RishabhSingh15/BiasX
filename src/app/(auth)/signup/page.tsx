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

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-800' }
    if (pass.length < 8) return { score: 1, label: 'Weak', color: 'bg-rose-500' }
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) {
      return { score: 3, label: 'Strong', color: 'bg-emerald-500' }
    }
    return { score: 2, label: 'Fair', color: 'bg-amber-500' }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setIsLoading(true)
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to create account')
        setIsLoading(false)
        return
      }
      
      // Auto sign in
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
      <CardHeader className="space-y-2 text-center flex flex-col items-center">
        <div className="h-12 w-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center shadow-lg mb-1">
          <BiasXLogo size={28} />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
        <CardDescription className="text-zinc-400">
          Join BiasX to analyze your trading psychology
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-emerald-500"
              required
            />
          </div>
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
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-emerald-500"
              required
            />
            {password && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 flex gap-1 h-1.5">
                  <div className={`flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-zinc-800'}`} />
                  <div className={`flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-zinc-800'}`} />
                  <div className={`flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-zinc-800'}`} />
                </div>
                <span className="text-xs text-zinc-400 w-12 text-right">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-zinc-300">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-emerald-500"
              required
            />
          </div>
          
          <div className="flex items-start space-x-2 py-2">
            <input 
              type="checkbox" 
              id="terms" 
              required
              className="mt-1 rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-emerald-500" 
            />
            <Label htmlFor="terms" className="text-xs text-zinc-400 leading-normal">
              I agree to the Terms of Service and Privacy Policy.
            </Label>
          </div>

          {error && (
            <div className="text-sm text-rose-500 font-medium">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
