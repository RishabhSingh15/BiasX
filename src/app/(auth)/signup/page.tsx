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
    if (!pass) return { score: 0, label: '', color: 'bg-[#A0AEC0]/30' }
    if (pass.length < 8) return { score: 1, label: 'Weak', color: 'bg-[#FF6B6B]' }
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) {
      return { score: 3, label: 'Strong', color: 'bg-[#38B2AC]' }
    }
    return { score: 2, label: 'Fair', color: 'bg-[#F6AD55]' }
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
    <Card className="w-full max-w-md bg-[#E0E5EC] rounded-[32px] neu-raised border-0 text-[#3D4852] p-4 md:p-6">
      <CardHeader className="space-y-3 text-center flex flex-col items-center">
        <div className="h-16 w-16 rounded-[22px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center text-[#6C63FF] mb-1">
          <BiasXLogo size={32} />
        </div>
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-[#3D4852]">Create Account</CardTitle>
        <CardDescription className="text-sm text-[#6B7280] font-body">
          Join BiasX to analyze your trading psychology
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] border-0 text-[#3D4852] placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-[#6C63FF] py-3 text-sm font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Password</Label>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] border-0 text-[#3D4852] placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-[#6C63FF] py-3 text-sm font-medium"
              required
            />
            {password && (
              <div className="flex items-center gap-2 mt-1.5 px-1">
                <div className="flex-1 flex gap-1 h-1.5 bg-[#E0E5EC] neu-inset-sm p-0.5 rounded-full">
                  <div className={`flex-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                  <div className={`flex-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                  <div className={`flex-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                </div>
                <span className="text-xs font-mono font-semibold text-[#6B7280] w-12 text-right">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-[#E0E5EC] neu-inset-deep rounded-[20px] border-0 text-[#3D4852] placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-[#6C63FF] py-3 text-sm font-medium"
              required
            />
          </div>
          
          <div className="flex items-start space-x-2 py-1.5">
            <input 
              type="checkbox" 
              id="terms" 
              required
              className="mt-1 rounded border-[#A0AEC0]/40 text-[#6C63FF] accent-[#6C63FF]" 
            />
            <Label htmlFor="terms" className="text-xs text-[#6B7280] leading-normal cursor-pointer">
              I agree to the Terms of Service and Privacy Policy.
            </Label>
          </div>

          {error && (
            <div className="text-xs text-[#FF6B6B] font-semibold bg-[#FF6B6B]/10 p-3 rounded-[16px] border border-[#FF6B6B]/20">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full neu-btn-primary py-3 rounded-[22px] text-white font-semibold text-sm cursor-pointer" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <p className="text-sm text-[#6B7280] font-body">
          Already have an account?{' '}
          <Link href="/login" className="text-[#6C63FF] hover:text-[#584edb] font-bold">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
