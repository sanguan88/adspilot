"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Store, Trash2, Plus, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { authenticatedFetch } from "@/lib/api-client"
import { useConfirm } from "@/components/providers/confirmation-provider"

interface StoreData {
    idToko: string
    namaToko: string
    status: string
    createdAt: string
}

interface AvailableStore {
    idToko: string
    namaToko: string
    userId: string | null
    status: string
    isAssigned: boolean
    assignedUsername?: string
    assignedEmail?: string
}

interface StoresTabProps {
    stores: StoreData[]
    total: number
    loading: boolean
    userId: string
    onAssignStore: (idToko: string) => void
    onUnassignStore: (idToko: string, namaToko: string) => void
}

export function StoresTab({
    stores,
    total,
    loading,
    userId,
    onAssignStore,
    onUnassignStore,
}: StoresTabProps) {
    const [open, setOpen] = useState(false)
    const [selectedStoreId, setSelectedStoreId] = useState("")
    const [availableStores, setAvailableStores] = useState<AvailableStore[]>([])
    const [loadingStores, setLoadingStores] = useState(false)
    const confirm = useConfirm()

    const fetchAvailableStores = async () => {
        try {
            setLoadingStores(true)
            const response = await authenticatedFetch(
                `/api/stores/available?excludeUserId=${userId}`
            )
            const data = await response.json()

            if (data.success) {
                setAvailableStores(data.data)
            }
        } catch (error) {
            console.error("Error fetching available stores:", error)
        } finally {
            setLoadingStores(false)
        }
    }

    // Fetch available stores
    useEffect(() => {
        fetchAvailableStores()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const handleAssign = async () => {
        if (selectedStoreId) {
            const store = availableStores.find(s => s.idToko === selectedStoreId);

            if (store?.isAssigned && store.assignedUsername) {
                const confirmed = await confirm({
                    title: "Pindahkan Toko?",
                    description: `PERINGATAN: Toko "${store.namaToko}" sudah di-assign ke user "${store.assignedUsername}".\n\nApakah Anda yakin ingin memindahkan toko ini ke user ini?`,
                    confirmText: "Ya, Pindahkan",
                    cancelText: "Batal",
                });

                if (!confirmed) return;
            }

            executeAssign(selectedStoreId)
        }
    }

    const executeAssign = (id: string) => {
        onAssignStore(id)
        setSelectedStoreId("")
        setOpen(false)
        // Refresh available stores after assign
        setTimeout(() => fetchAvailableStores(), 500)
    }

    const selectedStore = availableStores.find(
        (store) => store.idToko === selectedStoreId
    )

    return (
        <div className="space-y-6">
            {/* Assign New Store Form */}
            <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl">
                <div className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Assign New Store
                </div>

                <div className="space-y-2">
                    <Label htmlFor="assign-store-id" className="text-sm font-semibold text-gray-700 ml-1">
                        Pilih Toko
                    </Label>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Popover open={open} onOpenChange={setOpen} modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between bg-white border-gray-200 h-10 px-4 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                        disabled={loading || loadingStores}
                                    >
                                        <span className="truncate">
                                            {selectedStore
                                                ? `${selectedStore.namaToko} (${selectedStore.idToko})`
                                                : "Pilih toko..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[500px] p-0"
                                    align="start"
                                    sideOffset={4}
                                    style={{ zIndex: 9999, pointerEvents: 'auto' }}
                                >
                                    <Command>
                                        <CommandInput placeholder="Cari toko..." />
                                        <CommandEmpty>
                                            {loadingStores ? (
                                                <div className="py-6 flex items-center justify-center gap-2 text-gray-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Loading stores...</span>
                                                </div>
                                            ) : (
                                                "Toko tidak ditemukan"
                                            )}
                                        </CommandEmpty>
                                        <CommandGroup
                                            className="max-h-[300px] overflow-y-auto"
                                            style={{ pointerEvents: 'auto' }}
                                        >
                                            {availableStores.map((store) => (
                                                <CommandItem
                                                    key={store.idToko}
                                                    value={`${store.namaToko} ${store.idToko}`}
                                                    onSelect={() => {
                                                        setSelectedStoreId(
                                                            selectedStoreId === store.idToko ? "" : store.idToko
                                                        )
                                                        setOpen(false)
                                                    }}
                                                    className="cursor-pointer py-3"
                                                    style={{ pointerEvents: 'auto' }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4 flex-shrink-0",
                                                            selectedStoreId === store.idToko
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold truncate text-gray-900">{store.namaToko}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            ID: {store.idToko}
                                                            {store.isAssigned && store.assignedUsername && (
                                                                <span className="text-orange-600 font-bold ml-1 px-1.5 py-0.5 bg-orange-50 rounded">
                                                                    • Assigned to: {store.assignedUsername}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            store.status === "active" ? "default" : "secondary"
                                                        }
                                                        className={cn(
                                                            "ml-2 flex-shrink-0",
                                                            store.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                                                        )}
                                                    >
                                                        {store.status}
                                                    </Badge>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            onClick={handleAssign}
                            disabled={loading || !selectedStoreId || loadingStores}
                            className="gap-2 h-10 px-6 font-semibold shadow-sm"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            Assign
                        </Button>
                    </div>

                    <p className="text-[11px] text-gray-400 italic ml-1">
                        Pilih toko yang akan di-assign ke user ini. Jika toko sudah di-assign ke user lain, Anda akan diminta konfirmasi.
                    </p>
                </div>
            </div>

            {/* Stores List */}
            <div className="flex flex-col flex-1">
                <div className="text-base font-semibold mb-4 flex items-center justify-between">
                    <span>Assigned Stores</span>
                    <Badge variant="outline" className="font-mono">
                        {total}
                    </Badge>
                </div>

                {loading && stores.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Fetching assigned stores...</p>
                    </div>
                ) : stores.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed space-y-3">
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <Store className="w-8 h-8 text-gray-300" />
                        </div>
                        <div className="text-center">
                            <div className="text-base font-medium text-gray-600">No Stores Assigned</div>
                            <p className="text-sm text-gray-400 max-w-[250px] mx-auto">
                                User ini belum memiliki toko yang di-assign. Pilih toko di atas untuk memulai.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {stores.map((store) => (
                            <div
                                key={store.idToko}
                                className="group border rounded-xl p-4 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 bg-white"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 leading-tight">
                                                    {store.namaToko}
                                                </div>
                                                <div className="text-xs font-mono text-gray-400 mt-0.5">
                                                    ID: {store.idToko}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <Badge
                                                variant={store.status === "active" ? "default" : "secondary"}
                                                className={cn(
                                                    "text-[10px] uppercase tracking-wider px-2 py-0",
                                                    store.status === "active" ? "bg-emerald-500 hover:bg-emerald-600" : ""
                                                )}
                                            >
                                                {store.status}
                                            </Badge>
                                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                                            <span className="text-[11px] text-gray-400 italic">
                                                Added {format(new Date(store.createdAt), "dd MMM yyyy")}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onUnassignStore(store.idToko, store.namaToko)}
                                        disabled={loading}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
