# UI Implementation Plan - Addon Purchase (Revised)

**Date:** 15 Januari 2026  
**Approach:** Minimal & Clean - No Redundancy  
**Status:** Ready to Implement

---

## 🎯 Design Philosophy

**Prinsip:**
- ✅ Minimal UI changes
- ✅ No redundant information
- ✅ Leverage existing components
- ✅ Clear user flow

**Placement:**
- **Store Page:** Usage info + addon link di summary card
- **Subscription Page:** Addon link di accordion (already has limits info)

---

## 📋 Implementation Tasks

### Task 1: Update TOTAL TOKO Card (Store Page)

**File:** `app/app/accounts/page.tsx` atau component yang render TOTAL TOKO card

**Changes:**
```tsx
// Before
<Card>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">TOTAL TOKO</p>
      <p className="text-3xl font-bold">1</p>
    </div>
    <Users className="w-8 h-8 text-primary" />
  </div>
</Card>

// After
<Card>
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-gray-600">TOTAL TOKO</p>
      <p className="text-3xl font-bold">1 / 2</p>
      <p className="text-xs text-gray-500 mt-1">
        Paket: 3 Bulan
      </p>
      {canAddAccount ? (
        <p className="text-xs text-green-600 mt-1">
          ✓ Bisa tambah {limit - usage} toko lagi
        </p>
      ) : (
        <button 
          onClick={() => setShowAddonModal(true)}
          className="text-xs text-blue-600 hover:underline mt-1"
        >
          + Tambah Addon Toko
        </button>
      )}
    </div>
    <Users className="w-8 h-8 text-primary" />
  </div>
</Card>
```

---

### Task 2: Update ADD TOKO Button

**Changes:**
```tsx
// Disable button when limit reached
<Button 
  onClick={handleAddToko}
  disabled={!canAddAccount}
  title={!canAddAccount ? 'Limit tercapai. Klik "Tambah Addon Toko" untuk menambah limit' : ''}
  className="..."
>
  ADD TOKO
</Button>
```

---

### Task 3: Create Addon Purchase Modal

**File:** `app/components/addon-purchase-modal.tsx`

**Component:** Simple modal with 2 steps
1. Select quantity + show price
2. Payment instructions

---

### Task 4: Add Addon Link in Subscription Page

**File:** `app/components/subscription-page.tsx`

**Location:** Inside accordion "Penggunaan & Limitasi" (line 568-671)

**Changes:**
```tsx
// After Toko/Store usage display (around line 608)
{limitsData.usage.accounts >= limitsData.limits.maxAccounts * 0.9 && (
  <div className="mt-2 p-2 bg-blue-50 rounded">
    <p className="text-xs text-blue-800">
      Limit hampir tercapai. 
      <button 
        onClick={() => setShowAddonModal(true)}
        className="text-blue-600 hover:underline ml-1 font-medium"
      >
        Beli Addon Toko
      </button>
    </p>
  </div>
)}
```

---

## 🎨 Component: Addon Purchase Modal

