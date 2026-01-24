"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(username, password)
      
      if (result.success) {
        toast.success('Login berhasil!')
        router.push('/')
      } else {
        toast.error(result.error || 'Login gagal')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.jpg" 
              alt="AdsBot Admin" 
              className="w-16 h-16 rounded-lg object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (!img.dataset.fallbackUsed) {
                  img.dataset.fallbackUsed = "true"
                  img.src = "/placeholder-logo.png"
                } else {
                  img.style.display = "none"
                }
              }}
            />
          </div>
          <CardTitle className="text-2xl">AdsBot Admin</CardTitle>
          <CardDescription>Masuk ke dashboard admin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Masukkan password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

