"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Database, Server, Users, Loader2 } from "lucide-react"

export function DebugPanel() {
  const [accountsStatus, setAccountsStatus] = useState<{
    loaded: boolean
    accountsCount: number
    activeAccountsCount: number
    accounts: any[]
    error?: string
  }>({
    loaded: false,
    accountsCount: 0,
    activeAccountsCount: 0,
    accounts: []
  })

  const [databaseStatus, setDatabaseStatus] = useState<{
    connected: boolean
    error?: string
    message?: string
  }>({
    connected: false
  })

  const [apiStatus, setApiStatus] = useState<{
    accountsActive: boolean
    performance: boolean
    performanceFromDb: boolean
    liveData: boolean
    errors: { [key: string]: string }
  }>({
    accountsActive: false,
    performance: false,
    performanceFromDb: false,
    liveData: false,
    errors: {}
  })

  const [loading, setLoading] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [databaseLoading, setDatabaseLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)

  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const checkAccounts = async () => {
    setAccountsLoading(true)
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
        const accounts = Array.isArray(data.accounts) ? data.accounts : []
        const activeAccounts = accounts.filter((acc: any) => 
          acc.cookies && 
          acc.cookies.includes('SPC_F') && 
          acc.cookies.includes('SPC_T') &&
          acc.status_akun === 'aktif'
        )
        
        setAccountsStatus({
          loaded: true,
          accountsCount: accounts.length,
          activeAccountsCount: activeAccounts.length,
          accounts: accounts.slice(0, 10).map((acc: any) => ({
            username: acc.username || 'N/A',
            team: acc.nama_tim || acc.team || 'N/A',
            hasCookies: !!acc.cookies,
            cookiesValid: typeof acc.cookies === 'string' && 
                         acc.cookies.includes('SPC_F') && 
                         acc.cookies.includes('SPC_T'),
            status: acc.status_akun || 'N/A'
          }))
        })
      } else {
        setAccountsStatus({
          loaded: false,
          accountsCount: 0,
          activeAccountsCount: 0,
          accounts: [],
          error: data.error || 'Gagal mengambil data akun dari database'
        })
      }
    } catch (error: any) {
      setAccountsStatus({
        loaded: false,
        accountsCount: 0,
        activeAccountsCount: 0,
        accounts: [],
        error: error.message || 'Error mengambil data akun dari database'
      })
    } finally {
      setAccountsLoading(false)
    }
  }

  const checkDatabase = async () => {
    setDatabaseLoading(true)
    try {
      const response = await fetch('/api/check-database')
      const data = await response.json()
      
      if (data.success) {
        setDatabaseStatus({
          connected: true,
          message: `Database terhubung. Table responsedata ditemukan dengan ${data.totalRows || 0} rows.`
        })
      } else {
        setDatabaseStatus({
          connected: false,
          error: data.error || data.message || 'Database tidak terhubung'
        })
      }
    } catch (error: any) {
      setDatabaseStatus({
        connected: false,
        error: error.message || 'Error menghubungkan ke database'
      })
    } finally {
      setDatabaseLoading(false)
    }
  }

  const checkAPIs = async () => {
    setApiLoading(true)
    const errors: { [key: string]: string } = {}
    let accountsActiveOk = false
    let performanceOk = false
    let performanceFromDbOk = false
    let liveDataOk = false

    // Check accounts/active API
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const activeResponse = await fetch('/api/accounts/active', { headers })
      if (activeResponse.ok) {
        const data = await activeResponse.json()
        accountsActiveOk = data.success && Array.isArray(data.accounts)
      } else {
        const errorData = await activeResponse.json().catch(() => ({}))
        errors.accountsActive = errorData.error || `HTTP ${activeResponse.status}`
      }
    } catch (error: any) {
      errors.accountsActive = error.message || 'Error connecting to accounts/active API'
    }

    // Check performance API (real-time from Shopee API)
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const perfResponse = await fetch('/api/accounts/performance', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          teamFilter: 'all'
        })
      })
      
      if (perfResponse.ok) {
        const data = await perfResponse.json()
        performanceOk = data.success && Array.isArray(data.accounts)
      } else {
        const errorData = await perfResponse.json().catch(() => ({}))
        errors.performance = errorData.error || `HTTP ${perfResponse.status}`
      }
    } catch (error: any) {
      errors.performance = error.message || 'Error connecting to performance API'
    }

    // Check performance-from-db API (fallback)
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const perfDbResponse = await fetch('/api/accounts/performance-from-db', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          usernames: accountsStatus.accounts.map((acc: any) => acc.username).filter(Boolean).slice(0, 5),
          teamFilter: 'all'
        })
      })
      
      if (perfDbResponse.ok) {
        const data = await perfDbResponse.json()
        performanceFromDbOk = data.success && Array.isArray(data.accounts)
      } else {
        const errorData = await perfDbResponse.json().catch(() => ({}))
        errors.performanceFromDb = errorData.error || `HTTP ${perfDbResponse.status}`
      }
    } catch (error: any) {
      errors.performanceFromDb = error.message || 'Error connecting to performance-from-db API'
    }

    // Check live data API
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const liveResponse = await fetch('/api/live_data?team=all', { headers })
      
      if (liveResponse.ok) {
        const data = await liveResponse.json()
        liveDataOk = data.success !== false
      } else {
        const errorData = await liveResponse.json().catch(() => ({}))
        errors.liveData = errorData.error || `HTTP ${liveResponse.status}`
      }
    } catch (error: any) {
      errors.liveData = error.message || 'Error connecting to live data API'
    }

    setApiStatus({
      accountsActive: accountsActiveOk,
      performance: performanceOk,
      performanceFromDb: performanceFromDbOk,
      liveData: liveDataOk,
      errors
    })
    setApiLoading(false)
  }

  const runAllChecks = async () => {
    setLoading(true)
    await checkAccounts()
    await checkDatabase()
    await checkAPIs()
    setLoading(false)
  }

  useEffect(() => {
    if (isMounted) {
      checkAccounts()
      checkDatabase()
    }
  }, [isMounted])

  useEffect(() => {
    if (accountsStatus.accountsCount > 0) {
      checkAPIs()
    }
  }, [accountsStatus.accountsCount])

  return (
    <div className="w-full max-w-full grid grid-cols-12 gap-3 md:gap-4 lg:gap-6">
      <div className="col-span-12">
        <Card className="glass-card border-white/10">
          <CardHeader className="border-b border-white/10 pb-3 md:pb-4 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-white font-semibold text-lg md:text-xl">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                Debug Panel
              </CardTitle>
              <Button 
                onClick={runAllChecks} 
                disabled={loading} 
                size="sm"
                className="glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto text-xs md:text-sm"
              >
                <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 mr-2 ${loading ? 'animate-spin' : ''} text-cyan-400`} />
                Refresh All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
            {/* Accounts Status (from Database) */}
            <div className="border border-white/10 rounded-lg p-4 glass-card bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white">Data Akun (Database)</span>
              </div>
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-cyan-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : accountsStatus.loaded ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Loaded
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Loaded
                </Badge>
              )}
            </div>
            {accountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
            <div className="text-sm space-y-1 text-white/80">
              <p>Total Akun: <strong className="text-white">{accountsStatus.accountsCount}</strong></p>
              <p>Akun Aktif dengan Cookies Valid: <strong className="text-cyan-400">{accountsStatus.activeAccountsCount}</strong></p>
              {accountsStatus.error && (
                <p className="text-red-400">{accountsStatus.error}</p>
              )}
              {accountsStatus.accountsCount > 0 && (
                <div className="mt-2">
                  <p className="font-semibold mb-1 text-white">Sample Akun (10 pertama):</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {accountsStatus.accounts.map((acc: any, idx: number) => (
                      <div key={idx} className="text-xs glass-card bg-white/5 p-2 rounded border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-white/90"><strong className="text-white">@{acc.username}</strong> - {acc.team}</span>
                          <div className="flex gap-1">
                            {acc.hasCookies ? (
                              acc.cookiesValid ? (
                                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                  Cookies Valid
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                  Cookies Invalid
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="bg-white/10 text-white/70 border-white/20 text-xs">
                                No Cookies
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-xs ${
                              acc.status === 'aktif' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {acc.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

            {/* Database Status */}
            <div className="border border-white/10 rounded-lg p-4 glass-card bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white">Database Status</span>
              </div>
              {databaseLoading ? (
                <div className="flex items-center gap-2 text-cyan-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : databaseStatus.connected ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            {databaseLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
            <div className="text-sm text-white/80">
              {databaseStatus.message && (
                <p className="text-green-400">{databaseStatus.message}</p>
              )}
              {databaseStatus.error && (
                <p className="text-red-400">{databaseStatus.error}</p>
              )}
            </div>
            )}
          </div>

            {/* API Status */}
            <div className="border border-white/10 rounded-lg p-4 glass-card bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white">API Status</span>
              </div>
              {apiLoading && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              )}
            </div>
            {apiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
            <div className="text-sm space-y-2 text-white/80">
              <div className="flex items-center justify-between">
                <span>Accounts Active API:</span>
                {apiStatus.accountsActive ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
              {apiStatus.errors.accountsActive && (
                <p className="text-red-400 text-xs ml-4">Error: {apiStatus.errors.accountsActive}</p>
              )}

              <div className="flex items-center justify-between">
                <span>Performance API (Real-time):</span>
                {apiStatus.performance ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
              {apiStatus.errors.performance && (
                <p className="text-red-400 text-xs ml-4">Error: {apiStatus.errors.performance}</p>
              )}

              <div className="flex items-center justify-between">
                <span>Performance From DB (Fallback):</span>
                {apiStatus.performanceFromDb ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
              {apiStatus.errors.performanceFromDb && (
                <p className="text-red-400 text-xs ml-4">Error: {apiStatus.errors.performanceFromDb}</p>
              )}

              <div className="flex items-center justify-between">
                <span>Live Data API:</span>
                {apiStatus.liveData ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
              {apiStatus.errors.liveData && (
                <p className="text-red-400 text-xs ml-4">Error: {apiStatus.errors.liveData}</p>
              )}
            </div>
            )}
          </div>

            {/* Recommendations */}
            <div className="border border-amber-500/30 rounded-lg p-4 glass-card bg-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-amber-300">Rekomendasi</span>
            </div>
            <div className="text-sm text-amber-200 space-y-1">
              <p>• <strong className="text-amber-100">Data Source:</strong> Data akun diambil langsung dari database (tabel data_akun), bukan dari localStorage</p>
              <p>• <strong className="text-amber-100">Periode Data:</strong> Awal bulan sampai kemarin (atau hari ini jika kemarin kosong)</p>
              {accountsStatus.accountsCount === 0 && (
                <p>• <strong className="text-amber-100">Tidak ada akun di database</strong> - pastikan tabel data_akun memiliki data</p>
              )}
              {accountsStatus.activeAccountsCount === 0 && accountsStatus.accountsCount > 0 && (
                <p>• <strong className="text-amber-100">Tidak ada akun aktif dengan cookies valid</strong> - pastikan akun memiliki cookies dengan SPC_F dan SPC_T, dan status_akun = 'aktif'</p>
              )}
              {!databaseStatus.connected && (
                <p>• <strong className="text-amber-100">Periksa koneksi database</strong> - pastikan DB_HOST, DB_PORT, DB_USER, dan DB_PASSWORD sudah benar</p>
              )}
              {!apiStatus.accountsActive && (
                <p>• <strong className="text-amber-100">Periksa API Accounts Active</strong> - API ini mengambil akun aktif dari database</p>
              )}
              {!apiStatus.performance && !apiStatus.performanceFromDb && (
                <p>• <strong className="text-amber-100">Periksa API Performance</strong> - Jika real-time gagal, akan fallback ke responsedata table</p>
              )}
              {!apiStatus.liveData && (
                <p>• <strong className="text-amber-100">Periksa API Live Data</strong> - pastikan server berjalan dan API routes dapat diakses</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

