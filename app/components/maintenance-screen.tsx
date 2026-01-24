import { Wrench, Clock, AlertTriangle } from "lucide-react"

export function MaintenanceScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center animate-ping opacity-20">
                        <div className="h-24 w-24 bg-yellow-400 rounded-full"></div>
                    </div>
                    <div className="relative bg-yellow-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ring-8 ring-white shadow-sm">
                        <Wrench className="h-10 w-10 text-yellow-600" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Maintenance</h1>
                    <p className="text-slate-500 leading-relaxed">
                        Kami sedang melakukan pemeliharaan sistem terjadwal untuk meningkatkan performa dan layanan.
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-50 py-3 px-4 rounded-lg">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>Estimasi kembali: <strong>Segera</strong></span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Mohon coba lagi beberapa saat lagi</span>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                        AdsPilot Team
                    </p>
                </div>
            </div>
        </div>
    )
}
