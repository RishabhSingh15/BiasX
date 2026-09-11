import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { 
  generateDemoAccount, 
  generateDemoTrades, 
  generateDemoRules,
  generateDemoBehaviorEvents,
  generateDemoRuleViolations
} from '@/lib/services/demo-data-generator'

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
      }
    })
    
    // Create demo account
    const accountData = generateDemoAccount()
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        ...accountData,
      }
    })

    // Create demo broker connection
    await prisma.brokerConnection.create({
      data: {
        userId: user.id,
        accountId: account.id,
        broker: 'demo',
        status: 'connected',
        lastSyncAt: new Date(),
        syncStatus: 'synced',
        totalTrades: 342,
      }
    })
    
    // Generate and insert demo trades
    const demoTrades = generateDemoTrades()
    await prisma.trade.createMany({
      data: demoTrades.map(({ behaviorType, ...trade }) => ({
        ...trade,
        accountId: account.id,
        userId: user.id,
      }))
    })
    
    // Generate and insert demo rules
    const demoRules = generateDemoRules()
    await prisma.tradingRule.createMany({
      data: demoRules.map(rule => ({
        ...rule,
        userId: user.id,
      }))
    })

    // Fetch created records for relations
    const createdTrades = await prisma.trade.findMany({ where: { userId: user.id } })
    const createdRules = await prisma.tradingRule.findMany({ where: { userId: user.id } })

    const demoEvents = generateDemoBehaviorEvents(createdTrades, user.id)
    if (demoEvents.length > 0) {
      await prisma.behaviorEvent.createMany({ data: demoEvents })
    }

    const demoViolations = generateDemoRuleViolations(createdTrades, createdRules, user.id)
    if (demoViolations.length > 0) {
      await prisma.ruleViolation.createMany({ data: demoViolations })
    }
    
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to create account' 
    }, { status: 500 })
  }
}
