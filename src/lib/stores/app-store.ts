import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  activeAccount: { id: string; name: string; type: string; balance: number; equity: number } | null
  isDemo: boolean
  notifications: Array<{ id: string; type: string; message: string; read: boolean; createdAt: Date }>
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveAccount: (account: AppState['activeAccount']) => void
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeAccount: null,
  isDemo: true,
  notifications: [],
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveAccount: (account) => set({ activeAccount: account }),
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: Math.random().toString(36).substring(7),
        read: false,
        createdAt: new Date(),
      },
      ...state.notifications,
    ]
  })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
  }))
}))
