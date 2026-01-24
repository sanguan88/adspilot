/**
 * Device Detector Utility
 * Detect device information from browser user agent
 */

import { UAParser } from 'ua-parser-js'

// Fallback if library is not available
let Parser: typeof UAParser
try {
  Parser = UAParser
} catch (error) {
  // Fallback for SSR or if library fails to load
  Parser = class {
    getResult() {
      return { os: { name: 'Unknown' }, browser: { name: 'Unknown' }, device: { type: undefined } }
    }
  } as any
}

export interface DeviceInfo {
  deviceName: string
  deviceId: string
  os: string
  browser: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  userAgent: string
}

/**
 * Generate device identifier from user agent
 */
function generateDeviceId(userAgent: string): string {
  // Create a simple hash from user agent
  let hash = 0
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to positive hex string and take first 8 chars
  return `device-${Math.abs(hash).toString(16).substring(0, 8)}`
}

/**
 * Format device name from OS and browser info
 */
function formatDeviceName(osName: string, osVersion: string, browserName: string, browserVersion: string, userAgent: string): string {
  // Clean up OS name
  let formattedOS = osName || 'Unknown OS'
  
  if (formattedOS.toLowerCase().includes('windows')) {
    // Extract Windows version from user agent or osVersion
    const winVersionMatch = userAgent.match(/Windows NT (\d+\.\d+)/)
    if (winVersionMatch) {
      const version = parseFloat(winVersionMatch[1])
      if (version === 10.0) {
        formattedOS = 'Windows 10/11'
      } else if (version === 6.3) {
        formattedOS = 'Windows 8.1'
      } else if (version === 6.1) {
        formattedOS = 'Windows 7'
      } else {
        formattedOS = `Windows ${winVersionMatch[1]}`
      }
    } else if (osVersion) {
      formattedOS = `Windows ${osVersion}`
    } else {
      formattedOS = 'Windows'
    }
  } else if (formattedOS.toLowerCase().includes('mac')) {
    formattedOS = osVersion ? `macOS ${osVersion}` : 'macOS'
  } else if (formattedOS.toLowerCase().includes('linux')) {
    formattedOS = osVersion ? `Linux ${osVersion}` : 'Linux'
  } else if (formattedOS.toLowerCase().includes('android')) {
    formattedOS = osVersion ? `Android ${osVersion}` : 'Android'
  } else if (formattedOS.toLowerCase().includes('ios')) {
    formattedOS = osVersion ? `iOS ${osVersion}` : 'iOS'
  }

  // Clean up browser name
  let formattedBrowser = browserName || 'Unknown Browser'
  
  // Remove version from browser name if it's included
  formattedBrowser = formattedBrowser.replace(/\s+\d+\.\d+.*$/, '')
  
  if (formattedBrowser.toLowerCase().includes('chrome') && !formattedBrowser.toLowerCase().includes('edg')) {
    formattedBrowser = 'Chrome'
  } else if (formattedBrowser.toLowerCase().includes('firefox')) {
    formattedBrowser = 'Firefox'
  } else if (formattedBrowser.toLowerCase().includes('safari') && !formattedBrowser.toLowerCase().includes('chrome')) {
    formattedBrowser = 'Safari'
  } else if (formattedBrowser.toLowerCase().includes('edg')) {
    formattedBrowser = 'Edge'
  } else if (formattedBrowser.toLowerCase().includes('opera')) {
    formattedBrowser = 'Opera'
  }

  // Add browser version if available
  if (browserVersion) {
    // Extract major version only (e.g., "129.0.0.0" -> "129")
    const majorVersion = browserVersion.split('.')[0]
    formattedBrowser = `${formattedBrowser} ${majorVersion}`
  }

  return `${formattedOS} - ${formattedBrowser}`
}

/**
 * Detect device information from browser user agent
 */
export function detectDevice(): DeviceInfo {
  // Check if running in browser
  if (typeof window === 'undefined' || !navigator) {
    return {
      deviceName: 'Unknown Device',
      deviceId: 'device-unknown',
      os: 'Unknown',
      browser: 'Unknown',
      deviceType: 'desktop',
      userAgent: ''
    }
  }

  const userAgent = navigator.userAgent
  const parser = new Parser(userAgent)
  const result = parser.getResult()

  // Get OS info
  const osName = result.os.name || 'Unknown'
  const osVersion = result.os.version || ''

  // Get browser info
  const browserName = result.browser.name || 'Unknown'
  const browserVersion = result.browser.version || ''

  // Get device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (result.device.type === 'mobile') {
    deviceType = 'mobile'
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet'
  } else {
    // Detect based on user agent patterns
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) {
        deviceType = 'tablet'
      } else {
        deviceType = 'mobile'
      }
    }
  }

  // Format device name with full info
  const deviceName = formatDeviceName(osName, osVersion, browserName, browserVersion, userAgent)

  // Generate device ID
  const deviceId = generateDeviceId(userAgent)

  return {
    deviceName,
    deviceId,
    os: osVersion ? `${osName} ${osVersion}` : osName,
    browser: browserVersion ? `${browserName} ${browserVersion}` : browserName,
    deviceType,
    userAgent
  }
}

/**
 * Get device identifier (for license/device management)
 */
export function getDeviceIdentifier(): string {
  const device = detectDevice()
  return device.deviceId
}

