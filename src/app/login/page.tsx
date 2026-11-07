"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Egg, User, Lock, Eye, EyeOff, ShieldCheck, Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.message || "Login gagal", "error");
        return;
      }
      toast(json.message || "Login berhasil!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast("Terjadi kesalahan koneksi", "error");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex">
      {/* Kiri: branding */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-10 lg:p-14 text-white relative overflow-hidden bg-gradient-to-br from-[#1b5e20] via-[#2e7d32] to-[#388e3c]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Egg className="w-7 h-7 text-egg" />
          </div>
          <div>
            <div className="font-bold text-xl">GEMATI</div>
            <div className="text-sm text-white/80">Kecamatan Pagerwojo</div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl lg:text-[2.75rem] font-bold leading-tight">
            Sistem Informasi Pendampingan Makan Telur{" "}
            <span className="text-egg">Cegah Stunting</span>
          </h1>
          <p className="mt-5 text-white/85 leading-relaxed">
            Memantau program pendampingan konsumsi telur untuk percepatan
            pencegahan stunting pada balita di Kecamatan Pagerwojo, Kabupaten
            Tulungagung.
          </p>
          <div className="mt-6 flex gap-6 text-sm">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-egg" /> Aman &amp; Terenkripsi
            </span>
            <span className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-egg" /> Peduli Balita
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          {[
            ["KAB", "Tulungagung"],
            ["BKKBN", "Kemendukbangga"],
            ["KEC", "Pagerwojo"],
          ].map(([a, b]) => (
            <div key={a} className="text-center">
              <div className="w-14 h-14 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">
                {a}
              </div>
              <div className="text-[11px] text-white/70 mt-1">{b}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanan: form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-darkbg">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Egg className="w-6 h-6 text-egg" />
            </div>
            <div className="font-bold text-heading dark:text-white">GEMATI</div>
          </div>

          <h2 className="text-2xl font-bold text-heading dark:text-white">
            Masuk ke Sistem
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Silakan masuk menggunakan akun yang terdaftar.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <div className="mt-1.5 relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-darkcard focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-darkcard focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-slate-600 dark:text-slate-300">Remember Me</span>
              </label>
              <button type="button" className="text-primary font-medium hover:underline">
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>


          <p className="text-center text-xs text-slate-400 mt-6">
            © 2025 Pemerintah Kabupaten Tulungagung · Kecamatan Pagerwojo
          </p>
        </div>
      </div>
    </div>
  );
}
