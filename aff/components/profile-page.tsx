"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Save, Lock } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

interface ProfileData {
  name: string
  email: string
  phone?: string
  payoutMethod: string
  bankAccount?: string
  bankName?: string
  eWallet?: string
  eWalletType?: string
  whatsapp?: string
  telegram?: string
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    payoutMethod: 'bank',
    bankAccount: '',
    bankName: '',
    eWallet: '',
    eWalletType: 'ovo',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProfileData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      const response = await authenticatedFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success('Profile berhasil diperbarui!')
          await refreshUser()
        } else {
          toast.error(data.error || 'Gagal memperbarui profile')
        }
      }
    } catch (error) {
      toast.error('Gagal memperbarui profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password baru tidak cocok')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    try {
      setIsSaving(true)
      const response = await authenticatedFetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success('Password berhasil diubah!')
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
        } else {
          toast.error(data.error || 'Gagal mengubah password')
        }
      }
    } catch (error) {
      toast.error('Gagal mengubah password')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Kelola informasi profil dan pengaturan payout
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={profileData.phone || ''}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+62..."
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={profileData.whatsapp || ''}
                onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                placeholder="08..."
              />
            </div>
            <div className="space-y-2">
              <Label>Telegram Username</Label>
              <Input
                value={profileData.telegram || ''}
                onChange={(e) => setProfileData({ ...profileData, telegram: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label>Affiliate Code</Label>
              <Input
                value={user?.affiliateCode || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            <Save className="w-4 h-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={profileData.payoutMethod}
              onValueChange={(value) => setProfileData({ ...profileData, payoutMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {profileData.payoutMethod === 'bank' ? (
            <>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={profileData.bankName || ''}
                  onChange={(e) => setProfileData({ ...profileData, bankName: e.target.value })}
                  placeholder="BCA, Mandiri, BNI, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={profileData.bankAccount || ''}
                  onChange={(e) => setProfileData({ ...profileData, bankAccount: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>E-Wallet Type</Label>
                <Select
                  value={profileData.eWalletType || 'ovo'}
                  onValueChange={(value) => setProfileData({ ...profileData, eWalletType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ovo">OVO</SelectItem>
                    <SelectItem value="gopay">GoPay</SelectItem>
                    <SelectItem value="dana">DANA</SelectItem>
                    <SelectItem value="linkaja">LinkAja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>E-Wallet Number</Label>
                <Input
                  value={profileData.eWallet || ''}
                  onChange={(e) => setProfileData({ ...profileData, eWallet: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </>
          )}

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            <Save className="w-4 h-4" />
            Save Payout Settings
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={isSaving}>
            <Lock className="w-4 h-4" />
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

