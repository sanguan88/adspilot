"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Helper to load Facebook Pixel
const loadFbPixel = (pixelIds: string[]) => {
    if (pixelIds.length === 0) return

    // Load script if not loaded
    if (!window.fbq) {
        ; (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            }
            if (!f._fbq) f._fbq = n
            n.push = n
            n.loaded = !0
            n.version = '2.0'
            n.queue = []
            t = b.createElement(e)
            t.async = !0
            t.src = v
            s = b.getElementsByTagName(e)[0]
            s.parentNode.insertBefore(t, s)
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    }

    // Init each ID
    pixelIds.forEach(id => {
        console.log('Initializing FB Pixel:', id)
        window.fbq('init', id)
    })

    // Track PageView for all initialized pixels
    window.fbq('track', 'PageView')
}

// Helper to load TikTok Pixel
const loadTikTokPixel = (pixelIds: string[]) => {
    if (pixelIds.length === 0) return
    if ((window as any).ttq) return; // TikTok pixel logic is complex for multi-pixel, simplified to load first or loop if supported. 
    // Ideally TT supports ttq.load(id1), ttq.load(id2)

    (function (w: any, d: any, t: any) {
        w.TiktokAnalyticsObject = t;
        var ttq = w[t] = w[t] || [];
        ttq.methods = [
            "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"
        ];
        ttq.setAndDefer = function (t: any, e: any) {
            t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            }
        };
        for (var i = 0; i < ttq.methods.length; i++) {
            ttq.setAndDefer(ttq, ttq.methods[i])
        }
        ttq.instance = function (t: any) {
            var e = ttq._i[t] || [];
            for (var n = 0; n < ttq.methods.length; n++) {
                ttq.setAndDefer(e, ttq.methods[n])
            }
            return e
        };
        ttq.load = function (e: any, n: any) {
            var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
            ttq._i = ttq._i || {};
            ttq._i[e] = [];
            ttq._i[e]._u = i;
            ttq._t = ttq._t || {};
            ttq._t[e] = +new Date;
            ttq._o = ttq._o || {};
            ttq._o[e] = n || {};
            var o = document.createElement("script");
            o.type = "text/javascript";
            o.async = !0;
            o.src = i + "?sdkid=" + e + "&lib=" + t;
            var a = document.getElementsByTagName("script")[0];
            a.parentNode?.insertBefore(o, a)
        };

        // Load all pixels
        pixelIds.forEach(id => {
            console.log('Initializing TikTok Pixel:', id)
            ttq.load(id);
        })

        ttq.page();
    })(window, document, 'ttq');
}

// Helper to load Google Global Site Tag
const loadGooglePixel = (pixelIds: string[]) => {
    if (pixelIds.length === 0) return

        // Ensure dataLayer exists
        ; (window as any).dataLayer = (window as any).dataLayer || []
    function gtag(...args: any[]) {
        (window as any).dataLayer.push(args)
    }

    // Load script for the first ID if not already there (gtag.js can handle multiple configs)
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
        const script = document.createElement('script')
        script.src = `https://www.googletagmanager.com/gtag/js?id=${pixelIds[0]}`
        script.async = true
        document.head.appendChild(script)

            ; (gtag as any)('js', new Date())
    }

    // Config for all IDs
    pixelIds.forEach(id => {
        console.log('Initializing Google Pixel:', id)
            ; (gtag as any)('config', id)
    })
}

declare global {
    interface Window {
        fbq: any
        _fbq: any
    }
}

export function PixelTracker() {
    const searchParams = useSearchParams()
    const ref = searchParams.get('ref')
    // Use environment variable for API URL or default to localhost:3002
    const API_URL = process.env.NEXT_PUBLIC_AFFILIATE_API_URL || 'http://localhost:3002'

    useEffect(() => {
        if (ref) {
            // Find pixel config from Affiliate Portal API
            fetch(`${API_URL}/api/tracking/pixels?code=${ref}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        const { fbPixelIds, tiktokPixelIds, googlePixelIds } = data.data

                        if (fbPixelIds?.length) loadFbPixel(fbPixelIds)
                        if (tiktokPixelIds?.length) loadTikTokPixel(tiktokPixelIds)
                        if (googlePixelIds?.length) loadGooglePixel(googlePixelIds)
                    }
                })
                .catch(err => console.error('Pixel init failed:', err))
        }
    }, [ref, API_URL])

    return null
}
