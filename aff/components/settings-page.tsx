"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Save, Lock, Wallet, CreditCard } from "lucide-react"
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

export function SettingsPage() {
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
                    toast.success('Settings updated successfully!')
                    await refreshUser()
                } else {
                    toast.error(data.error || 'Failed to update settings')
                }
            }
        } catch (error) {
            toast.error('Failed to update settings')
        } finally {
            setIsSaving(false)
        }
    }

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
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
                    toast.success('Password changed successfully!')
                    setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                    })
                } else {
                    toast.error(data.error || 'Failed to change password')
                }
            }
        } catch (error) {
            toast.error('Failed to change password')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                </div>
                <div className="space-y-4">
                    <div className="h-10 w-[400px] bg-muted animate-pulse rounded-md" />
                    <div className="h-[400px] w-full bg-muted animate-pulse rounded-md" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your account settings and preferences.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="payout">Payout</TabsTrigger>

                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>
                                Update your personal information and contact details.
                            </CardDescription>
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
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payout" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payout Settings</CardTitle>
                            <CardDescription>
                                Configure how you want to receive your commissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select
                                    value={profileData.payoutMethod}
                                    onValueChange={(value) => setProfileData({ ...profileData, payoutMethod: value })}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank">
                                            <div className="flex items-center">
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Bank Transfer
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="ewallet">
                                            <div className="flex items-center">
                                                <Wallet className="w-4 h-4 mr-2" />
                                                E-Wallet
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {profileData.payoutMethod === 'bank' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                            )}

                            <Button onClick={handleSaveProfile} disabled={isSaving}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Payout Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>



                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>
                                Manage your password and account security.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Current Password</Label>
                                <Input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="max-w-md"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <Input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="max-w-md"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm New Password</Label>
                                <Input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="max-w-md"
                                />
                            </div>
                            <Button onClick={handleChangePassword} disabled={isSaving}>
                                <Lock className="w-4 h-4 mr-2" />
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
