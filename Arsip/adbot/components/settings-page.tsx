"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  MessageSquare,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  RefreshCw,
  Pencil
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { getPhotoProfileUrl } from "@/lib/photo-helper"

interface UserSettings {
  nama_lengkap: string
  email: string
  photo_profile?: string | null
}

interface TelegramSettings {
  hasTelegram: boolean
  chatid_tele?: string
  setupLink?: string
}

interface NotificationSettings {
  emailNotifications: boolean
  telegramNotifications: boolean
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Profile settings
  const [profileData, setProfileData] = useState<UserSettings>({
    nama_lengkap: "",
    email: "",
    photo_profile: null
  })
  
  // Telegram settings
  const [telegramData, setTelegramData] = useState<TelegramSettings>({
    hasTelegram: false,
    chatid_tele: undefined,
    setupLink: undefined
  })
  const [loadingTelegram, setLoadingTelegram] = useState(false)
  const [checkingTelegram, setCheckingTelegram] = useState(false)
  
  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  // Notification settings
  const [notificationData, setNotificationData] = useState<NotificationSettings>({
    emailNotifications: true,
    telegramNotifications: false
  })

  useEffect(() => {
    fetchUserData()
    fetchTelegramStatus()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/auth/me")
      const data = await response.json()
      
      if (data.success && data.data) {
        setProfileData({
          nama_lengkap: data.data.nama_lengkap || "",
          email: data.data.email || "",
          photo_profile: data.data.photo_profile || null
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Gagal memuat data profil")
    } finally {
      setLoading(false)
    }
  }

  const fetchTelegramStatus = async () => {
    try {
      setCheckingTelegram(true)
      const response = await authenticatedFetch("/api/user/telegram-status")
      const data = await response.json()
      
      if (data.success) {
        setTelegramData({
          hasTelegram: data.data?.hasTelegram || false,
          chatid_tele: data.data?.chatid_tele,
          setupLink: data.data?.setupLink
        })
      } else {
        setTelegramData(prev => ({ ...prev, hasTelegram: false }))
      }
    } catch (error) {
      console.error("Error fetching telegram status:", error)
      setTelegramData(prev => ({ ...prev, hasTelegram: false }))
    } finally {
      setCheckingTelegram(false)
    }
  }

  const handleSetupTelegram = async () => {
    try {
      setLoadingTelegram(true)
      const response = await authenticatedFetch("/api/user/setup-telegram")
      const data = await response.json()
      
      if (response.ok && data.success && data.data?.botUrl) {
        // Open bot in new tab
        window.open(data.data.botUrl, '_blank')
        
        // Show instruction
        toast.success("Bot Telegram telah dibuka", {
          description: "Silakan kirim /start di chat bot. Sistem akan otomatis mendeteksi setelah Anda mengirim /start.",
          duration: 10000,
        })
        
        // Start polling untuk cek status setiap 3 detik
        let pollCount = 0
        const maxPolls = 20 // 20 x 3 detik = 60 detik
        const pollInterval = setInterval(async () => {
          pollCount++
          const response = await authenticatedFetch('/api/user/telegram-status')
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data.hasTelegram) {
              clearInterval(pollInterval)
              setTelegramData(prev => ({
                ...prev,
                hasTelegram: true,
                chatid_tele: result.data.chatid_tele
              }))
              toast.success("Setup Telegram berhasil!", {
                description: "Notifikasi Telegram telah dikonfigurasi.",
              })
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval)
              toast.info("Setup belum selesai", {
                description: "Silakan kirim /start di bot Telegram, lalu klik 'Cek Status' untuk memverifikasi.",
              })
            }
          }
        }, 3000)
      } else {
        toast.error(data.error || "Gagal membuat link setup Telegram")
      }
    } catch (error) {
      console.error("Error setting up telegram:", error)
      toast.error("Gagal membuka bot Telegram", {
        description: "Silakan coba lagi.",
      })
    } finally {
      setLoadingTelegram(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung", {
        description: "Hanya file JPG, PNG, atau WEBP yang diperbolehkan."
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error("Ukuran file terlalu besar", {
        description: "Maksimal ukuran file adalah 5MB."
      })
      return
    }

    setSelectedPhoto(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadPhoto = async () => {
    if (!selectedPhoto) return

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('photo', selectedPhoto)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/user/photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Foto profil berhasil diupload")
        setSelectedPhoto(null)
        setPhotoPreview(null)
        await fetchUserData()
        await refreshUser()
      } else {
        toast.error(data.error || "Gagal mengupload foto profil")
      }
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast.error("Terjadi kesalahan saat mengupload foto")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const response = await authenticatedFetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_lengkap: profileData.nama_lengkap,
          email: profileData.email
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Profil berhasil diperbarui")
        await refreshUser() // Refresh user data in context
      } else {
        toast.error(data.error || "Gagal memperbarui profil")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Terjadi kesalahan saat menyimpan profil")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setSaving(true)
      const response = await authenticatedFetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications: notificationData.emailNotifications,
          telegramNotifications: notificationData.telegramNotifications
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Pengaturan notifikasi berhasil disimpan")
      } else {
        toast.error(data.error || "Gagal menyimpan pengaturan notifikasi")
      }
    } catch (error) {
      console.error("Error saving notifications:", error)
      toast.error("Terjadi kesalahan saat menyimpan pengaturan")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Kelola pengaturan akun dan preferensi Anda</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="telegram">
            <MessageSquare className="w-4 h-4 mr-2" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifikasi
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Keamanan
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>
                Perbarui informasi profil Anda
              </CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
               {/* Avatar with Edit Icon */}
               <div className="flex items-center gap-4">
                 <div className="relative group">
                   <Avatar className="w-20 h-20">
                     {photoPreview ? (
                       <AvatarImage src={photoPreview} alt={profileData.nama_lengkap} />
                     ) : profileData.photo_profile ? (
                       <AvatarImage 
                         src={getPhotoProfileUrl(profileData.photo_profile) || ''}
                         alt={profileData.nama_lengkap}
                       />
                     ) : null}
                     <AvatarFallback>
                       <User className="w-10 h-10" />
                     </AvatarFallback>
                   </Avatar>
                   {/* Edit Icon Overlay */}
                   <input
                     type="file"
                     id="photo-upload"
                     accept="image/jpeg,image/jpg,image/png,image/webp"
                     onChange={handlePhotoSelect}
                     className="hidden"
                   />
                   <label
                     htmlFor="photo-upload"
                     className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md border-2 border-white"
                   >
                     <Pencil className="w-4 h-4 text-white" />
                   </label>
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-medium text-gray-900">{profileData.nama_lengkap || user?.nama_lengkap}</p>
                   <p className="text-xs text-gray-500 mt-0.5">Klik icon pensil untuk mengubah foto profil</p>
                   {selectedPhoto && (
                     <div className="mt-2 flex items-center gap-2">
                       <Button
                         type="button"
                         size="sm"
                         onClick={handleUploadPhoto}
                         disabled={uploadingPhoto}
                         className="h-8"
                       >
                         {uploadingPhoto ? (
                           <>
                             <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                             Mengupload...
                           </>
                         ) : (
                           <>
                             <Upload className="w-3 h-3 mr-1.5" />
                             Upload
                           </>
                         )}
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           setSelectedPhoto(null)
                           setPhotoPreview(null)
                           const input = document.getElementById('photo-upload') as HTMLInputElement
                           if (input) input.value = ''
                         }}
                         disabled={uploadingPhoto}
                         className="h-8"
                       >
                         Batal
                       </Button>
                     </div>
                   )}
                 </div>
               </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Username tidak dapat diubah</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                  <Input
                    id="nama_lengkap"
                    value={profileData.nama_lengkap}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Masukkan email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={user?.role || ""}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telegram Tab */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle>Integrasi Telegram</CardTitle>
              <CardDescription>
                Hubungkan akun Telegram Anda untuk menerima notifikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {checkingTelegram ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : telegramData.hasTelegram ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {telegramData.hasTelegram ? "Telegram Terhubung" : "Telegram Belum Terhubung"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {telegramData.hasTelegram 
                        ? `Chat ID: ${telegramData.chatid_tele || 'N/A'}`
                        : "Hubungkan akun Telegram Anda untuk menerima notifikasi"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTelegramStatus}
                  disabled={checkingTelegram}
                >
                  {checkingTelegram ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Cek Status
                    </>
                  )}
                </Button>
              </div>

              {!telegramData.hasTelegram && (
                <div className="space-y-4">
                  <Button 
                    onClick={handleSetupTelegram} 
                    disabled={loadingTelegram}
                    className="w-full"
                  >
                    {loadingTelegram ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Hubungkan Telegram
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Klik tombol di atas untuk membuka bot Telegram. Setelah mengirim /start, klik "Cek Status" untuk memverifikasi.
                  </p>
                </div>
              )}

              {telegramData.hasTelegram && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Telegram Anda sudah terhubung. Anda akan menerima notifikasi melalui Telegram.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi</CardTitle>
              <CardDescription>
                Kelola bagaimana Anda ingin menerima notifikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Notifikasi Email
                    </Label>
                    <p className="text-sm text-gray-500">
                      Terima notifikasi melalui email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notificationData.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationData(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="telegram-notifications" className="text-base font-medium">
                      Notifikasi Telegram
                    </Label>
                    <p className="text-sm text-gray-500">
                      Terima notifikasi melalui Telegram {!telegramData.hasTelegram && "(perlu hubungkan Telegram terlebih dahulu)"}
                    </p>
                  </div>
                  <Switch
                    id="telegram-notifications"
                    checked={notificationData.telegramNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationData(prev => ({ ...prev, telegramNotifications: checked }))
                    }
                    disabled={!telegramData.hasTelegram}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan Pengaturan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Keamanan Akun</CardTitle>
              <CardDescription>
                Kelola keamanan akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Password Saat Ini</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Masukkan password saat ini"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password Baru</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Masukkan password baru"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Konfirmasi password baru"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Fitur perubahan password sedang dalam pengembangan. Silakan hubungi admin untuk mengubah password.
                </p>
              </div>

              <div className="flex justify-end">
                <Button disabled className="opacity-50">
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

