"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface EngineStatus {
  isRunning: boolean
  checkInterval: number
  nextCheck: string | null
}

export function AutomationEngineStatus() {
  const [status, setStatus] = useState<EngineStatus>({
    isRunning: false,
    checkInterval: 60000,
    nextCheck: null
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [showModal, setShowModal] = useState(false)

  // Fetch engine status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/automation/engine')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('Error fetching engine status:', error)
    }
  }

  // Control engine (start/stop/restart)
  const controlEngine = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true)
    try {
      const response = await fetch('/api/automation/engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
        setLastUpdate(new Date().toLocaleTimeString())
        console.log(data.message)
        
        // Save state to localStorage
        localStorage.setItem('automation_engine_running', data.data.isRunning.toString())
      } else {
        console.error('Engine control failed:', data.error)
      }
    } catch (error) {
      console.error('Error controlling engine:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh status every 30 seconds and auto-start engine
  useEffect(() => {
    const initializeEngine = async () => {
      // First, check current status
      await fetchStatus()
      
      // Then try to auto-start if not running
      try {
        const statusResponse = await fetch('/api/automation/engine')
        const statusData = await statusResponse.json()
        
        if (statusData.success && !statusData.data.isRunning) {
          // Check localStorage preference
          const wasRunning = localStorage.getItem('automation_engine_running')
          
          if (wasRunning === 'true' || wasRunning === null) {
            // Auto-start engine
            console.log('🚀 Auto-starting automation engine...')
            await controlEngine('start')
          }
        }
      } catch (error) {
        console.error('Error initializing engine:', error)
      }
    }
    
    initializeEngine()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = () => {
    if (status.isRunning) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-700">Running</span>
        </div>
      )
    } else {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-xs font-medium text-gray-600">Stopped</span>
        </div>
      )
    }
  }

  const formatNextCheck = () => {
    if (!status.nextCheck) return "Not scheduled"
    
    const nextCheckTime = new Date(status.nextCheck)
    const now = new Date()
    const diffMs = nextCheckTime.getTime() - now.getTime()
    
    if (diffMs <= 0) return "Checking now..."
    
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`
    } else {
      return `${diffSeconds}s`
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Compact Status Display */}
      {getStatusBadge()}

      {/* Engine Control Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-none hover:shadow-none"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Automation Engine Control
            </DialogTitle>
            <DialogDescription>
              Manage the automation engine that executes your rules
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Engine Status</div>
                    <div className="text-sm text-gray-600">Automation service</div>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Check Interval</div>
                  <div className="font-semibold text-gray-900 mt-1">{status.checkInterval / 1000}s</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Next Check</div>
                  <div className="font-semibold text-gray-900 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatNextCheck()}
                  </div>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col gap-2">
              {!status.isRunning ? (
                <Button
                  onClick={() => controlEngine('start')}
                  disabled={loading}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Automation Engine
                </Button>
              ) : (
                <Button
                  onClick={() => controlEngine('stop')}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Automation Engine
                </Button>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={() => controlEngine('restart')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 border-gray-200 hover:bg-gray-50"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Restart
                </Button>
                
                <Button
                  onClick={fetchStatus}
                  disabled={loading}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50"
                  size="sm"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {lastUpdate && (
              <div className="text-xs text-gray-400 text-center pt-2 border-t">
                Last updated: {lastUpdate}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
