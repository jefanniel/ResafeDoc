import React from 'react';
import { LogIn, Trash2, FileText, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="w-full bg-gray-100 px-8 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="font-serif font-bold text-2xl tracking-tighter">IOH</span>
        </div>

        <div className="flex items-center gap-8 text-sm font-medium text-gray-700">
          <a href="#" className="hover:text-black transition-colors">Courses</a>
          <a href="#" className="hover:text-black transition-colors">Events</a>
          <a href="#" className="hover:text-black transition-colors">Testimonials</a>
          <a href="#" className="hover:text-black transition-colors">Articles</a>
          <a href="#" className="hover:text-black transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium text-gray-700">
          <a href="#" className="hover:text-black transition-colors">About</a>
          <a href="#" className="hover:text-black transition-colors">Contact</a>
          <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-800 transition-all">
            <LogIn size={16} />
            Student Login
          </button>
        </div>
      </nav>

      <main className="p-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm w-full max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg text-gray-900">Upload files</h2>
            <button className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-gray-50 mb-6">
            <div className="text-4xl mb-4 text-gray-400">☁</div>
            <h3 className="font-semibold text-gray-900">Choose a file or drag & drop it here.</h3>
            <p className="text-sm text-gray-400 mb-4">Klik untuk pilih foto (Maks. 2MB, JPG/PNG)</p>
            <button className="bg-white border border-gray-300 px-6 py-2 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors shadow-sm">
              Browse File
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <FileText className="text-red-500" size={24} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Tulisan Dokter</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>1KB of 128 KB</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 size={12} /> Completed
                  </span>
                </div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs font-bold text-gray-400">OR</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Import from URL Link</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-200">
              <span className="bg-gray-100 px-4 py-2.5 text-gray-500 border-r border-gray-300 text-sm">http://</span>
              <input type="text" placeholder="Paste file URL" className="flex-1 px-4 py-2.5 outline-none text-sm text-gray-900" />
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Disclaimer bahwa yang disampaikan adalah informasi umum, bukan pengganti resmi saran medis dari dokter atau ahli.
          </p>
        </div>
      </main>
    </div>
  );
}