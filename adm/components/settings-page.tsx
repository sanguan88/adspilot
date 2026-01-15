"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Shield, Bell, Database, Save, DollarSign, Users } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { pageLayout, typography, standardSpacing, gridLayouts } from "@/lib/design-tokens"

interface SystemSettings {
  system: {
    appName: string
    appVersion: string
    maintenanceMode: boolean
    allowRegistration: boolean
  }
  email: {
    smtpHost: string
    smtpPort: string
    smtpUser: string
    smtpFrom: string
  }
  payment: {
    paymentGateway: string
    currency: string
  }
  security: {
    jwtSecret: string
    sessionTimeout: number
    maxLoginAttempts: number
    loginWindowMinutes?: number
    loginBlockDurationMinutes?: number
    rateLimitEnabled?: boolean
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    webhookUrl: string
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/settings")
      const data = await response.json()

      if (data.success) {
        setSettings(data.data)
      } else {
        toast.error("Gagal memuat settings")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Terjadi kesalahan saat memuat settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    try {
      setSaving(true)
      const response = await authenticatedFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Settings berhasil disimpan")
      } else {
        toast.error(data.error || "Gagal menyimpan settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Terjadi kesalahan saat menyimpan settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="text-center py-20 text-gray-600">No settings available</div>
        </div>
      </div>
    )
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Settings</h1>
            <p className={pageLayout.headerDescription}>
              System settings dan konfigurasi
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <Tabs defaultValue="system" className="space-y-4">
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* System Settings */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={gridLayouts.formGrid}>
                  <div>
                    <Label>App Name</Label>
                    <Input
                      value={settings.system.appName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, appName: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>App Version</Label>
                    <Input
                      value={settings.system.appVersion}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, appVersion: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className={typography.muted}>
                      Enable maintenance mode to restrict access
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        system: { ...settings.system, maintenanceMode: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Registration</Label>
                    <p className={typography.muted}>
                      Allow new users to register
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.allowRegistration}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        system: { ...settings.system, allowRegistration: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Email Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={gridLayouts.formGrid}>
                  <div>
                    <Label>SMTP Host</Label>
                    <Input
                      value={settings.email.smtpHost}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, smtpHost: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={settings.email.smtpPort}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, smtpPort: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>SMTP User</Label>
                    <Input
                      value={settings.email.smtpUser}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, smtpUser: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>SMTP From</Label>
                    <Input
                      value={settings.email.smtpFrom}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, smtpFrom: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={gridLayouts.formGrid}>
                  <div>
                    <Label>Payment Gateway</Label>
                    <Input
                      value={settings.payment.paymentGateway}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          payment: { ...settings.payment, paymentGateway: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={settings.payment.currency}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          payment: { ...settings.payment, currency: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>JWT Secret</Label>
                  <Input
                    type="password"
                    value={settings.security.jwtSecret}
                    disabled
                    placeholder="Hidden for security"
                  />
                  <p className={`${typography.mutedSmall} mt-1`}>
                    JWT Secret is hidden for security reasons
                  </p>
                </div>
                <div className={gridLayouts.formGrid}>
                  <div>
                    <Label>Session Timeout (seconds)</Label>
                    <Input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            sessionTimeout: parseInt(e.target.value) || 3600,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            maxLoginAttempts: parseInt(e.target.value) || 5,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Login Window (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.security.loginWindowMinutes || 15}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            loginWindowMinutes: parseInt(e.target.value) || 15,
                          },
                        })
                      }
                    />
                    <p className={`${typography.mutedSmall} mt-1`}>
                      Time window to count login attempts
                    </p>
                  </div>
                  <div>
                    <Label>Block Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.security.loginBlockDurationMinutes || 30}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            loginBlockDurationMinutes: parseInt(e.target.value) || 30,
                          },
                        })
                      }
                    />
                    <p className={`${typography.mutedSmall} mt-1`}>
                      Duration to block after max attempts
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rate Limiting</Label>
                    <p className={typography.muted}>
                      Enable rate limiting for login attempts
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.rateLimitEnabled !== false}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          rateLimitEnabled: checked,
                        },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className={typography.muted}>Enable email notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          emailEnabled: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className={typography.muted}>Enable SMS notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.smsEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          smsEnabled: checked,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={settings.notifications.webhookUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          webhookUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://example.com/webhook"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
