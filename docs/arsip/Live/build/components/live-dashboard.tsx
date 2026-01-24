"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PlayCircle, Users, DollarSign, ShoppingCart, Clock, ChevronDown, ChevronRight, Zap, Video, Eye, Wallet, Info, Percent, Loader2, Package, Activity, CircleOff } from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SummaryCard } from "@/components/dashboard-helpers" // Import SummaryCard
import { LivePerformanceChart } from "@/components/live-performance-chart" // Import new chart component
import React from "react"

interface LiveDashboardProps {
  onBack: () => void
}

interface LiveRow {
  team: string
  username: string
  session_id: string
  start_time: string
  title: string
  comments: number
  carts: number
  duration: number
  viewers: number
  orders: number
  sales: string
  sales_raw: number
  status: string
}

export function LiveDashboard({ onBack }: LiveDashboardProps) {
  const [filterTeam, setFilterTeam] = useState<string[]>([]) // Changed to array for multi-select
  const [isReady, setIsReady] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Bot control states - store state per session (username + sessionId)
  const [botStates, setBotStates] = useState<{
    [key: string]: {
      like?: boolean
      share?: boolean
      addToCart?: boolean
      autoKomentar?: boolean
      autoReply?: boolean
    }
  }>({})
  
  // Load accounts directly from database (skip localStorage)
  const [localAccounts, setLocalAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  
  // Fetch teams directly from filters API
  const { data: filtersData } = useSWR(
    '/api/accounts/filters',
    fetcher
  )
  
  // @ts-ignore - SWR returns unknown type
  const filtersDataSafe: any = filtersData
  const teamsFromFilters: { kode_tim: string; nama_tim: string }[] = 
    filtersDataSafe?.success && filtersDataSafe?.data?.teams
      ? filtersDataSafe.data.teams
      : []
  
  // Initialize ready state
  useEffect(() => {
    setIsReady(true)
  }, [])
  
  // Fetch accounts from database after mount
  useEffect(() => {
    if (!isReady) return
    
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true)
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch('/api/accounts/active', { headers })
        const data = await response.json()
        
        if (data.success && data.accounts) {
          console.log('📋 LiveDashboard: Loaded', data.accounts.length, 'accounts from database')
          setLocalAccounts(data.accounts)
        } else {
          console.log('📋 LiveDashboard: No accounts found in database')
          setLocalAccounts([])
      }
    } catch (error) {
        console.error('Error loading accounts from database:', error)
        setLocalAccounts([])
      } finally {
        setLoadingAccounts(false)
      }
    }
    
    fetchAccounts()
  }, [isReady])

  // Refresh accounts from database periodically (every 30 seconds)
  useEffect(() => {
    if (!isReady) return

    const refreshAccounts = async () => {
      try {
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch('/api/accounts/active', { headers })
        const data = await response.json()
        
        if (data.success && data.accounts) {
          setLocalAccounts(data.accounts)
          }
        } catch (error) {
        console.error('Error refreshing accounts:', error)
        }
      }

    // Refresh every 30 seconds
    const interval = setInterval(refreshAccounts, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [isReady])

  // Get teams - prioritize from filters API, fallback to accounts
  const teamsRef = useRef<string[]>([])
  const teams = useMemo(() => {
    // First, try to get teams from filters API (more reliable)
    if (teamsFromFilters && teamsFromFilters.length > 0) {
      const teamNames = teamsFromFilters
        .map((team: any) => team.nama_tim)
        .filter((team: any): team is string => Boolean(team && typeof team === 'string'))
      const newTeams = Array.from(new Set(teamNames)).sort()
      
      const teamsString = JSON.stringify(newTeams)
      const prevTeamsString = JSON.stringify(teamsRef.current)
      if (teamsString !== prevTeamsString) {
        teamsRef.current = newTeams
      }
      
      return teamsRef.current
    }
    
    // Fallback: get teams from localAccounts
    const teamNames = localAccounts
      .map((acc: any) => acc.nama_tim || acc.team)
      .filter((team: any): team is string => Boolean(team && typeof team === 'string'))
    const newTeams = Array.from(new Set(teamNames)).sort()
    
    // Only update if teams actually changed
    const teamsString = JSON.stringify(newTeams)
    const prevTeamsString = JSON.stringify(teamsRef.current)
    if (teamsString !== prevTeamsString) {
      teamsRef.current = newTeams
    }
    
    return teamsRef.current
  }, [localAccounts, teamsFromFilters])
  
  // Build API URL with team filter - API sekarang mengambil semua data dari database
  const liveDataUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (filterTeam.length > 0) {
      // Support multiple teams
      filterTeam.forEach(team => {
        params.append('team', team)
      })
    }
    // Tidak perlu kirim usernames, API akan mengambil semua dari database
    return `/api/live_data?${params.toString()}`
  }, [filterTeam])


  // Fetch live data with auto-refresh every 10 seconds
  // Use mutate from SWR for manual refresh to ensure it works even when tab is not focused
  const { data: liveDataResp, isLoading: loadingLive, mutate: mutateLiveData } = useSWR(
    liveDataUrl,
    fetcher,
    { 
      refreshInterval: 0, // Disable automatic refresh, we'll handle it manually
      revalidateOnFocus: false, // Don't refresh on window focus
      revalidateOnReconnect: true // Only refresh on reconnect
    }
  )

  // Custom polling that works even when tab is not focused
  // Uses aggressive polling techniques to ensure data updates continue regardless of tab visibility
  useEffect(() => {
    if (!liveDataUrl) return

    const REFRESH_INTERVAL = 10000 // 10 seconds
    let intervalId: NodeJS.Timeout | null = null
    let lastRefreshTime = Date.now()
    let timeoutId: NodeJS.Timeout | null = null
    let isRefreshing = false

    // Function to refresh data
    const refreshData = async () => {
      if (isRefreshing) return // Prevent concurrent refreshes
      isRefreshing = true
      const now = Date.now()
      lastRefreshTime = now
      try {
        await mutateLiveData()
      } catch (error) {
        console.error('Error refreshing live data:', error)
      } finally {
        isRefreshing = false
      }
    }

    // Primary: Recursive timeout with aggressive scheduling
    // This is more resistant to throttling than setInterval
    const scheduleNextRefresh = () => {
      // Clear any existing timeout first
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshTime
      const timeUntilNextRefresh = Math.max(0, REFRESH_INTERVAL - timeSinceLastRefresh)
      
      timeoutId = setTimeout(() => {
        refreshData().finally(() => {
          // Schedule next refresh immediately after current one completes
          // This ensures continuous polling even if browser throttles
          scheduleNextRefresh()
        })
      }, timeUntilNextRefresh)
    }

    // Start the recursive scheduling
    scheduleNextRefresh()

    // Backup: Multiple setInterval with different intervals to increase chances
    // Even if browser throttles one, others might still work
    const intervals: NodeJS.Timeout[] = []
    
    // Primary interval
    intervalId = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime
      if (timeSinceLastRefresh >= REFRESH_INTERVAL * 0.9 && !isRefreshing) {
        refreshData()
      }
    }, REFRESH_INTERVAL)
    intervals.push(intervalId)

    // Backup interval with slightly different timing
    const backupInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime
      if (timeSinceLastRefresh >= REFRESH_INTERVAL * 1.1 && !isRefreshing) {
        refreshData()
      }
    }, REFRESH_INTERVAL + 1000)
    intervals.push(backupInterval)

    // Handle visibility change - ensure we refresh when tab becomes visible
    // and also try to maintain polling when tab is hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, refresh immediately
        const timeSinceLastRefresh = Date.now() - lastRefreshTime
        if (timeSinceLastRefresh >= REFRESH_INTERVAL * 0.3) {
          refreshData()
        }
      } else {
        // Tab became hidden - try to maintain polling by rescheduling
        // This helps counteract browser throttling
        scheduleNextRefresh()
      }
    }

    // Handle window focus/blur as additional triggers
    const handleFocus = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime
      if (timeSinceLastRefresh >= REFRESH_INTERVAL * 0.3) {
        refreshData()
      }
    }

    const handleBlur = () => {
      // When window loses focus, reschedule to maintain polling
      scheduleNextRefresh()
    }

    // Use Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Also use pagehide/pageshow as additional fallback
    const handlePageShow = () => {
      refreshData()
    }
    window.addEventListener('pageshow', handlePageShow)

    // Initial refresh
    refreshData()

    return () => {
      // Cleanup all intervals
      intervals.forEach(id => {
        if (id) clearInterval(id)
      })
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [liveDataUrl, mutateLiveData])

  // @ts-ignore - SWR returns unknown type
  const liveDataRespSafe: any = liveDataResp
  // Data sudah di-filter di API berdasarkan team filter
  // Use useMemo to prevent unnecessary re-computation
  const liveData: LiveRow[] = useMemo(() => {
    return liveDataRespSafe?.rows || []
  }, [liveDataResp])
  
  const [openRow, setOpenRow] = useState<string | null>(null)
  const lastStates = useRef<{[username: string]: {gmv: number, status: string}} | null>(null)
  const [highlighted, setHighlighted] = useState<{[sessionId: string]: boolean}>({})
  const [showEndLivePopup, setShowEndLivePopup] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Check current permission
      setNotificationPermission(Notification.permission)
      
      // Request permission if not granted or denied
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // Check if tab is visible/active
  const isTabVisible = useRef(true)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      isTabVisible.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    isTabVisible.current = !document.hidden

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // TTS function
  function speakTTS(message: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    const tts = new window.SpeechSynthesisUtterance(message)
    tts.lang = "id-ID"
    window.speechSynthesis.speak(tts)
  }

  // Browser notification function
  function showBrowserNotification(title: string, message: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'live-dashboard-notification', // Prevent duplicate notifications
        requireInteraction: false,
        ...options
      })

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click to focus window
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }
  }

  // Combined notification function - always use TTS, and also show browser notification if tab not visible
  function notifyNewSale(username: string, message: string) {
    // Always play TTS regardless of tab visibility
    speakTTS(message)
    
    // Also show browser notification if tab is not visible (as backup/reminder)
    if (!isTabVisible.current) {
      showBrowserNotification('Pembeli Baru!', message)
    }
  }

  // Get TTS message from localStorage or use default
  const getTtsNewSaleMessage = (username: string): string => {
    if (typeof window === 'undefined') {
      return `Selamat! Lapak ${username} mendapatkan pembeli baru. Aya meren! Udud myboss Saat!`;
    }
    const savedMessage = localStorage.getItem('tts_new_sale_message');
    if (savedMessage) {
      // Replace ${username} with actual username
      return savedMessage.replace(/\$\{username\}/g, username);
    }
    // Default message
    return `Selamat! Lapak ${username} mendapatkan pembeli baru. Aya meren! Udud myboss Saat!`;
  };

  // Filter data di frontend juga, untuk jaga-jaga jika backend mengembalikan semua data
  const filteredLiveStreams = useMemo(() => {
    if (filterTeam.length === 0) {
      // No filter selected, show all
      return liveData
    }
    // Filter by selected teams
    return liveData.filter((stream) => filterTeam.includes(stream.team))
  }, [liveData, filterTeam])

  // Pagination logic
  const totalPages = Math.ceil(filteredLiveStreams.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLiveStreams = filteredLiveStreams.slice(startIndex, endIndex)

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterTeam])
  
  // Helper function to check if account is in selected teams
  const isAccountInSelectedTeams = useCallback((accountTeam: string): boolean => {
    if (filterTeam.length === 0) return true // No filter, show all
    return filterTeam.includes(accountTeam)
  }, [filterTeam])

  // Hitung total GMV terfilter
  const filteredTotalGmv = filteredLiveStreams.reduce((sum, stream) => sum + (stream.sales_raw || 0), 0)
  const filteredFormattedGmv = `${filteredTotalGmv.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

  const totalPenonton = filteredLiveStreams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const totalPesanan = filteredLiveStreams.reduce((sum, stream) => sum + (stream.orders || 0), 0)
  const totalKeranjang = filteredLiveStreams.reduce((sum, stream) => sum + (stream.carts || 0), 0)
  const totalLiveBerakhir = filteredLiveStreams.filter((stream) => stream.status === "Berakhir").length
  const totalLiveOnline = filteredLiveStreams.filter((stream) => stream.status !== "Berakhir").length

  // Hitung rata-rata Rasio Sales
  const rasioSalesList = filteredLiveStreams.filter(s => s.viewers > 0).map(s => s.orders / s.viewers * 100)
  const avgRasioSales = rasioSalesList.length > 0 ? Math.round(rasioSalesList.reduce((a, b) => a + b, 0) / rasioSalesList.length) : 0

  // TTS & highlight saat data live berubah (konsep manual)
  // Use ref to track if we're processing to prevent infinite loops
  const isProcessingRef = useRef(false)
  const liveDataHashRef = useRef<string>('')
  
  // Create stable hash of liveData to detect actual changes
  const liveDataHash = useMemo(() => {
    if (!liveData || liveData.length === 0) return ''
    return JSON.stringify(liveData.map((item: any) => ({
      username: item.username,
      session_id: item.session_id,
      sales_raw: item.sales_raw,
      status: item.status
    })))
  }, [liveData])
  
  useEffect(() => {
    if (!isReady || !liveData || liveData.length === 0 || isProcessingRef.current) return;
    
    // Only process if data actually changed
    if (liveDataHash === liveDataHashRef.current) return
    liveDataHashRef.current = liveDataHash
    
    isProcessingRef.current = true
    
    // Use setTimeout to defer processing and prevent blocking
    const timeoutId = setTimeout(() => {
      try {
        if (!lastStates.current) {
          // Inisialisasi pertama
          const newLast: {[username: string]: {gmv: number, status: string}} = {};
          liveData.forEach((item: any) => {
            newLast[item.username] = { gmv: item.sales_raw || 0, status: item.status };
          });
          lastStates.current = newLast;
          isProcessingRef.current = false
          return;
        }
        const newHighlights: {[sessionId: string]: boolean} = {};
        liveData.forEach((item: any) => {
          const username = item.username;
          const currentGmv = item.sales_raw || 0;
          const currentStatus = item.status;
          const sessionId = item.session_id;
          const accountTeam = item.team || '';
          
          // Only process notifications/TTS for accounts in selected teams
          if (!isAccountInSelectedTeams(accountTeam)) {
            return; // Skip this account if not in selected teams
          }
          
          const last = lastStates.current![username];
          if (last) {
            // TTS: Penjualan baru
            if (currentGmv > last.gmv && currentGmv - last.gmv >= 1000) {
              const message = getTtsNewSaleMessage(username);
              notifyNewSale(username, message);
              newHighlights[sessionId] = true;
              setTimeout(() => {
                setHighlighted(h => {
                  const newH = {...h}
                  delete newH[sessionId]
                  return newH
                })
              }, 2000);
            }
            // TTS: Live berakhir
            if (last.status === "LIVE" && currentStatus !== "LIVE") {
              const message = `Live akun ${username} telah berakhir.`;
              // Always play TTS regardless of tab visibility
              speakTTS(message);
              // Also show browser notification if tab is not visible
              if (!isTabVisible.current) {
                showBrowserNotification('Live Berakhir', message);
              }
            }
            // TTS: Live dimulai
            if (last.status !== "LIVE" && currentStatus === "LIVE") {
              const message = `Live akun ${username} telah dimulai kembali. Gaskeun!`;
              // Always play TTS regardless of tab visibility
              speakTTS(message);
              // Also show browser notification if tab is not visible
              if (!isTabVisible.current) {
                showBrowserNotification('Live Dimulai', message);
              }
            }
          }
        });
        
        // Only update highlighted if there are new highlights
        if (Object.keys(newHighlights).length > 0) {
          setHighlighted(h => ({...h, ...newHighlights}));
        }
        
        // Update lastStates
        const newLast: {[username: string]: {gmv: number, status: string}} = {};
        liveData.forEach((item: any) => {
          newLast[item.username] = { gmv: item.sales_raw || 0, status: item.status };
        });
        lastStates.current = newLast;
      } finally {
        isProcessingRef.current = false
      }
    }, 100) // Small delay to prevent rapid re-processing
    
    return () => {
      clearTimeout(timeoutId)
      isProcessingRef.current = false
    }
  }, [liveDataHash, isReady, isAccountInSelectedTeams]);

  if (!isReady || loadingAccounts || loadingLive) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
          <p className="text-lg text-white font-medium">
            {loadingAccounts ? 'Memuat data akun dari database...' : 'Sabar my Boss...🤣 Si Shopee update wae!...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-3 md:space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white">SOROBOT - Shopee Live Dashboard</h1>
        <p className="text-xs md:text-sm text-white/60">Monitor performa live stream Shopee secara real-time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-12 gap-3 md:gap-4 lg:gap-6">
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 mb-3 md:mb-4">
        <SummaryCard
          title="Total Penjualan Live"
          value={filteredFormattedGmv}
          icon={Wallet}
          color="text-green-500"
          description="Total penjualan dari semua live"
        />
        <SummaryCard
          title="Total Penonton Unik"
          value={totalPenonton.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
          icon={Eye}
          color="text-blue-500"
          description="Jumlah penonton di semua sesi live"
        />
        <SummaryCard
          title="Total Order & Cart"
          value={
            <div className="flex flex-row justify-center items-center gap-4 md:gap-6 lg:gap-8">
              <div className="flex flex-row items-center gap-1.5 md:gap-2">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0" />
                <span className="text-cyan-400 text-2xl md:text-3xl font-semibold leading-tight">{totalPesanan.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex flex-row items-center gap-1.5 md:gap-2">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-blue-400 flex-shrink-0" />
                <span className="text-blue-400 text-2xl md:text-3xl font-semibold leading-tight">{totalKeranjang.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          }
          icon={ShoppingCart}
          color="text-cyan-500"
          description={null}
        />
        <SummaryCard
          title="Rasio Sales"
          value={`${avgRasioSales}%`}
          icon={Percent}
          color="text-purple-500"
          description="Rata-rata rasio sales semua live"
        />
        <SummaryCard
          title="Sesi Live"
          value={
            <div className="flex flex-row justify-center items-center gap-4 md:gap-6 lg:gap-8">
              <div className="flex flex-row items-center gap-1.5 md:gap-2">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0" />
                <span className="text-cyan-400 text-2xl md:text-3xl font-semibold leading-tight">{totalLiveOnline.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex flex-row items-center gap-1.5 md:gap-2">
                <CircleOff className="h-4 w-4 md:h-5 md:w-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-2xl md:text-3xl font-semibold leading-tight">{totalLiveBerakhir.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          }
          icon={Video}
          color="text-orange-500"
          description={null}
        />
        </div>

      {/* Live Dashboard Table */}
      <div className="col-span-12">
        <Card className="glass-card border-white/10 overflow-hidden">
          <CardHeader className="border-b border-white/10 pb-3 md:pb-4 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
              <CardTitle className="text-white flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg md:text-xl font-semibold">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 md:h-6 md:w-6 text-cyan-400 animate-pulse drop-shadow-[0_0_12px_rgba(0,217,255,0.7)]" />
                  <span>Live Dashboard</span>
                </div>
                <span className="flex items-center text-amber-400 text-xs md:text-sm font-medium">
                  <Info className="h-3 w-3 md:h-4 md:w-4 mr-1 text-amber-400" />
                  <span className="hidden sm:inline">Klik data untuk detail grafik</span>
                  <span className="sm:hidden">Klik untuk detail</span>
                </span>
              </CardTitle>
              <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
                <div className="flex items-center space-x-2 flex-1 md:flex-none">
                  <span className="text-xs md:text-sm text-white/90 whitespace-nowrap">Filter Team:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full md:w-[200px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 text-sm justify-between"
                      >
                        <span className="truncate">
                          {filterTeam.length === 0 
                            ? "Semua Team" 
                            : filterTeam.length === 1 
                            ? filterTeam[0]
                            : `${filterTeam.length} Team dipilih`}
                        </span>
                        <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 glass-card border-white/10 bg-[#1A1A1A]">
                      <div className="p-2">
                        <div className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded-md cursor-pointer"
                          onClick={() => {
                            setFilterTeam([]) // Clear all selections
                          }}
                        >
                          <Checkbox 
                            checked={filterTeam.length === 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterTeam([]) // Select all
                              }
                            }}
                          />
                          <label className="text-sm text-white cursor-pointer flex-1">Semua Team</label>
                        </div>
                        <div className="border-t border-white/10 my-1"></div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                          {teams.length > 0 && teams.map((team) => (
                            <div 
                              key={team} 
                              className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded-md cursor-pointer"
                              onClick={() => {
                                setFilterTeam(prev => {
                                  if (prev.includes(team)) {
                                    // Remove team if already selected
                                    return prev.filter(t => t !== team)
                                  } else {
                                    // Add team if not selected
                                    return [...prev, team]
                                  }
                                })
                              }}
                            >
                              <Checkbox 
                                checked={filterTeam.includes(team)}
                                onCheckedChange={(checked) => {
                                  setFilterTeam(prev => {
                                    if (checked) {
                                      return [...prev, team]
                                    } else {
                                      return prev.filter(t => t !== team)
                                    }
                                  })
                                }}
                              />
                              <label className="text-sm text-white cursor-pointer flex-1">{team}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="table-container relative -mx-3 md:-mx-6">
              <div className="px-3 md:px-6 custom-scrollbar overflow-x-auto">
                <Table className="relative z-10 w-full table-auto min-w-[1000px]">
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10">
                      <TableHead className="p-0 text-white/90 text-left uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[120px] max-w-[150px]">Username</TableHead>
                      <TableHead className="p-0 hidden md:table-cell text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[140px]">Session ID</TableHead>
                      <TableHead className="p-0 text-white/90 text-left uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[120px] max-w-[180px]">Judul</TableHead>
                      <TableHead className="p-0 hidden lg:table-cell text-white/90 text-left uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[130px]">Start Live</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px]">Durasi</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px]">Penonton</TableHead>
                      <TableHead className="p-0 hidden md:table-cell text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[80px]">Komentar</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px]">Keranjang</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px]">Pesanan</TableHead>
                      <TableHead className="p-0 hidden lg:table-cell text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[90px] max-w-[110px]">Rasio Sales</TableHead>
                      <TableHead className="p-0 hidden md:table-cell text-white/90 text-right uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[140px]">Penjualan</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[80px]">Status</TableHead>
                      <TableHead className="p-0 text-white/90 text-center uppercase font-semibold text-xs pl-3 md:pl-4 !pr-4 py-3 w-[90px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAccounts || loadingLive ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={13} className="p-0 text-center py-8 pl-3 md:pl-4 !pr-4">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mb-4" />
                          <p className="text-lg font-medium text-gray-300 mb-2">
                            {loadingAccounts ? 'Memuat data akun...' : 'Memuat data live stream...'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLiveStreams.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={13} className="p-0 text-center py-8 pl-3 md:pl-4 !pr-4">
                        <div className="flex flex-col items-center justify-center">
                          <Video className="h-12 w-12 text-gray-500 mb-4" />
                          <p className="text-lg font-medium text-gray-300 mb-2">Tidak ada live stream ditemukan</p>
                          <p className="text-sm text-gray-500">Tidak ada live stream aktif saat ini</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLiveStreams.map((stream, index) => {
                    const uniqueKey = `${stream.username}-${stream.session_id}-${index}`
                    return (
                      <React.Fragment key={uniqueKey}>
                        {/* clickable summary row */}
                        <TableRow
                          onClick={() => setOpenRow(openRow === uniqueKey ? null : uniqueKey)}
                          className={`border-white/10 hover:bg-white/5 cursor-pointer transition-colors ${highlighted[stream.session_id] ? "bg-cyan-500/10" : ""}`}
                        >
                          <TableCell className="p-0 font-medium text-white text-left pl-3 md:pl-4 !pr-4 py-3 min-w-[120px] max-w-[150px]">
                            <div className="flex flex-row items-center gap-2 h-full min-w-0">
                              {openRow === uniqueKey ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/80" />
                              )}
                              <span className="truncate" title={stream.username}>{stream.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="p-0 hidden md:table-cell text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[140px]">
                            <a href={`https://live.shopee.co.id/share?from=live&session=${stream.session_id}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors truncate block" title={stream.session_id}>
                              {stream.session_id}
                            </a>
                          </TableCell>
                          <TableCell className="p-0 text-white pl-3 md:pl-4 !pr-4 py-3 min-w-[120px] max-w-[180px]">
                            <span className="truncate block" title={stream.title}>{stream.title.length > 30 ? stream.title.substring(0, 27) + "..." : stream.title}</span>
                          </TableCell>
                          <TableCell className="p-0 hidden lg:table-cell text-white/90 text-left pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[130px]">
                            <span className="truncate block" title={stream.start_time}>{stream.start_time}</span>
                          </TableCell>
                          <TableCell className="p-0 text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px] whitespace-nowrap">{stream.duration}s</TableCell>
                          <TableCell className="p-0 text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px] whitespace-nowrap">{stream.viewers}</TableCell>
                          <TableCell className="p-0 hidden md:table-cell text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 w-[80px] whitespace-nowrap">{stream.comments}</TableCell>
                          <TableCell className="p-0 text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px] whitespace-nowrap">{stream.carts}</TableCell>
                          <TableCell className="p-0 text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 w-[70px] md:w-[80px] whitespace-nowrap">{stream.orders}</TableCell>
                          <TableCell className="p-0 hidden lg:table-cell text-white/90 text-center pl-3 md:pl-4 !pr-4 py-3 min-w-[90px] max-w-[110px]">
                            {stream.viewers > 0 ? (
                              (() => {
                                const ratio = (stream.orders / stream.viewers) * 100;
                                let color = "text-cyan-400";
                                if (ratio < 5) color = "text-red-400";
                                else if (ratio < 10) color = "text-amber-400";
                                else if (ratio < 15) color = "text-green-400";
                                return <span className={color}>{Math.round(ratio)}%</span>;
                              })()
                            ) : "-"}
                          </TableCell>
                          <TableCell className="p-0 hidden md:table-cell text-cyan-400 text-right font-medium pl-3 md:pl-4 !pr-4 py-3 min-w-[100px] max-w-[140px]">
                            <span className="truncate block" title={stream.sales}>{stream.sales.replace(/^Rp\.?\s?/, "")}</span>
                          </TableCell>
                          <TableCell className="p-0 text-center pl-3 md:pl-4 !pr-4 py-3 w-[80px]">
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 md:px-2 py-1 whitespace-nowrap ${
                                stream.status === "Berakhir"
                                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                                  : "bg-green-500/10 text-green-600 border-green-500/30"
                              }`}
                            >
                              {stream.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-0 text-center pl-3 md:pl-4 !pr-4 py-3 w-[90px]">
                            <span
                              className="inline-block bg-red-500/10 text-red-500 border border-red-500/30 rounded px-2 md:px-3 py-1 text-xs font-bold cursor-pointer hover:bg-red-500/20 transition whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowEndLivePopup(true)
                              }}
                            >
                              End Live
                            </span>
                          </TableCell>
                        </TableRow>

                        {/* expanded detail row */}
                        {openRow === uniqueKey && (
                          <TableRow className="bg-white/5 border-white/10">
                            <TableCell colSpan={13} className="p-0 py-3 md:py-4 pl-3 md:pl-4 !pr-4">
                              <div className="space-y-3">
                                {/* Chart Container */}
                                <div className="h-[250px] md:h-[350px] lg:h-[400px] w-full overflow-x-auto">
                                  <div className="min-w-[600px] h-full">
                                    <LiveHourlyChartLoader 
                                      username={stream.username} 
                                      sessionId={stream.session_id}
                                      botStates={botStates[`${stream.username}-${stream.session_id}`]}
                                      onBotAction={(action, enabled) => {
                                        const key = `${stream.username}-${stream.session_id}`
                                        setBotStates(prev => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            [action]: enabled
                                          }
                                        }))
                                        // TODO: Call API to save bot state
                                        console.log(`Bot action: ${action} for ${stream.username} (${stream.session_id}) - ${enabled ? 'enabled' : 'disabled'}`)
                                      }}
                                    />
                                  </div>
                              </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  }))}
                </TableBody>
              </Table>
              </div>
            </div>
            
            {/* Pagination */}
            {filteredLiveStreams.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-3 md:px-6 py-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/90">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[80px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-white/90">entries</span>
                </div>

                <div className="text-sm text-white/90 text-center md:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLiveStreams.length)} of {filteredLiveStreams.length} entries
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    ‹
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-9 w-9 p-0 ${
                          currentPage === pageNum
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30"
                            : "glass-card border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popup End Live */}
      {showEndLivePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-xl shadow-2xl p-8 flex flex-col items-center border border-white/10">
            <div className="text-6xl mb-4 animate-bounce">😂</div>
            <div className="text-xl text-white font-bold mb-2">Tapi Boong!</div>
            <div className="text-white/90 text-center mb-4">Matikan saja di HP ya kaka! ngerjain aja mybos..!</div>
            <button
              className="mt-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors font-medium"
              onClick={() => setShowEndLivePopup(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Tambahkan komponen loader untuk fetch data hourly
function LiveHourlyChartLoader({ 
  username, 
  sessionId,
  botStates,
  onBotAction
}: { 
  username: string
  sessionId: string
  botStates?: {
    like?: boolean
    share?: boolean
    addToCart?: boolean
    autoKomentar?: boolean
    autoReply?: boolean
  }
  onBotAction?: (action: string, enabled: boolean) => void
}) {
  const [hourlyData, setHourlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    const fetchHourlyData = async () => {
      // Hanya set loading true pada load pertama
      if (initialLoad) {
        setLoading(true)
      }
      
      try {
        // Use Next.js API route
        const url = `/api/live_hourly_chart?sessionId=${encodeURIComponent(sessionId)}&username=${encodeURIComponent(username)}`
        const data = await fetcher(url)
        // @ts-ignore - SWR returns unknown type
        const dataSafe: any = data
        setHourlyData(dataSafe?.realtime || [])
        setLoading(false)
        setInitialLoad(false)
      } catch (error) {
        console.error('Error fetching hourly chart:', error)
        setLoading(false)
        setInitialLoad(false)
      }
    }

    fetchHourlyData()
    // Refresh setiap 10 detik untuk data real-time (reduced from 3s)
    const interval = setInterval(fetchHourlyData, 10000)
    return () => clearInterval(interval)
  }, [username, sessionId, initialLoad])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-2" />
      <span className="text-gray-400 text-sm">Loading chart...</span>
    </div>
  )
  return (
    <LivePerformanceChart 
      hourlyData={hourlyData}
      username={username}
      sessionId={sessionId}
      botStates={botStates}
      onBotAction={onBotAction}
    />
  )
}