**File:** `app/components/addon-purchase-modal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { authenticatedFetch } from '@/lib/api-client'
import { toast } from 'sonner'

interface AddonPurchaseModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddonPurchaseModal({ open, onClose, onSuccess }: AddonPurchaseModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [pricing, setPricing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'payment'>('select')
  const [paymentData, setPaymentData] = useState<any>(null)

  useEffect(() => {
    if (open && quantity) {
      fetchPricing(quantity)
    }
  }, [open, quantity])

  const fetchPricing = async (qty: number) => {
    try {
      const res = await authenticatedFetch(`/api/addons/calculate-price?quantity=${qty}`)
      const data = await res.json()
      if (data.success) {
        setPricing(data.data)
      }
    } catch (error) {
      console.error('Error fetching pricing:', error)
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch('/api/addons/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, addonType: 'extra_accounts' })
      })
      const data = await res.json()
      
      if (data.success) {
        setPaymentData(data.data)
        setStep('payment')
        toast.success('Transaksi berhasil dibuat!')
      } else {
        toast.error(data.error || 'Gagal membuat transaksi')
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleClose = () => {
    setStep('select')
    setPaymentData(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Beli Addon Toko Tambahan</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <RadioGroup value={quantity.toString()} onValueChange={(v) => setQuantity(parseInt(v))}>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="1" id="qty-1" />
                  <Label htmlFor="qty-1" className="flex-1 cursor-pointer">
                    <div className="font-medium">+1 Toko</div>
                    {pricing?.quantity === 1 && (
                      <div className="text-sm text-gray-600">{formatRupiah(pricing.total)}</div>
                    )}
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="3" id="qty-3" />
                  <Label htmlFor="qty-3" className="flex-1 cursor-pointer">
                    <div className="font-medium">+3 Toko</div>
                    {pricing?.quantity === 3 && (
                      <div className="text-sm text-gray-600">
                        {formatRupiah(pricing.total)}
                        <span className="text-green-600 ml-2">(Hemat 16%)</span>
                      </div>
                    )}
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="5" id="qty-5" />
                  <Label htmlFor="qty-5" className="flex-1 cursor-pointer">
                    <div className="font-medium">+5 Toko</div>
                    {pricing?.quantity === 5 && (
                      <div className="text-sm text-gray-600">
                        {formatRupiah(pricing.total)}
                        <span className="text-green-600 ml-2">(Hemat 19%)</span>
                      </div>
                    )}
                  </Label>
                </div>
              </RadioGroup>

              {pricing && (
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sisa Waktu Subscription:</span>
                    <span className="font-medium">{pricing.remainingDays} hari</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Berlaku Hingga:</span>
                    <span className="font-medium">{pricing.subscriptionEndDate}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold text-lg">{formatRupiah(pricing.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Batal
                </Button>
                <Button 
                  onClick={handlePurchase} 
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Beli Sekarang'
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>✅ Transaksi Berhasil Dibuat</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm font-medium mb-2">ID Transaksi:</p>
                <p className="text-xs font-mono bg-white p-2 rounded break-all">
                  {paymentData?.transactionId}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">📋 Instruksi Pembayaran:</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Bank:</span>
                    <span className="font-medium">{paymentData?.paymentInstructions.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No. Rekening:</span>
                    <span className="font-medium">{paymentData?.paymentInstructions.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atas Nama:</span>
                    <span className="font-medium">{paymentData?.paymentInstructions.accountName}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Jumlah:</span>
                    <span className="font-semibold text-lg">
                      {formatRupiah(paymentData?.paymentInstructions.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded">
                <p className="text-sm font-medium mb-1">⚠️ Penting:</p>
                <p className="text-xs">Sertakan berita transfer:</p>
                <p className="text-xs font-mono bg-white p-2 rounded mt-1 break-all">
                  {paymentData?.transactionId}
                </p>
              </div>

              <Button 
                onClick={() => {
                  if (onSuccess) onSuccess()
                  handleClose()
                }}
                className="w-full"
              >
                Mengerti
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 📝 Implementation Checklist

### Phase 1: Component Creation
- [ ] Create `app/components/addon-purchase-modal.tsx`
- [ ] Test modal standalone

### Phase 2: Store Page Integration
- [ ] Find TOTAL TOKO card component
- [ ] Add `/api/user/effective-limits` fetch
- [ ] Update card to show usage (1 / 2)
- [ ] Add "Tambah Addon Toko" link
- [ ] Disable ADD TOKO button when limit reached
- [ ] Add modal state management
- [ ] Test complete flow

### Phase 3: Subscription Page Integration
- [ ] Add addon link in accordion
- [ ] Add modal state management
- [ ] Test complete flow

### Phase 4: Testing
- [ ] Test with user at limit
- [ ] Test with user below limit
- [ ] Test purchase flow
- [ ] Test error cases
- [ ] Test on mobile

---

## 🎯 Success Criteria

- ✅ User can see usage info in TOTAL TOKO card
- ✅ User can click "Tambah Addon Toko" to open modal
- ✅ Modal shows correct pricing based on remaining days
- ✅ Purchase creates transaction successfully
- ✅ Payment instructions displayed clearly
- ✅ No redundant information between pages

---

**Status:** Ready to implement  
**Estimated Time:** 2-3 hours  
**Next:** Start with Task 1 - Find and update TOTAL TOKO card
