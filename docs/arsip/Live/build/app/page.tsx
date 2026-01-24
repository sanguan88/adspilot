"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LiveDashboard } from "../components/live-dashboard"
import { ManagementAccount } from "../components/management-account"
import { AppSidebar } from './components/app-sidebar'
import { DebugPanel } from "../components/debug-panel"
import { Loader2, Copy, Check, Key, Calendar, Smartphone, User, Volume2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { detectDevice } from "@/lib/device-detector"

export default function Page(): React.ReactElement {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [activePage, setActivePage] = useState('live')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading while checking auth
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  let content: React.ReactElement = <></>
  if (activePage === 'live') content = <LiveDashboard onBack={() => {}} />
  else if (activePage === 'account') content = <ManagementAccount onBack={() => setActivePage('live')} />
  else if (activePage === 'setting') content = <SettingPage />
  else if (activePage === 'debug') content = <DebugPanel />

  // Calculate margin based on sidebar state
  // Collapsed: 64px (w-16) + 16px (left-4) = 80px
  // Expanded: 256px (w-64) + 16px (left-4) = 272px
  const mainContentMargin = isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[272px]'

  return (
    <div className="w-full min-h-screen m-0 p-0 flex flex-col md:flex-row bg-[#0A0A0A] relative">
      {/* Sidebar */}
      <AppSidebar 
        onNavigate={setActivePage} 
        activePage={activePage}
        onCollapseChange={setIsSidebarCollapsed}
      />
      
      {/* Main Content */}
      <div className={`flex-1 overflow-auto custom-scrollbar relative z-10 transition-all duration-300 w-full ${mainContentMargin}`}>
        <div className="p-3 md:p-4 lg:p-6 relative z-10 w-full max-w-full">
          {content}
        </div>
      </div>
    </div>
  )
}

function SettingPage() {
  const { user } = useAuth()
  const [licenseData, setLicenseData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [ttsMessage, setTtsMessage] = React.useState<string>('');

  useEffect(() => {
    loadLicenseData();
    // Load TTS message from localStorage
    if (typeof window !== 'undefined') {
      const savedTtsMessage = localStorage.getItem('tts_new_sale_message');
      if (savedTtsMessage) {
        setTtsMessage(savedTtsMessage);
      } else {
        // Set default message
        const defaultMessage = 'Selamat! Lapak ${username} mendapatkan pembeli baru. Aya meren! Udud myboss Saat!';
        setTtsMessage(defaultMessage);
      }
    }
  }, []);

  const handleTtsMessageChange = (value: string) => {
    setTtsMessage(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_new_sale_message', value);
    }
  };

  const loadLicenseData = async () => {
    setLoading(true);
    try {
      // Detect device information from browser user agent
      const deviceInfo = detectDevice();

      // TODO: Fetch license data from API
      // For now, using placeholder data with real device info
      setLicenseData({
        status: 'active', // 'active' | 'expired' | 'revoked' | null
        licenseKey: 'RFA-1-123-ABC123-XYZ789',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        deviceName: deviceInfo.deviceName, // Real device name from user agent (e.g., "Windows 10/11 - Chrome 129")
        deviceId: deviceInfo.deviceId, // Real device ID from user agent hash
        os: deviceInfo.os, // OS info (e.g., "Windows 10.0")
        browser: deviceInfo.browser, // Browser info (e.g., "Chrome 129.0.0.0")
        deviceType: deviceInfo.deviceType, // Device type: mobile, tablet, or desktop
        // User info (dummy data)
        userName: user?.name || user?.nama_lengkap || 'John Doe',
        userEmail: user?.email || 'john.doe@example.com'
      });
    } catch (error) {
      console.error('Error loading license data:', error);
      setLicenseData(null);
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-yellow-400 border-yellow-500/40 bg-yellow-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
          No License
        </Badge>
      );
    }
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="text-green-400 border-green-500/40 bg-green-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="text-red-400 border-red-500/40 bg-red-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
            Expired
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="outline" className="text-gray-400 border-gray-500/40 bg-gray-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            Revoked
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    if (!expiresAt) return null;
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-1 md:space-y-2">
        <h1 className="text-xl md:text-2xl font-semibold text-white">License Information</h1>
        <p className="text-xs md:text-sm text-white/60">Informasi lisensi dan status aktivasi aplikasi</p>
      </div>

      {/* License Status Card */}
      <div className="glass-card rounded-lg p-4 md:p-6 border border-white/10">
        {loading ? (
          <div className="flex items-center justify-center py-8 md:py-12">
            <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-cyan-400" />
          </div>
        ) : licenseData ? (
          <div className="space-y-4 md:space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">License Status</h2>
              </div>
              {getStatusBadge(licenseData.status)}
            </div>

            {/* License Owner */}
            {(licenseData.userName || licenseData.userEmail) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  License Owner
                </label>
                <div className="space-y-1">
                  {licenseData.userName && (
                    <div className="text-base text-white/90 font-medium">
                      {licenseData.userName}
                    </div>
                  )}
                  {licenseData.userEmail && (
                    <div className="text-sm text-white/60">
                      {licenseData.userEmail}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* License Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">License Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm text-cyan-400 bg-white/5 px-4 py-3 rounded border border-cyan-500/30 glow-cyan select-all">
                  {licenseData.licenseKey}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(licenseData.licenseKey)}
                  className="h-10 w-10 p-0 hover:bg-white/10 text-white/70 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Expires Date */}
            {licenseData.expiresAt && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expires Date
                </label>
                <div className="text-base text-white">
                  {formatDate(licenseData.expiresAt)}
                  {getDaysUntilExpiry(licenseData.expiresAt) !== null && (
                    <span className={`ml-2 text-sm ${getDaysUntilExpiry(licenseData.expiresAt)! <= 7 ? 'text-red-400' : getDaysUntilExpiry(licenseData.expiresAt)! <= 30 ? 'text-yellow-400' : 'text-white/60'}`}>
                      ({getDaysUntilExpiry(licenseData.expiresAt)} days remaining)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Current Device Info */}
            {licenseData.deviceName && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Current Device
                </label>
                <div className="space-y-2">
                  {/* Device Name */}
                  <div className="text-base text-white/90 font-medium">
                    {licenseData.deviceName}
                  </div>
                  
                  {/* Device Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    {/* OS Info */}
                    {licenseData.os && (
                      <div className="space-y-1">
                        <div className="text-xs text-white/60">Operating System</div>
                        <div className="text-sm text-white/80">{licenseData.os}</div>
                      </div>
                    )}
                    
                    {/* Browser Info */}
                    {licenseData.browser && (
                      <div className="space-y-1">
                        <div className="text-xs text-white/60">Browser</div>
                        <div className="text-sm text-white/80">{licenseData.browser}</div>
                      </div>
                    )}
                    
                    {/* Device Type */}
                    {licenseData.deviceType && (
                      <div className="space-y-1">
                        <div className="text-xs text-white/60">Device Type</div>
                        <div className="text-sm text-white/80 capitalize">{licenseData.deviceType}</div>
                      </div>
                    )}
                    
                    {/* Device ID */}
                    {licenseData.deviceId && (
                      <div className="space-y-1">
                        <div className="text-xs text-white/60">Device ID</div>
                        <div className="text-xs text-white/60 font-mono">{licenseData.deviceId}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <Key className="h-12 w-12 text-white/40 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No License Found</h3>
              <p className="text-sm text-white/60 mb-6">You don't have an active license yet.</p>
        <a
          href="https://app.sorobot.id"
          target="_blank"
          rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-lg glow-cyan border-none outline-none focus:ring-2 focus:ring-cyan-400"
        >
                Activate License
        </a>
            </div>
          </div>
        )}
      </div>

      {/* TTS Settings Card */}
      <div className="glass-card rounded-lg p-4 md:p-6 border border-white/10">
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">TTS Settings</h2>
          </div>

          {/* TTS Message Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Pesan TTS untuk Pembeli Baru
            </label>
            <p className="text-xs text-white/60">
              Gunakan <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">${'{username}'}</code> untuk menampilkan nama akun
            </p>
            <Textarea
              value={ttsMessage}
              onChange={(e) => handleTtsMessageChange(e.target.value)}
              placeholder="Masukkan pesan TTS untuk pembeli baru..."
              className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-500/50"
            />
            <p className="text-xs text-white/50">
              Pesan akan disimpan otomatis saat Anda mengetik
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
