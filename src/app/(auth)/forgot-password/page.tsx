'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate sending email for MVP
    setIsSubmitted(true)
  }

  return (
    <Card className="w-full max-w-md bg-[#E0E5EC] rounded-[32px] neu-raised border-0 text-[#3D4852] p-4 md:p-6">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-heading font-extrabold tracking-tight text-[#3D4852]">Reset Password</CardTitle>
        <CardDescription className="text-sm text-[#6B7280] font-body">
          Enter your email to receive a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <div className="text-center space-y-4 py-4">
            <div className="p-4 bg-[#38B2AC]/15 text-[#38B2AC] border border-[#38B2AC]/30 rounded-[20px] w-14 h-14 flex items-center justify-center mx-auto mb-4 neu-inset-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <p className="text-sm text-[#3D4852] font-body">
              If an account exists for <span className="font-bold text-[#6C63FF]">{email}</span>, you will receive a password reset link shortly.
            </p>
          </div>
        ) : (
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
            <Button type="submit" className="w-full neu-btn-primary py-3 rounded-[22px] text-white font-semibold text-sm cursor-pointer">
              Send Reset Link
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#3D4852] font-semibold">
          &larr; Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}
